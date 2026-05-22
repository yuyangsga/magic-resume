import { createFileRoute } from "@tanstack/react-router";
import { generateAIJson } from "@/lib/ai/client";
import { AIRequestError, getErrorMessage } from "@/lib/ai/errors";
import { normalizeImportedResumeResult } from "@/lib/ai/resumeImport";
import {
  buildResumeImportSystemInstruction,
  DEFAULT_RESUME_IMPORT_PROMPT,
} from "@/lib/ai/prompts";
import {
  buildGeminiPdfImportInput,
  getPdfImportModel,
  normalizePdfImages,
  type PdfImportProvider,
} from "@/lib/pdfImport";

const buildOpenAIPdfImportContent = (content: string, images: string[]) => {
  const imageParts = normalizePdfImages(images).map((image) => ({
    type: "image_url" as const,
    image_url: {
      url: image.dataUrl,
      detail: "high" as const,
    },
  }));

  return [
    {
      type: "text" as const,
      text: content || DEFAULT_RESUME_IMPORT_PROMPT,
    },
    ...imageParts,
  ];
};

export const Route = createFileRoute("/api/resume-import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const {
            provider,
            apiKey,
            model,
            content,
            images,
            locale,
            apiEndpoint,
            reasoningEffort,
            reasoningEnabled,
          } = body as {
            provider: PdfImportProvider;
            apiKey: string;
            model?: string;
            content?: string;
            images?: string[];
            locale?: string;
            apiEndpoint?: string;
            reasoningEffort?: string;
            reasoningEnabled?: boolean;
          };

          const pdfImages = Array.isArray(images) ? images : [];

          if (!provider || !apiKey || (!content && pdfImages.length === 0)) {
            return Response.json(
              { error: "Missing provider, API key or resume content/images" },
              { status: 400 }
            );
          }

          if (provider !== "openai" && provider !== "gemini") {
            return Response.json(
              { error: "Unsupported PDF import provider" },
              { status: 400 }
            );
          }

          if (!model) {
            return Response.json(
              { error: "Missing PDF import model" },
              { status: 400 }
            );
          }

          if (provider === "openai" && !apiEndpoint) {
            return Response.json(
              { error: "Missing OpenAI API endpoint" },
              { status: 400 }
            );
          }

          const language = locale === "en" ? "English" : "Chinese";
          const prompt = content || DEFAULT_RESUME_IMPORT_PROMPT;
          const systemInstruction = buildResumeImportSystemInstruction(language);
          const result = await generateAIJson(
            {
              provider,
              apiKey,
              model: getPdfImportModel(provider, {
                openaiModelId: model,
                geminiModelId: model,
              }),
              apiEndpoint,
              reasoningEffort,
              reasoningEnabled,
              responseFormat: {
                type: "json_object",
              },
              temperature: 0.2,
              messages: [
                {
                  role: "system",
                  content: systemInstruction,
                },
                {
                  role: "user",
                  content:
                    provider === "openai"
                      ? buildOpenAIPdfImportContent(prompt, pdfImages)
                      : prompt,
                },
              ],
              geminiInput:
                provider === "gemini"
                  ? buildGeminiPdfImportInput({
                      content: prompt,
                      images: pdfImages,
                    })
                  : undefined,
            },
            normalizeImportedResumeResult
          );

          return Response.json({ resume: result.data });
        } catch (error) {
          console.error("Error in resume import:", error);
          const status = error instanceof AIRequestError ? error.status : 500;

          return Response.json(
            {
              error: getErrorMessage(error, "PDF import failed"),
              details: error instanceof AIRequestError ? error.code : undefined,
            },
            { status }
          );
        }
      },
    },
  },
});
