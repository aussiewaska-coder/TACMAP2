export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  if (!oauthPortalUrl) {
    console.error("[Auth] VITE_OAUTH_PORTAL_URL is missing. Please check your .env file.");
    return "/auth/error?reason=missing_config";
  }

  try {
    const redirectUri = typeof window !== "undefined"
      ? `${window.location.origin}/api/oauth/callback`
      : "";
    const state = btoa(redirectUri);

    const url = new URL("/app-auth", oauthPortalUrl);
    if (appId) url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");

    return url.toString();
  } catch (error) {
    console.error("[Auth] Failed to construct login URL:", error);
    return "/auth/error?reason=invalid_url";
  }
};
