import { generateUUID } from "@/utils/uuid";
import { initialResumeState } from "@/config/initialResumeData";
import { DEFAULT_TEMPLATES } from "@/components/templates/registry";
import { sanitizeRichTextContent } from "@/lib/richText";

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const toString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) =>
        typeof item === "string" ? [toString(item)] : toStringArray(item)
      )
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter(Boolean);
  }

  return [];
};

export const toListHtml = (value: unknown) => {
  const items = toStringArray(value);
  if (items.length === 0) return "";
  return sanitizeRichTextContent(`<ul>${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul>`);
};

export const toParagraphHtml = (value: unknown) => {
  const items = toStringArray(value);
  if (items.length === 0) return "";

  return sanitizeRichTextContent(
    items.map((item) => `<p>${escapeHtml(item)}</p>`).join("")
  );
};

const normalizeSectionId = (value: unknown) => {
  const id = toString(value);
  if (id === "customSections") return "custom";
  return id;
};

const uniqueById = <T extends { id: string }>(items: T[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

export const extractJsonContent = (content: string) => {
  const direct = content.trim();
  try {
    return JSON.parse(direct);
  } catch (error) { }

  const fencedMatch = direct.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1].trim());
    } catch (error) { }
  }

  const objectMatch = direct.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch (error) { }
  }

  throw new Error("Invalid AI JSON content");
};

export const createResumeFromAIResult = (
  result: any,
  fileName: string,
  locale = "zh"
) => {
  const now = new Date().toISOString();
  const id = generateUUID();

  const education = Array.isArray(result?.education) ? result.education : [];
  const experience = Array.isArray(result?.experience) ? result.experience : [];
  const projects = Array.isArray(result?.projects) ? result.projects : [];

  const skillSource = result?.skillContent ?? result?.skills;
  const skillsSectionFound =
    result?.skillsSectionFound === true ||
    typeof result?.skillContent === "string";
  const skillContent = skillsSectionFound ? toListHtml(skillSource) : "";
  const selfEvaluationSource =
    result?.selfEvaluation ??
    result?.selfEvaluationContent ??
    result?.summary ??
    result?.personalAdvantage ??
    result?.personalAdvantages;
  const selfEvaluationContent = toParagraphHtml(selfEvaluationSource);
  const customSections = Array.isArray(result?.customSections)
    ? result.customSections
    : [];
  const certificates = toStringArray(result?.certificates);
  const certificateTitle = locale === "en" ? "Certificates" : "资格证书";
  const customData: Record<string, any[]> = {};

  customSections.forEach((section: any, index: number) => {
    const sectionId = `custom-${index + 1}`;
    const items = Array.isArray(section?.items) ? section.items : [];
    customData[sectionId] = items
      .map((item: any) => ({
        id: generateUUID(),
        title: toString(item?.title),
        subtitle: toString(item?.subtitle),
        dateRange: toString(item?.dateRange ?? item?.date),
        description: toListHtml(item?.description || item?.details),
        visible: true,
      }))
      .filter(
        (item: {
          title: string;
          subtitle: string;
          dateRange: string;
          description: string;
        }) => item.title || item.subtitle || item.dateRange || item.description
      );
  });

  if (certificates.length > 0 && !customSections.length) {
    customData["custom-1"] = certificates.map((certificate: string) => ({
      id: generateUUID(),
      title: certificate,
      subtitle: "",
      dateRange: "",
      description: "",
      visible: true,
    }));
  }

  const baseMenuSections = initialResumeState.menuSections.map((section) => ({
    ...section,
  }));
  const basicSection = baseMenuSections.find((section) => section.id === "basic");
  const moduleSections = [
    selfEvaluationContent && {
      id: "selfEvaluation",
      title: toString(result?.selfEvaluationTitle) || (locale === "en" ? "Summary" : "个人优势"),
      icon: "💬",
      enabled: true,
    },
    skillContent && {
      id: "skills",
      title: locale === "en" ? "Skills" : "专业技能",
      icon: "⚡",
      enabled: true,
    },
    experience.length > 0 && {
      id: "experience",
      title: locale === "en" ? "Experience" : "工作经验",
      icon: "💼",
      enabled: true,
    },
    projects.length > 0 && {
      id: "projects",
      title: locale === "en" ? "Projects" : "项目经历",
      icon: "🚀",
      enabled: true,
    },
    education.length > 0 && {
      id: "education",
      title: locale === "en" ? "Education" : "教育经历",
      icon: "🎓",
      enabled: true,
    },
    ...Object.keys(customData).map((sectionId, index) => ({
      id: sectionId,
      title: toString(customSections[index]?.title) || certificateTitle,
      icon: "🏆",
      enabled: true,
    })),
  ].filter(Boolean) as Array<{
    id: string;
    title: string;
    icon: string;
    enabled: boolean;
  }>;

  const preferredOrder = Array.isArray(result?.sectionOrder)
    ? result.sectionOrder.map(normalizeSectionId).filter(Boolean)
    : [];
  const orderedModules =
    preferredOrder.length > 0
      ? [
          ...preferredOrder.flatMap((sectionId: string) => {
            if (sectionId === "custom") {
              return moduleSections.filter((section) =>
                section.id.startsWith("custom-")
              );
            }

            return moduleSections.filter((section) => section.id === sectionId);
          }),
          ...moduleSections.filter((section) => {
            const sectionKey = section.id.startsWith("custom-")
              ? "custom"
              : section.id;
            return !preferredOrder.includes(sectionKey);
          }),
        ]
      : moduleSections;

  const menuSections = uniqueById([
    basicSection || {
      id: "basic",
      title: locale === "en" ? "Profile" : "基本信息",
      icon: "👤",
      enabled: true,
    },
    ...orderedModules,
  ]).map((section, index) => ({
    ...section,
    order: index,
  }));

  return {
    ...initialResumeState,
    id,
    title: toString(result?.title) || fileName || `Imported Resume ${id.slice(0, 6)}`,
    createdAt: now,
    updatedAt: now,
    templateId: DEFAULT_TEMPLATES[0]?.id,
    basic: {
      ...initialResumeState.basic,
      name: toString(result?.basic?.name),
      title: toString(result?.basic?.title),
      email: toString(result?.basic?.email),
      phone: toString(result?.basic?.phone),
      location: toString(result?.basic?.location),
      employementStatus: toString(result?.basic?.employementStatus),
      birthDate: toString(result?.basic?.birthDate),
      customFields: [],
      photo: "",
      githubKey: "",
      githubUseName: "",
      githubContributionsVisible: false,
    },
    education: education
      .map((item: any) => ({
        id: generateUUID(),
        school: toString(item?.school),
        major: toString(item?.major),
        degree: toString(item?.degree),
        startDate: toString(item?.startDate),
        endDate: toString(item?.endDate),
        gpa: toString(item?.gpa),
        description: toListHtml(item?.description),
        visible: true,
      }))
      .filter((item: any) => item.school || item.major || item.degree),
    experience: experience
      .map((item: any) => ({
        id: generateUUID(),
        company: toString(item?.company),
        position: toString(item?.position),
        date: toString(item?.date),
        details: toListHtml(item?.details || item?.description),
        visible: true,
      }))
      .filter((item: any) => item.company || item.position || item.date || item.details),
    projects: projects
      .map((item: any) => ({
        id: generateUUID(),
        name: toString(item?.name),
        role: toString(item?.role),
        date: toString(item?.date),
        description: toListHtml(item?.description || item?.details),
        link: toString(item?.link),
        linkLabel: toString(
          item?.linkLabel ??
            item?.linkText ??
            item?.displayText ??
            item?.linkDisplayText
        ),
        visible: true,
      }))
      .filter((item: any) => item.name || item.role || item.date || item.description),
    skillContent,
    selfEvaluationContent,
    menuSections,
    customData,
  };
};
