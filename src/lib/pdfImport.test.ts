import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOpenAIPdfImportRequestBody,
  resolvePdfImportProvider,
} from "./pdfImport";

test("prefers the selected OpenAI model for PDF import when configured", () => {
  const provider = resolvePdfImportProvider({
    selectedModel: "openai",
    openaiApiKey: "sk-test",
    openaiModelId: "gpt-4o-mini",
    openaiApiEndpoint: "https://example.com/v1",
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
    systemInstruction: "system prompt",
    content: "extract this resume",
    images: [
      "data:image/png;base64,AAAA",
      "data:image/jpeg;base64,BBBB",
    ],
  });

  assert.deepEqual(body.response_format, { type: "json_object" });
  assert.equal(body.model, "gpt-4o-mini");

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
