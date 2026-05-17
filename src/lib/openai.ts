import {
  isOpenAIReasoningEffort,
  type OpenAIReasoningEffort,
} from "@/config/ai";

type ChatCompletionsBody = Record<string, unknown>;

export const normalizeOpenAIReasoningEffort = (
  value: unknown
): OpenAIReasoningEffort | null =>
  isOpenAIReasoningEffort(value) ? value : null;

export const addOpenAIReasoningEffort = <TBody extends ChatCompletionsBody>(
  body: TBody,
  reasoningEffort: unknown
): TBody & { reasoning_effort: OpenAIReasoningEffort } => {
  const normalized = normalizeOpenAIReasoningEffort(reasoningEffort);

  if (!normalized) {
    throw new Error("Missing or invalid OpenAI reasoning effort");
  }

  return {
    ...body,
    reasoning_effort: normalized,
  };
};
