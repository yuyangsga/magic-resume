import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOpenAIPdfImportRequestBody,
  resolvePdfImportProvider,
} from "./pdfImport";
import { AI_MODEL_CONFIGS } from "../config/ai";

test("prefers the selected OpenAI model for PDF import when configured", () => {
  const provider = resolvePdfImportProvider({
    selectedModel: "openai",
    openaiApiKey: "sk-test",
    openaiModelId: "gpt-4o-mini",
    openaiApiEndpoint: "https://example.com/v1",
    openaiReasoningEffort: "medium",
    geminiApiKey: "gemini-key",
    geminiModelId: "gemini-flash-latest",
  });

  assert.equal(provider, "openai");
});

test("prefers OpenAI for PDF import when reasoning is disabled", () => {
  const provider = resolvePdfImportProvider({
    selectedModel: "openai",
    openaiApiKey: "sk-test",
    openaiModelId: "gpt-4o-mini",
    openaiApiEndpoint: "https://example.com/v1",
    openaiReasoningEnabled: false,
    geminiApiKey: "gemini-key",
    geminiModelId: "gemini-flash-latest",
  });

  assert.equal(provider, "openai");
});

test("defaults to Gemini for non-vision selected models when Gemini is configured", () => {
  const provider = resolvePdfImportProvider({
    selectedModel: "deepseek",
    geminiApiKey: "gemini-key",
    geminiModelId: "gemini-flash-latest",
  });

  assert.equal(provider, "gemini");
});

test("builds OpenAI PDF import request body with image_url parts", () => {
  const body = buildOpenAIPdfImportRequestBody({
    model: "gpt-4o-mini",
    reasoningEffort: "medium",
    systemInstruction: "system prompt",
    content: "extract this resume",
    images: [
      "data:image/png;base64,AAAA",
      "data:image/jpeg;base64,BBBB",
    ],
  });
  const bodyWithReasoning = body as typeof body & {
    reasoning_effort: string;
  };

  assert.deepEqual(body.response_format, { type: "json_object" });
  assert.equal(body.model, "gpt-4o-mini");
  assert.equal(bodyWithReasoning.reasoning_effort, "medium");

  const userMessage = body.messages[1];
  assert.equal(userMessage.role, "user");
  assert.deepEqual(userMessage.content[0], {
    type: "text",
    text: "extract this resume",
  });
  assert.deepEqual(userMessage.content[1], {
    type: "image_url",
    image_url: { url: "data:image/png;base64,AAAA", detail: "high" },
  });
  assert.deepEqual(userMessage.content[2], {
    type: "image_url",
    image_url: { url: "data:image/jpeg;base64,BBBB", detail: "high" },
  });
});

test("can omit OpenAI reasoning effort for compatible PDF import APIs", () => {
  const body = buildOpenAIPdfImportRequestBody({
    model: "gpt-4o-mini",
    reasoningEnabled: false,
    systemInstruction: "system prompt",
    content: "extract this resume",
    images: [],
  });

  assert.equal("reasoning_effort" in body, false);
});

test("requires OpenAI reasoning effort before marking OpenAI as configured", () => {
  assert.equal(
    AI_MODEL_CONFIGS.openai.validate({
      openaiApiKey: "sk-test",
      openaiModelId: "gpt-4o-mini",
      openaiApiEndpoint: "https://example.com/v1",
      openaiReasoningEnabled: true,
    }),
    false
  );

  assert.equal(
    AI_MODEL_CONFIGS.openai.validate({
      openaiApiKey: "sk-test",
      openaiModelId: "gpt-4o-mini",
      openaiApiEndpoint: "https://example.com/v1",
      openaiReasoningEffort: "medium",
    }),
    true
  );

  assert.equal(
    AI_MODEL_CONFIGS.openai.validate({
      openaiApiKey: "sk-test",
      openaiModelId: "gpt-4o-mini",
      openaiApiEndpoint: "https://example.com/v1",
      openaiReasoningEnabled: false,
    }),
    true
  );
});

test("rejects invalid OpenAI reasoning effort when building PDF import body", () => {
  assert.throws(
    () =>
      buildOpenAIPdfImportRequestBody({
        model: "gpt-4o-mini",
        reasoningEffort: "",
        systemInstruction: "system prompt",
        content: "extract this resume",
        images: [],
      }),
    /Missing or invalid OpenAI reasoning effort/
  );

  assert.throws(
    () =>
      buildOpenAIPdfImportRequestBody({
        model: "gpt-4o-mini",
        reasoningEffort: "turbo",
        systemInstruction: "system prompt",
        content: "extract this resume",
        images: [],
      }),
    /Missing or invalid OpenAI reasoning effort/
  );
});
