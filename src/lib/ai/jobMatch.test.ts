import assert from "node:assert/strict";
import test from "node:test";

import { normalizeJobMatchResult } from "./jobMatch";

test("normalizes valid job match JSON", () => {
  const result = normalizeJobMatchResult({
    score: 82,
    summary: "Strong frontend fit.",
    strengths: ["React experience"],
    gaps: ["Needs more cloud evidence"],
    keywords: [
      {
        keyword: "React",
        status: "matched",
        evidence: "Project section",
      },
    ],
    suggestions: [
      {
        id: "s1",
        sectionId: "projects",
        targetId: "project-1",
        originalText: "Built dashboard",
        suggestedText: "Built React dashboard",
        reason: "Aligns with JD keywords",
        impact: "high",
      },
    ],
  });

  assert.deepEqual(result, {
    score: 82,
    summary: "Strong frontend fit.",
    strengths: ["React experience"],
    gaps: ["Needs more cloud evidence"],
    keywords: [
      {
        keyword: "React",
        status: "matched",
        evidence: "Project section",
      },
    ],
    suggestions: [
      {
        id: "s1",
        sectionId: "projects",
        targetId: "project-1",
        originalText: "Built dashboard",
        suggestedText: "Built React dashboard",
        reason: "Aligns with JD keywords",
        impact: "high",
      },
    ],
  });
});

test("normalizes job match JSON from fenced markdown and clamps score", () => {
  const result = normalizeJobMatchResult(`\`\`\`json
{
  "score": 130,
  "summary": "Good fit",
  "keywords": [
    { "keyword": "TypeScript", "status": "unknown" }
  ],
  "suggestions": [
    {
      "sectionId": "skills",
      "originalText": "React",
      "suggestedText": "React, TypeScript",
      "impact": "unknown"
    }
  ]
}
\`\`\``);

  assert.equal(result.score, 100);
  assert.deepEqual(result.strengths, []);
  assert.deepEqual(result.gaps, []);
  assert.deepEqual(result.keywords, [
    {
      keyword: "TypeScript",
      status: "weak",
      evidence: undefined,
    },
  ]);
  assert.deepEqual(result.suggestions, [
    {
      id: "suggestion-1",
      sectionId: "skills",
      targetId: undefined,
      originalText: "React",
      suggestedText: "React, TypeScript",
      reason: "",
      impact: "medium",
    },
  ]);
});

test("drops invalid job match suggestions", () => {
  const result = normalizeJobMatchResult({
    score: -10,
    suggestions: [
      {
        sectionId: "unknown",
        originalText: "React",
        suggestedText: "Vue",
      },
      {
        sectionId: "skills",
        originalText: "",
        suggestedText: "React",
      },
    ],
  });

  assert.equal(result.score, 0);
  assert.deepEqual(result.suggestions, []);
});

test("rejects invalid job match JSON", () => {
  assert.throws(
    () => normalizeJobMatchResult("not json"),
    /Invalid AI JSON content/
  );
});
