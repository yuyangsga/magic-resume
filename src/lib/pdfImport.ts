import type { AIModelType } from "@/config/ai";

export type PdfImportProvider = "gemini" | "openai";

export interface PdfImportConfig {
  selectedModel: AIModelType;
  openaiApiKey?: string;
  openaiModelId?: string;
  openaiApiEndpoint?: string;
  geminiApiKey?: string;
  geminiModelId?: string;
}

export const resolvePdfImportProvider = (
  config: PdfImportConfig
): PdfImportProvider | null => {
  if (
    config.selectedModel === "openai" &&
    config.openaiApiKey &&
    config.openaiModelId &&
    config.openaiApiEndpoint
  ) {
    return "openai";
  }

  if (config.geminiApiKey && config.geminiModelId) {
    return "gemini";
  }

  if (
    config.openaiApiKey &&
    config.openaiModelId &&
    config.openaiApiEndpoint
  ) {
    return "openai";
  }

  return null;
};

export const getPdfImportModel = (
  provider: PdfImportProvider,
  config: Partial<PdfImportConfig>
) => {
  if (provider === "openai") {
    return config.openaiModelId || "gpt-4o-mini";
  }

  return config.geminiModelId || "gemini-flash-latest";
};

const extractBase64Payload = (value: string) => {
  const matched = value.match(/^data:(.*?);base64,(.*)$/);
  if (matched) {
    return {
      mimeType: matched[1] || "image/jpeg",
      data: matched[2] || "",
    };
  }

  return {
    mimeType: "image/jpeg",
    data: value,
  };
};

export const normalizePdfImages = (images?: string[]) =>
  Array.isArray(images)
    ? images.map((image) => {
        const payload = extractBase64Payload(image);
        return {
          mimeType: payload.mimeType,
          data: payload.data,
          dataUrl: image.startsWith("data:") ? image : `data:${payload.mimeType};base64,${payload.data}`,
        };
      })
    : [];

export const buildOpenAIPdfImportRequestBody = (params: {
  model: string;
  systemInstruction: string;
  content: string;
  images: string[];
}) => {
  const imageParts = normalizePdfImages(params.images).map((image) => ({
    type: "image_url" as const,
    image_url: {
      url: image.dataUrl,
      detail: "high" as const,
    },
  }));

  return {
    model: params.model,
    response_format: {
      type: "json_object" as const,
    },
    messages: [
      {
        role: "system" as const,
        content: params.systemInstruction,
      },
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text:
              params.content ||
              "Please identify the information in the resume pages below and output strictly according to the JSON structure.",
          },
          ...imageParts,
        ],
      },
    ],
  };
};

export const buildGeminiPdfImportInput = (params: {
  content: string;
  images: string[];
}) => {
  const imageParts = normalizePdfImages(params.images).map((image) => ({
    inlineData: {
      mimeType: image.mimeType,
      data: image.data,
    },
  }));

  return [
    {
      text:
        params.content ||
        "Please identify the information in the resume pages below and output strictly according to the JSON structure.",
    },
    ...imageParts,
  ];
};
