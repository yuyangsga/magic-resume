const toText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) =>
        typeof item === "string" ? [toText(item)] : toStringArray(item)
      )
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter(Boolean);
  }

  return [];
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const normalizeListItems = <T>(
  value: unknown,
  mapper: (item: Record<string, unknown>) => T
) => (Array.isArray(value) ? value.map((item) => mapper(asRecord(item))) : []);

export const normalizeImportedResumeResult = (value: unknown) => {
  const result = asRecord(value);
  if (Object.keys(result).length === 0) {
    throw new Error("Invalid resume import result: expected object");
  }

  const basic = asRecord(result.basic);
  const normalized = {
    title: toText(result.title),
    basic: {
      name: toText(basic.name),
      title: toText(basic.title),
      email: toText(basic.email),
      phone: toText(basic.phone),
      location: toText(basic.location),
      employementStatus: toText(basic.employementStatus),
      birthDate: toText(basic.birthDate),
    },
    sectionOrder: toStringArray(result.sectionOrder),
    selfEvaluationTitle: toText(result.selfEvaluationTitle),
    selfEvaluation: toStringArray(
      result.selfEvaluation ?? result.selfEvaluationContent
    ),
    skillsSectionFound: result.skillsSectionFound === true,
    skills: toStringArray(result.skills ?? result.skillContent),
    education: normalizeListItems(result.education, (item) => ({
      school: toText(item.school),
      major: toText(item.major),
      degree: toText(item.degree),
      startDate: toText(item.startDate),
      endDate: toText(item.endDate),
      gpa: toText(item.gpa),
      description: toStringArray(item.description),
    })),
    experience: normalizeListItems(result.experience, (item) => ({
      company: toText(item.company),
      position: toText(item.position),
      date: toText(item.date),
      details: toStringArray(item.details ?? item.description),
    })),
    projects: normalizeListItems(result.projects, (item) => ({
      name: toText(item.name),
      role: toText(item.role),
      date: toText(item.date),
      description: toStringArray(item.description ?? item.details),
      link: toText(item.link),
      linkLabel: toText(
        item.linkLabel ??
          item.linkText ??
          item.displayText ??
          item.linkDisplayText
      ),
    })),
    certificates: toStringArray(result.certificates),
    customSections: normalizeListItems(result.customSections, (section) => ({
      title: toText(section.title),
      items: normalizeListItems(section.items, (item) => ({
        title: toText(item.title),
        subtitle: toText(item.subtitle),
        dateRange: toText(item.dateRange ?? item.date),
        description: toStringArray(item.description ?? item.details),
      })),
    })),
  };

  const hasRecognizableContent =
    normalized.basic.name ||
    normalized.basic.title ||
    normalized.selfEvaluation.length > 0 ||
    normalized.skills.length > 0 ||
    normalized.education.length > 0 ||
    normalized.experience.length > 0 ||
    normalized.projects.length > 0 ||
    normalized.certificates.length > 0 ||
    normalized.customSections.length > 0;

  if (!hasRecognizableContent) {
    throw new Error("Invalid resume import result: no recognizable resume data");
  }

  return normalized;
};

