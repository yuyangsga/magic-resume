export const parseJsonPayload = (content: string) => {
  const text = content.trim();

  try {
    return JSON.parse(text);
  } catch {}

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {}
  }

  const objectBlock = text.match(/\{[\s\S]*\}/);
  if (objectBlock?.[0]) {
    try {
      return JSON.parse(objectBlock[0]);
    } catch {}
  }

  throw new Error("Invalid AI JSON content");
};

export const extractOpenAIContent = (data: any) => {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "string"
          ? part
          : typeof part?.text === "string"
            ? part.text
            : ""
      )
      .join("");
  }

  if (typeof data?.output_text === "string") return data.output_text;
  if (typeof data?.response?.output_text === "string") {
    return data.response.output_text;
  }

  return "";
};

export const jsonContentResponse = (value: unknown) =>
  JSON.stringify(value);

