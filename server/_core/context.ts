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
  // For serverless, we can't use the SDK authentication directly
  // TODO: Implement cookie/header parsing for auth
  return {
    req,
    res: null,
    user: null,
    isServerless: true,
  };
}
