import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeRichTextContent,
  sanitizeRichTextContent,
} from "./richText";

test("sanitizes rich text while preserving resume formatting tags", () => {
  const content =
    '<p>Summary</p><ul><li><strong>React</strong></li><li><em>TypeScript</em></li></ul>';

  assert.equal(
    sanitizeRichTextContent(content),
    "<p>Summary</p><ul><li><strong>React</strong></li><li><em>TypeScript</em></li></ul>"
  );
});

test("removes scripts, event attributes, and unsupported tags", () => {
  const content =
    '<p onclick="alert(1)">Hello<script>alert(1)</script><img src=x onerror="alert(2)" />World</p>';

  assert.equal(sanitizeRichTextContent(content), "<p>HelloWorld</p>");
});

test("drops dangerous link protocols and normalizes safe links", () => {
  assert.equal(
    sanitizeRichTextContent('<a href="javascript:alert(1)" target="_blank">bad</a>'),
    '<a class="rich-text-link">bad</a>'
  );
  assert.equal(
    sanitizeRichTextContent('<a href="example.com" target="_blank">site</a>'),
    '<a class="rich-text-link" href="https://example.com" target="_blank" rel="noopener noreferrer">site</a>'
  );
});

test("keeps safe style declarations and removes unsafe ones", () => {
  const content =
    '<span style="color: #ff0000; position: absolute; background-image: url(javascript:bad); text-align: center">Text</span>';

  assert.equal(
    sanitizeRichTextContent(content),
    '<span style="color: #ff0000; text-align: center">Text</span>'
  );
});

test("normalizes plain text and sanitizes generated html", () => {
  assert.equal(
    normalizeRichTextContent("Line 1\nLine 2"),
    "Line 1<br />Line 2"
  );
  assert.equal(
    normalizeRichTextContent("<p>Hello<script>alert(1)</script></p>"),
    "<p>Hello</p>"
  );
});
