import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import type { Express, Request, Response } from "express";
import * as db from "../db.js";
import { getSessionCookieOptions } from "./cookies.js";
import { sdk } from "./sdk.js";
import { magicLinkService } from "./magicLink.js";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getBodyParam(req: Request, key: string): string | undefined {
  const value = req.body?.[key];
  return typeof value === "string" ? value : undefined;
}

export function registerAuthRoutes(app: Express) {
  /**
   * POST /api/auth/send-magic-link
   * Send a magic link to the provided email
   */
  app.post("/api/auth/send-magic-link", async (req: Request, res: Response) => {
    const email = getBodyParam(req, "email");
    const redirectUrl = getBodyParam(req, "redirect") || "/";

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    try {
      const result = await magicLinkService.sendMagicLink(email, redirectUrl);

      if (!result.success) {
        res.status(400).json({ error: result.error || "Failed to send magic link" });
        return;
      }

      res.json({ success: true, message: "Magic link sent to your email" });
    } catch (error) {
      console.error("[Auth] Send magic link failed", error);
      res.status(500).json({ error: "Failed to send magic link" });
    }
  });

  /**
   * GET /api/auth/verify
   * Verify magic link token and create session
   */
  app.get("/api/auth/verify", async (req: Request, res: Response) => {
    const token = getQueryParam(req, "token");
    const redirectUrl = getQueryParam(req, "redirect") || "/";

    if (!token) {
      res.status(400).json({ error: "Token is required" });
      return;
    }

    try {
      const verification = await magicLinkService.verifyToken(token);

      if (!verification) {
        res.status(400).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Invalid Link</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5;">
              <div style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 400px; text-align: center;">
                <h1 style="color: #e74c3c; margin-top: 0;">Invalid or Expired Link</h1>
                <p style="color: #666;">This magic link is invalid or has already been used. Please request a new one.</p>
                <a href="/" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #3498db; color: white; text-decoration: none; border-radius: 5px;">Return to Home</a>
              </div>
            </body>
          </html>
        `);
        return;
      }

      // Create or update user
      let user = await db.getUserByEmail(verification.email);

      if (!user) {
        await db.createUserWithEmail(verification.email);
        user = await db.getUserByEmail(verification.email);
      } else {
        await db.updateUserLastSignedIn(user.id);
      }

      if (!user) {
        res.status(500).json({ error: "Failed to create user session" });
        return;
      }

      // Create session token with userId instead of openId
      const sessionToken = await sdk.createSessionToken(user.id.toString(), {
        name: user.name || "",
        email: user.email || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, redirectUrl);
    } catch (error) {
      console.error("[Auth] Magic link verification failed", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  /**
   * POST /api/auth/logout
   * Clear session cookie
   */
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ success: true });
  });

  /**
   * Legacy OAuth callback - kept for backwards compatibility
   * Can be removed once all users are migrated to magic links
   */
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const user = await db.getUserByOpenId(userInfo.openId);
      if (!user) {
        res.status(500).json({ error: "Failed to create user" });
        return;
      }

      const sessionToken = await sdk.createSessionToken(user.id.toString(), {
        name: userInfo.name || "",
        email: userInfo.email || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
