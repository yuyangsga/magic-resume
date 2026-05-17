import { createFileRoute } from "@tanstack/react-router";
import { AI_MODEL_CONFIGS } from "@/config/ai";
import {
  buildGeminiPdfImportInput,
  buildOpenAIPdfImportRequestBody,
  getPdfImportModel,
} from "@/lib/pdfImport";
import { getGeminiModelInstance } from "@/lib/server/gemini";
import type { PdfImportProvider } from "@/lib/pdfImport";

const parseJsonPayload = (content: string) => {
  const text = content.trim();
  try {
    return JSON.parse(text);
  } catch {}

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {}
  }

  const objectBlock = text.match(/\{[\s\S]*\}/);
  if (objectBlock?.[0]) {
    try {
      return JSON.parse(objectBlock[0]);
    } catch {}
  }

  return null;
};

const extractOpenAIContent = (data: any) => {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "string"
          ? part
          : typeof part?.text === "string"
            ? part.text
            : ""
      )
      .join("");
  }

  if (typeof data?.output_text === "string") return data.output_text;
  if (typeof data?.response?.output_text === "string") return data.response.output_text;
  return "";
};

const parseUpstreamError = (raw: string, fallback: string) => {
  if (!raw) return { message: fallback };

  try {
    const data = JSON.parse(raw) as {
      error?: { message?: string; code?: string };
      message?: string;
    };
    return {
      message: data.error?.message || data.message || fallback,
      code: data.error?.code,
    };
  } catch {
    return { message: raw };
  }
};

const buildSystemInstruction = (language: string) => `You are a professional resume import assistant. Based on the resume content provided by the user, extract the information and output only one valid JSON object.

Output constraints:
1. Only JSON is allowed. Do not output Markdown or explanations.
2. If a field is uncertain, use an empty string or empty array.
3. Please output content text in ${language}.
4. The description/details fields should be arrays of strings, each item as one readable sentence.
5. Preserve the original resume section boundaries and order as much as possible.
6. Do not invent, infer, summarize, or reorganize content into new sections.
7. Only fill "skills" when the source resume has an explicit skills section, such as "Skills", "Professional Skills", "技能", or "专业技能". If technical terms only appear inside work/project descriptions, set "skillsSectionFound" to false and keep "skills" empty.
8. Map sections such as "个人优势", "自我评价", "Profile", "Summary", or "Personal Advantages" into "selfEvaluation". Keep the source section title in "selfEvaluationTitle".
9. Put text-only certificates, awards, honors, publications, or other unsupported text sections into "customSections". Do not use the app's image certificate module for text certificates.
10. Keep experience and project bullets close to the source text. Do not compress them into short keyword lists.

JSON structure:
{
  "title": "Resume Title",
  "basic": {
    "name": "",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "employementStatus": "",
    "birthDate": ""
  },
  "sectionOrder": ["selfEvaluation", "skills", "experience", "projects", "education", "customSections"],
  "selfEvaluationTitle": "",
  "selfEvaluation": ["", ""],
  "skillsSectionFound": false,
  "skills": ["", ""],
  "education": [
    {
      "school": "",
      "major": "",
      "degree": "",
      "startDate": "",
      "endDate": "",
      "gpa": "",
      "description": ["", ""]
    }
  ],
  "experience": [
    {
      "company": "",
      "position": "",
      "date": "",
      "details": ["", ""]
    }
  ],
  "projects": [
    {
      "name": "",
      "role": "",
      "date": "",
      "description": ["", ""],
      "link": "",
      "linkLabel": ""
    }
  ],
  "certificates": ["", ""],
  "customSections": [
    {
      "title": "",
      "items": [
        {
          "title": "",
          "subtitle": "",
          "dateRange": "",
          "description": ["", ""]
        }
      ]
    }
  ]
}`;

const DEFAULT_IMPORT_PROMPT =
  "Please identify the information in the resume pages below and output strictly according to the JSON structure.";

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
          } = body as {
            provider: PdfImportProvider;
            apiKey: string;
            model?: string;
            content?: string;
            images?: string[];
            locale?: string;
            apiEndpoint?: string;
          };

          if (
            !provider ||
            !apiKey ||
            (!content && (!images || images.length === 0))
          ) {
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

          const language = locale === "en" ? "English" : "Chinese";
          const prompt = content || DEFAULT_IMPORT_PROMPT;
          const pdfImages = Array.isArray(images) ? images : [];
          const systemInstruction = buildSystemInstruction(language);

          if (provider === "openai") {
            if (!apiEndpoint || !model) {
              return Response.json(
                { error: "Missing OpenAI API endpoint or model" },
                { status: 400 }
              );
            }

            const modelConfig = AI_MODEL_CONFIGS.openai;
            const response = await fetch(modelConfig.url(apiEndpoint), {
              method: "POST",
              headers: modelConfig.headers(apiKey),
              body: JSON.stringify(
                buildOpenAIPdfImportRequestBody({
                  model: getPdfImportModel("openai", {
                    openaiModelId: model,
                  }),
                  systemInstruction,
                  content: prompt,
                  images: pdfImages,
                })
              ),
            });

            const raw = await response.text();
            if (!response.ok) {
              const parsedError = parseUpstreamError(
                raw,
                `OpenAI API error: ${response.status} ${response.statusText}`
              );
              return Response.json(
                {
                  error: parsedError.message,
                  details: parsedError.code,
                },
                { status: response.status }
              );
            }

            let data: any;
            try {
              data = raw ? JSON.parse(raw) : {};
            } catch {
              return Response.json(
                { error: "Invalid upstream response: expected JSON payload" },
                { status: 502 }
              );
            }

            const parsedResume = parseJsonPayload(extractOpenAIContent(data));
            if (!parsedResume) {
              return Response.json(
                { error: "Failed to parse AI JSON output" },
                { status: 500 }
              );
            }

            return Response.json({ resume: parsedResume });
          }

          if (!model) {
            return Response.json(
              { error: "Missing Gemini model" },
              { status: 400 }
            );
          }

          const modelInstance = getGeminiModelInstance({
            apiKey,
            model: getPdfImportModel("gemini", { geminiModelId: model }),
            systemInstruction,
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          });

          const result = await modelInstance.generateContent(
            buildGeminiPdfImportInput({
              content: prompt,
              images: pdfImages,
            })
          );
          const aiContent = result.response.text();

          if (!aiContent || typeof aiContent !== "string") {
            return Response.json(
              { error: "AI did not return structured content" },
              { status: 500 }
            );
          }

          const parsedResume = parseJsonPayload(aiContent);
          if (!parsedResume) {
            return Response.json(
              { error: "Failed to parse AI JSON output" },
              { status: 500 }
            );
          }

          return Response.json({ resume: parsedResume });
        } catch (error) {
          console.error("Error in resume import:", error);
          return Response.json(
            {
              error:
                error instanceof Error && error.message
                  ? error.message
                  : "PDF import failed",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
