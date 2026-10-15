import "server-only";
import { validAppUrl } from "./app-url";

/** Public metadata uses the configured origin, never a guessed production domain. */
export function publicSiteOrigin(): URL | undefined {
  const value = process.env.APP_URL;
  return value && validAppUrl(value, process.env.NODE_ENV === "production")
    ? new URL(value)
    : undefined;
}
export const isDeploymentPreview = process.env.VERCEL_ENV === "preview";
