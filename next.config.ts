import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { trustedOrigins } from "./lib/origins";
export default function config(phase: string): NextConfig {
  const origins = trustedOrigins({
    appUrl: process.env.APP_URL,
    development: phase === PHASE_DEVELOPMENT_SERVER,
    codespaceName: process.env.CODESPACE_NAME,
    forwardingDomain: process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN,
  });
  return {
    turbopack: { root: process.cwd() },
    allowedDevOrigins: origins.map((origin) => new URL(origin).hostname),
    experimental: {
      serverActions: {
        allowedOrigins: origins.map((origin) => new URL(origin).host),
      },
    },
  };
}
