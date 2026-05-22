import assert from "node:assert/strict";
import test from "node:test";

import { normalizeGrammarCheckResult } from "./grammar";

test("normalizes empty grammar errors", () => {
  assert.deepEqual(normalizeGrammarCheckResult({ errors: [] }), {
    errors: [],
  });
});

test("normalizes grammar errors from fenced JSON", () => {
  const result = normalizeGrammarCheckResult(`\`\`\`json
{
  "errors": [
    {
      "context": "我做为负责人推进项目。",
      "text": "做为",
      "suggestion": "作为",
      "reason": "错别字",
      "type": "spelling"
    }
  ]
}
\`\`\``);

  assert.deepEqual(result, {
    errors: [
      {
        context: "我做为负责人推进项目。",
        text: "做为",
        suggestion: "作为",
        reason: "错别字",
        type: "spelling",
      },
    ],
  });
});

test("rejects invalid grammar JSON payloads", () => {
  assert.throws(
    () => normalizeGrammarCheckResult("not json"),
    /Invalid AI JSON content/
  );
});

