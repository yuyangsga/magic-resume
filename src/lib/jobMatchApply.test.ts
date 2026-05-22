import assert from "node:assert/strict";
import test from "node:test";

import { applyJobMatchSuggestion } from "./jobMatchApply";
import type { ResumeData } from "@/types/resume";

const baseResume: ResumeData = {
  id: "resume-1",
  title: "Frontend Resume",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  templateId: "classic",
  basic: {
    birthDate: "",
    name: "Alex",
    title: "Frontend Engineer",
    email: "",
    phone: "",
    location: "",
    icons: {},
    employementStatus: "",
    photo: "",
    photoConfig: {
      width: 90,
      height: 120,
      aspectRatio: "1:1",
      borderRadius: "none",
      customBorderRadius: 0,
      visible: true,
    },
    customFields: [],
    githubKey: "",
    githubUseName: "",
    githubContributionsVisible: false,
  },
  education: [
    {
      id: "edu-1",
      school: "Example University",
      major: "Computer Science",
      degree: "Bachelor",
      startDate: "2018",
      endDate: "2022",
      description: "Studied web development",
    },
  ],
  experience: [
    {
      id: "exp-1",
      company: "Example Inc",
      position: "Frontend Engineer",
      date: "2022 - Now",
      details: "Built dashboards with React",
      visible: true,
    },
  ],
  projects: [
    {
      id: "project-1",
      name: "Admin Platform",
      role: "Owner",
      date: "2024",
      description: "Built admin UI",
      visible: true,
    },
  ],
  certificates: [],
  customData: {
    "custom-1": [
      {
        id: "custom-item-1",
        title: "Awards",
        subtitle: "",
        dateRange: "",
        description: "Hackathon winner",
        visible: true,
      },
    ],
  },
  skillContent: "React<br />CSS",
  selfEvaluationContent: "Frontend engineer",
  activeSection: "basic",
  draggingProjectId: null,
  menuSections: [],
  globalSettings: {},
};

test("applies suggestion to skill content", () => {
  const result = applyJobMatchSuggestion(baseResume, {
    id: "s1",
    sectionId: "skills",
    originalText: "React",
    suggestedText: "React, TypeScript",
    reason: "",
    impact: "high",
  });

  assert.equal(result.applied, true);
  assert.equal(result.resume.skillContent, "React, TypeScript<br />CSS");
});

test("applies suggestion to self evaluation content", () => {
  const result = applyJobMatchSuggestion(baseResume, {
    id: "s1",
    sectionId: "selfEvaluation",
    originalText: "Frontend engineer",
    suggestedText: "Frontend engineer focused on enterprise SaaS",
    reason: "",
    impact: "medium",
  });

  assert.equal(result.applied, true);
  assert.equal(
    result.resume.selfEvaluationContent,
    "Frontend engineer focused on enterprise SaaS"
  );
});

test("applies suggestion to target experience", () => {
  const result = applyJobMatchSuggestion(baseResume, {
    id: "s1",
    sectionId: "experience",
    targetId: "exp-1",
    originalText: "Built dashboards with React",
    suggestedText: "Built data dashboards with React and performance tracking",
    reason: "",
    impact: "high",
  });

  assert.equal(result.applied, true);
  assert.equal(
    result.resume.experience[0].details,
    "Built data dashboards with React and performance tracking"
  );
});

test("applies suggestion to custom section and sanitizes content", () => {
  const result = applyJobMatchSuggestion(baseResume, {
    id: "s1",
    sectionId: "custom",
    targetId: "custom-item-1",
    originalText: "Hackathon winner",
    suggestedText: 'Hackathon winner<script>alert("x")</script>',
    reason: "",
    impact: "low",
  });

  assert.equal(result.applied, true);
  assert.equal(
    result.resume.customData["custom-1"][0].description,
    "Hackathon winner"
  );
});

test("does not modify resume when original text is missing", () => {
  const result = applyJobMatchSuggestion(baseResume, {
    id: "s1",
    sectionId: "projects",
    originalText: "Missing text",
    suggestedText: "New text",
    reason: "",
    impact: "medium",
  });

  assert.equal(result.applied, false);
  assert.equal(result.resume, baseResume);
});
