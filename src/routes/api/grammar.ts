import { createFileRoute } from "@tanstack/react-router";
import type { AIModelType } from "@/config/ai";
import { generateAIJson } from "@/lib/ai/client";
import { AIRequestError, getErrorMessage } from "@/lib/ai/errors";
import { normalizeGrammarCheckResult } from "@/lib/ai/grammar";
import { GRAMMAR_CHECK_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { jsonContentResponse } from "@/lib/ai/json";

export const Route = createFileRoute("/api/grammar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const {
            apiKey,
            model,
            content,
            modelType,
            apiEndpoint,
            reasoningEffort,
            reasoningEnabled,
          } = body as {
            apiKey: string;
            model?: string;
            content: string;
            modelType: AIModelType;
            apiEndpoint?: string;
            reasoningEffort?: string;
            reasoningEnabled?: boolean;
          };

          if (!apiKey || !content || !modelType) {
            return Response.json(
              { error: { message: "Missing API key, content or model type" } },
              { status: 400 }
            );
          }

          const result = await generateAIJson(
            {
              provider: modelType,
              apiKey,
              model,
              apiEndpoint,
              reasoningEffort,
              reasoningEnabled,
              responseFormat: {
                type: "json_object",
              },
              temperature: 0,
              messages: [
                {
                  role: "system",
                  content: GRAMMAR_CHECK_SYSTEM_PROMPT,
                },
                {
                  role: "user",
                  content,
                },
              ],
            },
            normalizeGrammarCheckResult
          );

          return Response.json({
            choices: [
              {
                message: {
                  content: jsonContentResponse(result.data),
                },
              },
            ],
          });
        } catch (error) {
          console.error("Error in grammar check:", error);
          const status = error instanceof AIRequestError ? error.status : 500;

          return Response.json(
            {
              error: {
                message: getErrorMessage(error, "Failed to check grammar"),
                code: error instanceof AIRequestError ? error.code : undefined,
              },
            },
            { status }
          );
        }
      },
    },
  },
});
