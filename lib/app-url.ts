/** A deployed callback must use a public HTTPS origin, never a developer loopback. */
export function validAppUrl(value: string, production: boolean): boolean {
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return false;
    if (url.pathname !== "/" || url.search || url.hash) return false;
    if (!production) return true;
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    return (
      url.protocol === "https:" &&
      host !== "localhost" &&
      !host.endsWith(".localhost") &&
      !/^127\./.test(host) &&
      !["0.0.0.0", "[::]", "[::1]"].includes(host)
    );
  } catch {
    return false;
  }
}
