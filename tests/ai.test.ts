import { test } from "node:test";
import assert from "node:assert/strict";
import { GeminiProvider, AIError } from "../lib/ai/gemini";
const plan = {
  summary: "An e-commerce website with a clear delivery plan",
  scope: ["Email authentication"],
  milestones: [
    {
      title: "Implementation",
      description: "Deliver the requested application",
      suggestedAmount: 1000,
      estimatedDays: 20,
    },
  ],
  risks: ["Confirm payment provider availability"],
};
const input = {
  name: "E-commerce website",
  type: "Website",
  requirements: "Build an e-commerce website with email authentication",
  budget: 1000,
  deadline: "2027-12-31",
};
function transport(result: unknown, finishReason = "STOP"): typeof fetch {
  return async () =>
    new Response(
      JSON.stringify({
        candidates: [
          {
            finishReason,
            content: {
              parts: [
                { thought: true, text: "private reasoning is discarded" },
                { text: JSON.stringify(result) },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
}
test("Gemini adapter validates structured output and discards thought parts", async () => {
  const provider = new GeminiProvider(
    "test-key",
    "test-model",
    transport(plan),
  );
  assert.deepEqual(await provider.generateProjectPlan(input), plan);
});
test("Gemini rejects invalid, incomplete, and failed responses", async () => {
  await assert.rejects(
    () =>
      new GeminiProvider(
        "key",
        "model",
        transport({ ...plan, milestones: [] }),
      ).generateProjectPlan(input),
    AIError,
  );
  await assert.rejects(
    () =>
      new GeminiProvider(
        "key",
        "model",
        transport(plan, "MAX_TOKENS"),
      ).generateProjectPlan(input),
    AIError,
  );
  await assert.rejects(
    () =>
      new GeminiProvider(
        "key",
        "model",
        async () => new Response("{}", { status: 429 }),
      ).generateProjectPlan(input),
    /rate-limited/,
  );
});
test("Gemini uses generateContent REST JSON fields, not SDK responseFormat fields", async () => {
  let called = false;
  const request: typeof fetch = async (url, init) => {
    called = true;
    assert.equal(
      String(url),
      "https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent",
    );
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("x-goog-api-key"), "test-key");
    assert.equal(headers.get("Content-Type"), "application/json");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.generationConfig.responseMimeType, "application/json");
    assert.equal(body.generationConfig.responseJsonSchema.type, "object");
    assert(!("responseFormat" in body.generationConfig));
    assert(!("$schema" in body.generationConfig.responseJsonSchema));
    assert(
      body.generationConfig.responseJsonSchema.required.includes("milestones"),
    );
    return transport(plan)(url, init);
  };
  await new GeminiProvider(
    "test-key",
    "test-model",
    request,
  ).generateProjectPlan(input);
  assert(called);
});
test("invalid JSON and provider transport errors never produce trusted plan state", async () => {
  const invalid: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        candidates: [
          { finishReason: "STOP", content: { parts: [{ text: "not JSON" }] } },
        ],
      }),
      { status: 200 },
    );
  await assert.rejects(
    () =>
      new GeminiProvider("key", "model", invalid).generateProjectPlan(input),
    AIError,
  );
  await assert.rejects(
    () =>
      new GeminiProvider("key", "model", async () => {
        throw new Error("Network unavailable");
      }).generateProjectPlan(input),
    AIError,
  );
});
test("Gemini retries transient 503 errors and does not retry invalid 400 requests", async () => {
  let transientCalls = 0;
  const transient: typeof fetch = async (...args) => {
    transientCalls++;
    return transientCalls < 3
      ? new Response("{}", { status: 503 })
      : transport(plan)(...args);
  };
  assert.deepEqual(
    await new GeminiProvider("key", "model", transient).generateProjectPlan(
      input,
    ),
    plan,
  );
  assert.equal(transientCalls, 3);
  let invalidCalls = 0;
  const invalid: typeof fetch = async () => {
    invalidCalls++;
    return new Response("{}", { status: 400 });
  };
  await assert.rejects(
    () =>
      new GeminiProvider("key", "model", invalid).generateProjectPlan(input),
    /HTTP 400/,
  );
  assert.equal(invalidCalls, 1);
});
