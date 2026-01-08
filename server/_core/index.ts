import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "env.local", override: true });
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
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

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // WMS Proxy to bypass CORS for Government Data
  app.get("/api/wms-proxy", async (req, res) => {
    const { url, ...params } = req.query;
    if (!url || typeof url !== "string") {
      res.status(400).send("Missing url parameter");
      return;
    }

    try {
      // Reconstruct target URL with all standard WMS params (bbox, width, height, etc.)
      // We do NOT use URLSearchParams for 'params' directly in the axios call because
      // we want to control the exact string format if needed, but passing them as params is cleaner.
      const response = await fetch(`${url}?${new URLSearchParams(params as any).toString()}`);

      if (!response.ok) {
        throw new Error(`Upstream error: ${response.statusText}`);
      }

      // Forward Content-Type
      const contentType = response.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);

      // Stream the image back
      // Node 18+ global fetch returns a web stream, we need to convert to node stream for express response
      // or just use arrayBuffer. For images, arrayBuffer is fine/fast enough.
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
