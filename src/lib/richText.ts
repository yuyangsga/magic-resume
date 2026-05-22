const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i;
const EMPTY_PARAGRAPH_REGEX = /<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi;
const HTML_BREAK_REGEX = /<br\s*\/?>/gi;
const HTML_ANY_TAG_REGEX = /<\/?[^>]+>/g;
const INVISIBLE_WHITESPACE_REGEX = /[\s\u200B-\u200D\uFEFF]/g;
const TRAILING_LIST_PARAGRAPH_REGEX =
  /(<\/(?:ul|ol)>)\s*<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>\s*$/i;
const RICH_TEXT_ANCHOR_REGEX = /<a\b([^>]*)>/gi;
const CLASS_ATTRIBUTE_REGEX = /\bclass\s*=\s*("([^"]*)"|'([^']*)')/i;
const CLASS_ATTRIBUTE_GLOBAL_REGEX = /\bclass\s*=\s*("([^"]*)"|'([^']*)')/gi;
const TAG_TOKEN_REGEX = /<!--[\s\S]*?-->|<\/?[^>]+>/g;
const HTML_TAG_TOKEN_REGEX = /^<\s*(\/?)\s*([a-z][\w:-]*)([\s\S]*?)\/?\s*>$/i;
const ATTRIBUTE_REGEX =
  /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const BLOCKED_CONTENT_TAG_REGEX =
  /<\s*(script|style|iframe|object|embed|svg|math|template|noscript)\b[\s\S]*?<\s*\/\s*\1\s*>/gi;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_REGEX =
  /^(?:www\.)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+(?:[/?#][^\s]*)?$/i;
const SAFE_LINK_PROTOCOL_REGEX = /^(https?:|mailto:|tel:)/i;
const ANY_PROTOCOL_REGEX = /^[a-z][a-z\d+\-.]*:/i;
const LEGACY_RICH_TEXT_CLASSES = new Set(["custom-list", "custom-list-ordered"]);
const ALLOWED_RICH_TEXT_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "em",
  "h1",
  "h2",
  "h3",
  "i",
  "li",
  "mark",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "u",
  "ul",
]);
const VOID_RICH_TEXT_TAGS = new Set(["br"]);
const ALLOWED_RICH_TEXT_CLASSES = new Set(["rich-text-link"]);
const SAFE_CLASS_NAME_REGEX = /^[a-z0-9_-]+$/i;
const SAFE_HEX_COLOR_REGEX = /^#[0-9a-f]{3,8}$/i;
const SAFE_COLOR_FUNCTION_REGEX =
  /^(?:rgb|rgba|hsl|hsla)\(\s*[\d.]+%?(?:\s*,\s*[\d.]+%?){2,3}\s*\)$/i;
const SAFE_COLOR_KEYWORD_REGEX = /^[a-z]+$/i;
const SAFE_TEXT_ALIGN_REGEX = /^(left|right|center|justify|start|end)$/i;

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const escapeHtmlAttribute = (text: string) =>
  escapeHtml(text).replace(/"/g, "&quot;");

const decorateRichTextAnchors = (content: string) =>
  content.replace(RICH_TEXT_ANCHOR_REGEX, (match, attrs: string) => {
    if (CLASS_ATTRIBUTE_REGEX.test(attrs)) {
      return match.replace(CLASS_ATTRIBUTE_REGEX, (_classMatch, quotedValue, doubleQuoted, singleQuoted) => {
        const currentValue = doubleQuoted ?? singleQuoted ?? quotedValue ?? "";
        const classes = currentValue.split(/\s+/).filter(Boolean);

        if (!classes.includes("rich-text-link")) {
          classes.push("rich-text-link");
        }

        return `class="${classes.join(" ")}"`;
      });
    }

    return `<a class="rich-text-link"${attrs}>`;
  });

export const stripLegacyRichTextClasses = (content?: string) => {
  if (!content) return "";

  return content.replace(
    CLASS_ATTRIBUTE_GLOBAL_REGEX,
    (_match, quotedValue, doubleQuoted, singleQuoted) => {
      const currentValue = doubleQuoted ?? singleQuoted ?? quotedValue ?? "";
      const classes = currentValue
        .split(/\s+/)
        .filter(Boolean)
        .filter((className: string) => !LEGACY_RICH_TEXT_CLASSES.has(className));

      return classes.length ? `class="${classes.join(" ")}"` : "";
    }
  );
};

export const stripTrailingListParagraph = (content?: string) => {
  if (!content) return "";

  let normalized = content;

  while (TRAILING_LIST_PARAGRAPH_REGEX.test(normalized)) {
    normalized = normalized.replace(TRAILING_LIST_PARAGRAPH_REGEX, "$1");
  }

  return normalized;
};

export const normalizeLinkHref = (href?: string) => {
  if (!href) return null;

  const value = href.trim();
  if (!value) return null;

  if (SAFE_LINK_PROTOCOL_REGEX.test(value)) {
    return value;
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  if (EMAIL_REGEX.test(value)) {
    return `mailto:${value}`;
  }

  if (DOMAIN_REGEX.test(value)) {
    return `https://${value}`;
  }

  if (ANY_PROTOCOL_REGEX.test(value)) {
    return null;
  }

  return null;
};

const getAttributeValue = (
  attrs: string,
  attributeName: string
): string | null => {
  ATTRIBUTE_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = ATTRIBUTE_REGEX.exec(attrs))) {
    if (match[1]?.toLowerCase() !== attributeName) continue;
    return match[2] ?? match[3] ?? match[4] ?? "";
  }

  return null;
};

const sanitizeClassAttribute = (classValue: string, tagName: string) => {
  const classes = classValue
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (className) =>
        SAFE_CLASS_NAME_REGEX.test(className) &&
        ALLOWED_RICH_TEXT_CLASSES.has(className)
    );

  if (tagName === "a" && !classes.includes("rich-text-link")) {
    classes.unshift("rich-text-link");
  }

  return classes.length > 0 ? classes.join(" ") : null;
};

const isSafeColorValue = (value: string) =>
  SAFE_HEX_COLOR_REGEX.test(value) ||
  SAFE_COLOR_FUNCTION_REGEX.test(value) ||
  SAFE_COLOR_KEYWORD_REGEX.test(value);

const sanitizeStyleAttribute = (styleValue: string) => {
  const declarations: string[] = [];

  styleValue.split(";").forEach((declaration) => {
    const separatorIndex = declaration.indexOf(":");
    if (separatorIndex === -1) return;

    const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
    const value = declaration.slice(separatorIndex + 1).trim();
    if (!value) return;

    if (
      (property === "color" || property === "background-color") &&
      isSafeColorValue(value)
    ) {
      declarations.push(`${property}: ${value}`);
      return;
    }

    if (property === "text-align" && SAFE_TEXT_ALIGN_REGEX.test(value)) {
      declarations.push(`${property}: ${value.toLowerCase()}`);
    }
  });

  return declarations.length > 0 ? declarations.join("; ") : null;
};

const sanitizeRichTextAttributes = (tagName: string, attrs: string) => {
  const safeAttrs: string[] = [];
  const classValue = getAttributeValue(attrs, "class");
  const safeClass = sanitizeClassAttribute(classValue ?? "", tagName);
  const styleValue = getAttributeValue(attrs, "style");
  const safeStyle = styleValue ? sanitizeStyleAttribute(styleValue) : null;

  if (safeClass) {
    safeAttrs.push(`class="${escapeHtmlAttribute(safeClass)}"`);
  }

  if (safeStyle) {
    safeAttrs.push(`style="${escapeHtmlAttribute(safeStyle)}"`);
  }

  if (tagName === "a") {
    const safeHref = normalizeLinkHref(getAttributeValue(attrs, "href") ?? undefined);
    const rawTarget = getAttributeValue(attrs, "target")?.trim().toLowerCase();

    if (safeHref) {
      safeAttrs.push(`href="${escapeHtmlAttribute(safeHref)}"`);

      if (rawTarget === "_blank") {
        safeAttrs.push('target="_blank"');
        safeAttrs.push('rel="noopener noreferrer"');
      } else if (rawTarget === "_self") {
        safeAttrs.push('target="_self"');
      }
    }
  }

  return safeAttrs.length > 0 ? ` ${safeAttrs.join(" ")}` : "";
};

const sanitizeRichTextTag = (tag: string) => {
  if (tag.startsWith("<!--") || /^<\s*!/i.test(tag)) {
    return "";
  }

  const match = tag.match(HTML_TAG_TOKEN_REGEX);
  if (!match) {
    return "";
  }

  const isClosing = Boolean(match[1]);
  const tagName = match[2].toLowerCase();
  const attrs = match[3] ?? "";

  if (!ALLOWED_RICH_TEXT_TAGS.has(tagName)) {
    return "";
  }

  if (VOID_RICH_TEXT_TAGS.has(tagName)) {
    return isClosing ? "" : `<${tagName} />`;
  }

  if (isClosing) {
    return `</${tagName}>`;
  }

  return `<${tagName}${sanitizeRichTextAttributes(tagName, attrs)}>`;
};

export const sanitizeRichTextContent = (content?: string) => {
  if (!content) return "";

  const withoutBlockedContent = content.replace(BLOCKED_CONTENT_TAG_REGEX, "");
  let sanitized = "";
  let lastIndex = 0;

  withoutBlockedContent.replace(TAG_TOKEN_REGEX, (tag, index) => {
    sanitized += withoutBlockedContent.slice(lastIndex, index);
    sanitized += sanitizeRichTextTag(tag);
    lastIndex = index + tag.length;
    return "";
  });

  return sanitized + withoutBlockedContent.slice(lastIndex);
};

/**
 * 规范化富文本内容，解决以下问题：
 * 1. 纯文本中的换行无法在 HTML 中展示；
 * 2. TipTap 产生的空 <p> 标签没有高度。
 */
export const normalizeRichTextContent = (content?: string) => {
  if (!content) return "";

  let normalized = content;

  if (!HTML_TAG_REGEX.test(content)) {
    normalized = escapeHtml(content).replace(/\r\n|\r|\n/g, "<br />");
  }

  const decorated = decorateRichTextAnchors(
    stripTrailingListParagraph(stripLegacyRichTextClasses(normalized))
  );

  return sanitizeRichTextContent(decorated).replace(
    EMPTY_PARAGRAPH_REGEX,
    "<p><br /></p>"
  );
};

export const hasMeaningfulRichTextContent = (content?: string) => {
  if (!content) return false;

  const sanitizedContent = sanitizeRichTextContent(content);

  if (!HTML_TAG_REGEX.test(sanitizedContent)) {
    return sanitizedContent.replace(INVISIBLE_WHITESPACE_REGEX, "").length > 0;
  }

  const plainText = sanitizedContent
    .replace(EMPTY_PARAGRAPH_REGEX, "")
    .replace(HTML_BREAK_REGEX, "")
    .replace(/&nbsp;/gi, " ")
    .replace(HTML_ANY_TAG_REGEX, "")
    .replace(INVISIBLE_WHITESPACE_REGEX, "");

  return plainText.length > 0;
};
