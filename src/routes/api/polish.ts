import { createFileRoute } from "@tanstack/react-router";
import type { AIModelType } from "@/config/ai";
import { createAIStream } from "@/lib/ai/client";
import { AIRequestError, getErrorMessage } from "@/lib/ai/errors";
import { buildPolishSystemPrompt } from "@/lib/ai/prompts";

export const Route = createFileRoute("/api/polish")({
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
            customInstructions,
            reasoningEffort,
            reasoningEnabled,
          } = body as {
            apiKey: string;
            model?: string;
            content: string;
            modelType: AIModelType;
            apiEndpoint?: string;
            customInstructions?: string;
            reasoningEffort?: string;
            reasoningEnabled?: boolean;
          };

          if (!apiKey || !content || !modelType) {
            return Response.json(
              { error: { message: "Missing API key, content or model type" } },
              { status: 400 }
            );
          }

          const result = await createAIStream({
            provider: modelType,
            apiKey,
            model,
            apiEndpoint,
            reasoningEffort,
            reasoningEnabled,
            temperature: 0.4,
            messages: [
              {
                role: "system",
                content: buildPolishSystemPrompt(customInstructions),
              },
              {
                role: "user",
                content,
              },
            ],
          });

          return new Response(result.stream, {
            headers: {
              "Content-Type": result.contentType,
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          });
        } catch (error) {
          console.error("Polish error:", error);
          const status = error instanceof AIRequestError ? error.status : 500;

          return Response.json(
            {
              error: {
                message: getErrorMessage(error, "Failed to polish content"),
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
