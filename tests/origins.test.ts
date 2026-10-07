import { test } from "node:test";
import assert from "node:assert/strict";
import { trustedOrigins } from "../lib/origins";
const config = {
  appUrl: "http://localhost:3100",
  development: true,
  codespaceName: "test-space",
  forwardingDomain: "app.github.dev",
};
test("development accepts only configured local and exact Codespaces origins", () => {
  const origins = trustedOrigins(config);
  assert.deepEqual(origins, [
    "http://localhost:3100",
    "https://test-space-3100.app.github.dev",
  ]);
  assert(!origins.includes("https://other-space-3100.app.github.dev"));
  assert(!origins.includes("https://attacker.example"));
});
test("production does not add development proxy origins", () => {
  assert.deepEqual(
    trustedOrigins({
      ...config,
      appUrl: "https://dealmile.example",
      development: false,
    }),
    ["https://dealmile.example"],
  );
});
