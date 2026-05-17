export type AIModelType = "doubao" | "deepseek" | "openai" | "gemini";

export const OPENAI_REASONING_EFFORTS = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
] as const;

export type OpenAIReasoningEffort = typeof OPENAI_REASONING_EFFORTS[number];

export const isOpenAIReasoningEffort = (
  value: unknown
): value is OpenAIReasoningEffort =>
  typeof value === "string" &&
  (OPENAI_REASONING_EFFORTS as readonly string[]).includes(value);

export interface AIValidationContext {
  doubaoApiKey?: string;
  doubaoModelId?: string;
  deepseekApiKey?: string;
  deepseekModelId?: string;
  openaiApiKey?: string;
  openaiModelId?: string;
  openaiApiEndpoint?: string;
  openaiReasoningEffort?: string;
  geminiApiKey?: string;
  geminiModelId?: string;
}

export interface AIModelConfig {
  url: (endpoint?: string) => string;
  requiresModelId: boolean;
  defaultModel?: string;
  headers: (apiKey: string) => Record<string, string>;
  validate: (context: AIValidationContext) => boolean;
}

export const AI_MODEL_CONFIGS: Record<AIModelType, AIModelConfig> = {
  doubao: {
    url: () => "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    requiresModelId: true,
    headers: (apiKey: string) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }),
    validate: (context: AIValidationContext) => !!(context.doubaoApiKey && context.doubaoModelId),
  },
  deepseek: {
    url: () => "https://api.deepseek.com/v1/chat/completions",
    requiresModelId: false,
    defaultModel: "deepseek-chat",
    headers: (apiKey: string) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }),
    validate: (context: AIValidationContext) => !!context.deepseekApiKey,
  },
  openai: {
    url: (endpoint?: string) => `${(endpoint || "").trim().replace(/\/+$/, "")}/chat/completions`,
    requiresModelId: true,
    headers: (apiKey: string) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }),
    validate: (context: AIValidationContext) =>
      !!(
        context.openaiApiKey &&
        context.openaiModelId &&
        context.openaiApiEndpoint &&
        isOpenAIReasoningEffort(context.openaiReasoningEffort)
      ),
  },
  gemini: {
    url: () => "https://generativelanguage.googleapis.com/v1beta",
    requiresModelId: true,
    headers: (apiKey: string) => ({
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    }),
    validate: (context: AIValidationContext) => !!(context.geminiApiKey && context.geminiModelId),
  },
};
