import { parseJsonPayload } from "./json";

export interface NormalizedGrammarError {
  context: string;
  text: string;
  suggestion: string;
  reason: string;
  type: "spelling" | "grammar";
}

export interface NormalizedGrammarResult {
  errors: NormalizedGrammarError[];
}

const toText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeGrammarType = (value: unknown): "spelling" | "grammar" => {
  const raw = toText(value).toLowerCase();

  if (raw === "spelling") return "spelling";
  return "grammar";
};

export const normalizeGrammarCheckResult = (
  value: unknown
): NormalizedGrammarResult => {
  const payload =
    typeof value === "string" ? parseJsonPayload(value) : value;

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid grammar check result: expected object");
  }

  const errors = (payload as { errors?: unknown }).errors;
  if (!Array.isArray(errors)) {
    throw new Error("Invalid grammar check result: missing errors array");
  }

  return {
    errors: errors
      .map((item) => {
        const error = item as Record<string, unknown>;
        return {
          context: toText(error.context),
          text: toText(error.text),
          suggestion: toText(error.suggestion),
          reason: toText(error.reason),
          type: normalizeGrammarType(error.type),
        };
      })
      .filter((error) => error.text),
  };
};

