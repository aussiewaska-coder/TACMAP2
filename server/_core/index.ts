import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "env.local", override: true });
import express from "express";
import { createServer } from "http";
import net from "net";
import { rateLimit } from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerAuthRoutes } from "./auth.js";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// Whitelist of allowed WMS hosts for SSRF protection
const ALLOWED_WMS_HOSTS = [
  'services.ga.gov.au',
  'portal.geoserver.sa.gov.au',
  'mapprod3.environment.nsw.gov.au',
  'data.gov.au',
  'maps.six.nsw.gov.au',
  'gis.drm.vic.gov.au',
  'localhost', // For development
];

async function startServer() {
  const app = express();
  const server = createServer(app);

  // SECURITY: Rate limiting to prevent DDoS and brute force attacks
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit auth requests to 5 per 15 minutes to prevent brute force
    message: "Too many login attempts, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiting to API routes
  app.use("/api/", apiLimiter);
  app.use("/api/auth/send-magic-link", authLimiter);

  // Configure body parser with reduced size limit for security (SECURITY FIX)
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // New magic link authentication routes
  registerAuthRoutes(app);

  // WMS Proxy to bypass CORS for Government Data (SSRF PROTECTION ADDED)
  app.get("/api/wms-proxy", async (req, res) => {
    const { url, ...params } = req.query;
    if (!url || typeof url !== "string") {
      res.status(400).send("Missing url parameter");
      return;
    }

    try {
      // SECURITY: Validate URL against whitelist (SSRF protection)
      const urlObj = new URL(url);
      const isAllowed = ALLOWED_WMS_HOSTS.some(host =>
        urlObj.hostname === host || urlObj.hostname.endsWith(`.${host}`)
      );

      if (!isAllowed) {
        console.warn(`[Security] Blocked WMS proxy request to unauthorized host: ${urlObj.hostname}`);
        res.status(403).send("Forbidden: Host not in whitelist");
        return;
      }

      // Reconstruct target URL with all standard WMS params (bbox, width, height, etc.)
      const response = await fetch(`${url}?${new URLSearchParams(params as any).toString()}`);

      if (!response.ok) {
        throw new Error(`Upstream error: ${response.statusText}`);
      }

      // Forward Content-Type
      const contentType = response.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);

      // Stream the image back
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));

    } catch (error) {
      console.error("WMS Proxy Error:", error);
      res.status(500).send("Proxy Error");
    }
  });

  // Emergency Services API routes (for local dev - in production these are Vercel serverless)
  app.get("/api/emergency/registry", async (req, res) => {
    try {
      const { default: handler } = await import("../../api/emergency/registry.js");
      await handler(req as any, res as any);
    } catch (error) {
      console.error("Registry API error:", error);
      res.status(500).json({ error: "Failed to load registry API" });
    }
  });

  app.get("/api/emergency/tracks", async (req, res) => {
    try {
      const { default: handler } = await import("../../api/emergency/tracks.js");
      await handler(req as any, res as any);
    } catch (error) {
      console.error("Tracks API error:", error);
      res.status(500).json({ error: "Failed to load tracks API" });
    }
  });

  app.get("/api/emergency/alerts", async (req, res) => {
    try {
      const { default: handler } = await import("../../api/emergency/alerts.js");
      await handler(req as any, res as any);
    } catch (error) {
      console.error("Alerts API error:", error);
      res.status(500).json({ error: "Failed to load alerts API" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3001");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
