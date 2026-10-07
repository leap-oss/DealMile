import { test } from "node:test";
import assert from "node:assert/strict";
import { validAppUrl } from "../lib/app-url";
test("deployed callbacks reject development and malformed origins", () => {
  for (const url of [
    "http://dealmile.example",
    "https://localhost",
    "https://localhost.",
    "https://2130706433",
    "https://127.0.0.1",
    "https://[::1]",
    "https://app.localhost",
    "https://user:password@dealmile.example",
    "https://dealmile.example/projects",
    "https://dealmile.example?redirect=1",
  ])
    assert.equal(validAppUrl(url, true), false, url);
  assert(validAppUrl("https://dealmile.example", true));
  assert(validAppUrl("https://example-3000.app.github.dev", true));
  assert(validAppUrl("http://localhost:3000", false));
  assert.equal(validAppUrl("javascript:alert(1)", false), false);
});
