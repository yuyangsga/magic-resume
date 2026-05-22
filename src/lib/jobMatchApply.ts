import type {
  AIJobMatchSuggestion,
  CustomItem,
  Education,
  Experience,
  Project,
  ResumeData,
} from "@/types/resume";
import { sanitizeRichTextContent } from "@/lib/richText";

export interface ApplyJobMatchSuggestionResult {
  resume: ResumeData;
  applied: boolean;
}

const replaceText = (value: string | undefined, suggestion: AIJobMatchSuggestion) => {
  const source = value ?? "";

  if (!source.includes(suggestion.originalText)) {
    return { value: source, applied: false };
  }

  return {
    value: sanitizeRichTextContent(
      source.replace(suggestion.originalText, suggestion.suggestedText)
    ),
    applied: true,
  };
};

const replaceInBasicInfo = (
  resume: ResumeData,
  suggestion: AIJobMatchSuggestion
): ApplyJobMatchSuggestionResult => {
  const fields = [
    "title",
    "employementStatus",
    "location",
  ] as const;

  for (const field of fields) {
    const result = replaceText(resume.basic[field], suggestion);
    if (result.applied) {
      return {
        resume: {
          ...resume,
          basic: {
            ...resume.basic,
            [field]: result.value,
          },
        },
        applied: true,
      };
    }
  }

  for (const field of resume.basic.customFields ?? []) {
    const result = replaceText(field.value, suggestion);
    if (result.applied) {
      return {
        resume: {
          ...resume,
          basic: {
            ...resume.basic,
            customFields: resume.basic.customFields.map((item) =>
              item.id === field.id ? { ...item, value: result.value } : item
            ),
          },
        },
        applied: true,
      };
    }
  }

  return { resume, applied: false };
};

const replaceInCollection = <T extends { id: string }>(
  items: T[],
  suggestion: AIJobMatchSuggestion,
  fields: Array<keyof T>
) => {
  const candidates = suggestion.targetId
    ? items.filter((item) => item.id === suggestion.targetId)
    : items;

  for (const item of candidates) {
    for (const field of fields) {
      const value = item[field];
      if (typeof value !== "string") continue;

      const result = replaceText(value, suggestion);
      if (result.applied) {
        return {
          items: items.map((candidate) =>
            candidate.id === item.id
              ? { ...candidate, [field]: result.value }
              : candidate
          ),
          applied: true,
        };
      }
    }
  }

  return { items, applied: false };
};

const replaceInCustomData = (
  customData: ResumeData["customData"],
  suggestion: AIJobMatchSuggestion
) => {
  for (const [sectionId, items] of Object.entries(customData ?? {})) {
    const result = replaceInCollection<CustomItem>(items, suggestion, [
      "title",
      "subtitle",
      "dateRange",
      "description",
    ]);

    if (result.applied) {
      return {
        customData: {
          ...customData,
          [sectionId]: result.items,
        },
        applied: true,
      };
    }
  }

  return { customData, applied: false };
};

export const applyJobMatchSuggestion = (
  resume: ResumeData,
  suggestion: AIJobMatchSuggestion
): ApplyJobMatchSuggestionResult => {
  if (!suggestion.originalText || !suggestion.suggestedText) {
    return { resume, applied: false };
  }

  if (suggestion.sectionId === "skills") {
    const result = replaceText(resume.skillContent, suggestion);
    return result.applied
      ? { resume: { ...resume, skillContent: result.value }, applied: true }
      : { resume, applied: false };
  }

  if (suggestion.sectionId === "selfEvaluation") {
    const result = replaceText(resume.selfEvaluationContent, suggestion);
    return result.applied
      ? {
          resume: { ...resume, selfEvaluationContent: result.value },
          applied: true,
        }
      : { resume, applied: false };
  }

  if (suggestion.sectionId === "basic") {
    return replaceInBasicInfo(resume, suggestion);
  }

  if (suggestion.sectionId === "experience") {
    const result = replaceInCollection<Experience>(
      resume.experience,
      suggestion,
      ["company", "position", "date", "details"]
    );
    return result.applied
      ? { resume: { ...resume, experience: result.items }, applied: true }
      : { resume, applied: false };
  }

  if (suggestion.sectionId === "projects") {
    const result = replaceInCollection<Project>(resume.projects, suggestion, [
      "name",
      "role",
      "date",
      "description",
      "link",
      "linkLabel",
    ]);
    return result.applied
      ? { resume: { ...resume, projects: result.items }, applied: true }
      : { resume, applied: false };
  }

  if (suggestion.sectionId === "education") {
    const result = replaceInCollection<Education>(
      resume.education,
      suggestion,
      ["school", "major", "degree", "startDate", "endDate", "gpa", "description"]
    );
    return result.applied
      ? { resume: { ...resume, education: result.items }, applied: true }
      : { resume, applied: false };
  }

  const result = replaceInCustomData(resume.customData, suggestion);
  return result.applied
    ? { resume: { ...resume, customData: result.customData }, applied: true }
    : { resume, applied: false };
};
