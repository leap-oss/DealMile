type OriginConfig = {
  appUrl?: string;
  development: boolean;
  codespaceName?: string;
  forwardingDomain?: string;
};
/** Explicit configured origins only; never derive trust from request headers. */
export function trustedOrigins(config: OriginConfig): string[] {
  const appUrl =
    config.appUrl ?? (config.development ? "http://localhost:3000" : undefined);
  const origins = appUrl ? [new URL(appUrl).origin] : [];
  if (config.development && config.codespaceName && config.forwardingDomain) {
    const port = appUrl ? new URL(appUrl).port || "3000" : "3000";
    origins.push(
      `https://${config.codespaceName}-${port}.${config.forwardingDomain}`,
    );
  }
  return [...new Set(origins)];
}
