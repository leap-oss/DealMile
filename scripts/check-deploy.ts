import { readFileSync } from "node:fs";
import { validAppUrl } from "../lib/app-url";

let failed = false;
function check(name: string, valid: boolean, recovery: string) {
  if (valid) console.log(`PASS ${name}`);
  else {
    failed = true;
    console.error(`FAIL ${name}: ${recovery}`);
  }
}
function isLocalHost(host: string) {
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "[::1]" ||
    host === "0.0.0.0" ||
    /^127\./.test(host)
  );
}
const nodeMajor = Number(process.versions.node.split(".")[0]);
check(
  "Node.js",
  nodeMajor === 22,
  "Use Node.js 22.x, matching package.json and .nvmrc.",
);
const origin = process.env.APP_URL ?? "";
check(
  "APP_URL",
  validAppUrl(origin, true),
  "Set the public HTTPS origin of this deployment, with no path, query, or localhost address.",
);
const secret = process.env.AUTH_SECRET ?? "";
check(
  "AUTH_SECRET",
  secret.length >= 32 &&
    !/^(replace-with-|change-me|your-secret)/i.test(secret),
  "Set a private random secret of at least 32 characters; do not use the example value.",
);
let databaseValid = false;
try {
  const database = new URL(process.env.DATABASE_URL ?? "");
  databaseValid =
    ["postgres:", "postgresql:"].includes(database.protocol) &&
    !!database.hostname &&
    !isLocalHost(database.hostname) &&
    database.pathname.length > 1;
} catch {
  /* Report the variable name, never the connection string. */
}
check(
  "DATABASE_URL",
  databaseValid,
  "Set the PostgreSQL URL reachable from the deployment host; keep preview and production databases separate.",
);
for (const name of [
  "GEMINI_API_KEY",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
] as const) {
  check(
    name,
    !!process.env[name]?.trim(),
    "Configure this server-only credential to support the advertised AI/Sandbox workflow.",
  );
}
const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
if (pkg.dependencies["@bryntum/calendar"]?.includes("trial")) {
  console.warn(
    "WARN Calendar uses a Bryntum trial package. Confirm its deployment terms or install the licensed package before publishing.",
  );
}
if (!process.env.PAYPAL_WEBHOOK_ID?.trim()) {
  console.warn(
    "WARN PayPal webhook reconciliation is not configured. Authenticated Sandbox capture verification remains available; the webhook endpoint will reject events.",
  );
}
console.log(
  "This checks configuration shape only. Database migrations, provider connectivity, hosting settings, and license permission require separate verification. No payments or database writes were performed.",
);
if (failed) process.exitCode = 1;
else
  console.log(
    "Deployment configuration checks passed. Review the warnings and DEPLOYMENT.md before publishing.",
  );
