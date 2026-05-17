import assert from "node:assert/strict";
import test from "node:test";

import { createResumeFromAIResult } from "./utils";

test("does not create a skills module when skills were inferred from other sections", () => {
  const resume = createResumeFromAIResult(
    {
      title: "余洋的Python开发简历",
      basic: {
        name: "余洋",
        title: "Python开发",
      },
      sectionOrder: ["selfEvaluation", "experience", "projects"],
      selfEvaluationTitle: "个人优势",
      selfEvaluation: [
        "工作积极认真，细心负责，善于发现问题、解决问题。",
      ],
      skillsSectionFound: false,
      skills: ["Python", "Django", "Docker"],
      experience: [
        {
          company: "深圳魔数智擎科技有限公司",
          position: "Python",
          date: "2025.06-至今",
          details: ["参与模型管理平台的新需求开发和BUG的修复"],
        },
      ],
    },
    "余洋简历",
    "zh"
  );

  assert.equal(resume.skillContent, "");
  assert.equal(
    resume.menuSections.some((section) => section.id === "skills"),
    false
  );
  assert.equal(resume.menuSections[1]?.id, "selfEvaluation");
  assert.match(resume.selfEvaluationContent, /工作积极认真/);
});
