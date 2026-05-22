import assert from "node:assert/strict";
import test from "node:test";

import { normalizeImportedResumeResult } from "./resumeImport";

test("normalizes imported resume sections", () => {
  const resume = normalizeImportedResumeResult({
    title: "Imported",
    basic: {
      name: "Ada",
      title: "Engineer",
      email: "ada@example.com",
    },
    sectionOrder: ["selfEvaluation", "customSections"],
    selfEvaluationTitle: "Summary",
    selfEvaluation: ["Builds reliable systems."],
    skillsSectionFound: true,
    skills: "TypeScript\nReact",
    certificates: ["AWS"],
    customSections: [
      {
        title: "Awards",
        items: [
          {
            title: "Hackathon",
            date: "2024",
            description: ["First place"],
          },
        ],
      },
    ],
  });

  assert.equal(resume.basic.name, "Ada");
  assert.deepEqual(resume.skills, ["TypeScript", "React"]);
  assert.deepEqual(resume.certificates, ["AWS"]);
  assert.equal(resume.customSections[0].items[0].dateRange, "2024");
});

test("rejects empty imported resume data", () => {
  assert.throws(
    () => normalizeImportedResumeResult({ title: "Empty" }),
    /no recognizable resume data/
  );
});

