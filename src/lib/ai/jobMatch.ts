import type {
  AIJobMatchKeyword,
  AIJobMatchKeywordStatus,
  AIJobMatchResult,
  AIJobMatchSectionId,
  AIJobMatchSuggestion,
  AIJobMatchSuggestionImpact,
} from "@/types/resume";
import { parseJsonPayload } from "./json";

const SECTION_IDS = new Set<AIJobMatchSectionId>([
  "basic",
  "selfEvaluation",
  "skills",
  "experience",
  "projects",
  "education",
  "custom",
]);

const KEYWORD_STATUSES = new Set<AIJobMatchKeywordStatus>([
  "matched",
  "missing",
  "weak",
]);

const IMPACTS = new Set<AIJobMatchSuggestionImpact>([
  "high",
  "medium",
  "low",
]);

const toText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const toTextArray = (value: unknown) =>
  Array.isArray(value)
    ? value.map(toText).filter(Boolean)
    : [];

const clampScore = (value: unknown) => {
  const score =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : 0;

  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
};

const normalizeKeywordStatus = (value: unknown): AIJobMatchKeywordStatus => {
  const status = toText(value).toLowerCase();
  return KEYWORD_STATUSES.has(status as AIJobMatchKeywordStatus)
    ? (status as AIJobMatchKeywordStatus)
    : "weak";
};

const normalizeImpact = (value: unknown): AIJobMatchSuggestionImpact => {
  const impact = toText(value).toLowerCase();
  return IMPACTS.has(impact as AIJobMatchSuggestionImpact)
    ? (impact as AIJobMatchSuggestionImpact)
    : "medium";
};

const normalizeSectionId = (value: unknown): AIJobMatchSectionId | null => {
  const sectionId = toText(value).toLowerCase();
  return SECTION_IDS.has(sectionId as AIJobMatchSectionId)
    ? (sectionId as AIJobMatchSectionId)
    : null;
};

const normalizeKeywords = (value: unknown): AIJobMatchKeyword[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const keyword = item as Record<string, unknown>;
      return {
        keyword: toText(keyword.keyword),
        status: normalizeKeywordStatus(keyword.status),
        evidence: toText(keyword.evidence) || undefined,
      };
    })
    .filter((keyword) => keyword.keyword);
};

const normalizeSuggestions = (value: unknown): AIJobMatchSuggestion[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      const suggestion = item as Record<string, unknown>;
      const sectionId = normalizeSectionId(suggestion.sectionId);

      if (!sectionId) return null;

      const originalText = toText(suggestion.originalText);
      const suggestedText = toText(suggestion.suggestedText);

      if (!originalText || !suggestedText) return null;

      return {
        id: toText(suggestion.id) || `suggestion-${index + 1}`,
        sectionId,
        targetId: toText(suggestion.targetId) || undefined,
        originalText,
        suggestedText,
        reason: toText(suggestion.reason),
        impact: normalizeImpact(suggestion.impact),
      };
    })
    .filter(Boolean) as AIJobMatchSuggestion[];
};

export const normalizeJobMatchResult = (
  value: unknown
): AIJobMatchResult => {
  const payload = typeof value === "string" ? parseJsonPayload(value) : value;

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid job match result: expected object");
  }

  const result = payload as Record<string, unknown>;

  return {
    score: clampScore(result.score),
    summary: toText(result.summary),
    strengths: toTextArray(result.strengths),
    gaps: toTextArray(result.gaps),
    keywords: normalizeKeywords(result.keywords),
    suggestions: normalizeSuggestions(result.suggestions),
  };
};
