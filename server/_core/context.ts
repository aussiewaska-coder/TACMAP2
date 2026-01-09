import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

// Generic request/response types for both Express and serverless
export type TrpcContext = {
  req: CreateExpressContextOptions["req"] | Request;
  res: CreateExpressContextOptions["res"] | null;
  isServerless?: boolean;
};

// Express context creator - no auth, visitors only
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  return {
    req: opts.req,
    res: opts.res,
    isServerless: false,
  };
}

// Vercel/serverless context creator - no auth, visitors only
export async function createServerlessContext(
  req: Request
): Promise<TrpcContext> {
  return {
    req,
    res: null,
    isServerless: true,
  };
}
