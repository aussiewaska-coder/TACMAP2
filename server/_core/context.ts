import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema.js";
import { sdk } from "./sdk.js";

// Generic request/response types for both Express and serverless
export type TrpcContext = {
  req: CreateExpressContextOptions["req"] | Request;
  res: CreateExpressContextOptions["res"] | null;
  user: User | null;
  isServerless?: boolean;
};

// Express context creator
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    isServerless: false,
  };
}

// Vercel/serverless context creator
export async function createServerlessContext(
  req: Request
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Parse cookies from Request object
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const { parse } = await import('cookie');
      const cookies = parse(cookieHeader);
      const sessionCookie = cookies['manus-runtime-session'];

      if (sessionCookie) {
        // Verify the session
        const session = await sdk.verifySession(sessionCookie);

        if (session) {
          const { getUserById, getUserByOpenId } = await import('../db.js');

          // Try to get user by userId (new format)
          const userId = parseInt(session.userId, 10);
          if (!isNaN(userId)) {
            user = await getUserById(userId) || null;
          }

          // Fallback to openId for legacy tokens
          if (!user && session.openId) {
            user = await getUserByOpenId(session.openId) || null;
          }
        }
      }
    }
  } catch (error) {
    console.warn('[Serverless] Authentication failed:', error);
    // Authentication is optional for public procedures
    user = null;
  }

  return {
    req,
    res: null,
    user,
    isServerless: true,
  };
}
