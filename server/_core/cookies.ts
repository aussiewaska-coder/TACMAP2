import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname;
  const isProduction = process.env.NODE_ENV === "production";
  const isLocalHost = LOCAL_HOSTS.has(hostname) || hostname === "127.0.0.1" || hostname === "::1";

  // Enable domain setting for production (commented out domain logic preserved but improved)
  const shouldSetDomain =
    hostname &&
    !LOCAL_HOSTS.has(hostname) &&
    !isIpAddress(hostname);

  const domain = shouldSetDomain && !hostname.startsWith(".")
    ? `.${hostname}`
    : shouldSetDomain
      ? hostname
      : undefined;

  return {
    httpOnly: true,
    path: "/",
    // SECURITY FIX: Use "lax" instead of "none" to prevent CSRF
    // "lax" allows cookies on top-level navigations (like following links)
    // but not on cross-site requests, providing good security/usability balance
    sameSite: "lax",
    // SECURITY FIX: Force secure in production, allow http for localhost dev
    secure: isProduction ? true : isSecureRequest(req),
    // Use domain for production to work across subdomains if needed
    ...(domain && { domain }),
  };
}
