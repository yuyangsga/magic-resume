import assert from "node:assert/strict";
import test from "node:test";

import { buildOpenAICompatibleChatBody } from "./client";

test("builds OpenAI chat body with reasoning effort by default", () => {
  const body = buildOpenAICompatibleChatBody({
    provider: "openai",
    apiKey: "sk-test",
    model: "gpt-4o-mini",
    apiEndpoint: "https://example.com/v1",
    reasoningEffort: "medium",
    messages: [{ role: "user", content: "hello" }],
  });
  const bodyWithReasoning = body as typeof body & {
    reasoning_effort: string;
  };

  assert.equal(body.model, "gpt-4o-mini");
  assert.equal(bodyWithReasoning.reasoning_effort, "medium");
  assert.deepEqual(body.messages, [{ role: "user", content: "hello" }]);
});

test("omits OpenAI reasoning effort when compatible mode disables it", () => {
  const body = buildOpenAICompatibleChatBody({
    provider: "openai",
    apiKey: "sk-test",
    model: "gpt-4o-mini",
    apiEndpoint: "https://example.com/v1",
    reasoningEnabled: false,
    messages: [{ role: "user", content: "hello" }],
  });

  assert.equal(body.model, "gpt-4o-mini");
  assert.equal("reasoning_effort" in body, false);
});

test("uses provider default model for DeepSeek requests", () => {
  const body = buildOpenAICompatibleChatBody({
    provider: "deepseek",
    apiKey: "sk-test",
    messages: [{ role: "user", content: "hello" }],
  });

  assert.equal(body.model, "deepseek-chat");
  assert.equal("reasoning_effort" in body, false);
});
