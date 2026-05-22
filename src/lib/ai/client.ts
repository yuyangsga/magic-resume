import { AI_MODEL_CONFIGS, type AIModelType } from "@/config/ai";
import { getGeminiModelInstance } from "@/lib/server/gemini";
import { maybeAddOpenAIReasoningEffort } from "@/lib/openai";
import { AIRequestError, parseUpstreamError } from "./errors";
import { extractOpenAIContent, parseJsonPayload } from "./json";

export type AIProvider = AIModelType;

export type AIMessageContent =
  | string
  | Array<Record<string, unknown>>;

export interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: AIMessageContent;
}

export interface AIChatRequest {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  apiEndpoint?: string;
  reasoningEffort?: string;
  reasoningEnabled?: boolean;
  messages: AIChatMessage[];
  responseFormat?: { type: "json_object" };
  stream?: boolean;
  temperature?: number;
  geminiInput?: unknown;
}

export interface AIStreamResult {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
}

export interface AIJsonResult<T> {
  data: T;
  content: string;
  raw: unknown;
}

const getModelName = (request: AIChatRequest) => {
  const modelConfig = AI_MODEL_CONFIGS[request.provider];
  if (!modelConfig) {
    throw new AIRequestError("Invalid model type", { status: 400 });
  }

  const model = modelConfig.requiresModelId
    ? request.model
    : modelConfig.defaultModel;

  if (!model) {
    throw new AIRequestError("Missing model", { status: 400 });
  }

  return model;
};

const getSystemInstruction = (messages: AIChatMessage[]) =>
  messages
    .filter((message) => message.role === "system")
    .map((message) =>
      typeof message.content === "string" ? message.content : ""
    )
    .filter(Boolean)
    .join("\n\n");

const getGeminiUserInput = (request: AIChatRequest) => {
  if (request.geminiInput) return request.geminiInput;

  return request.messages
    .filter((message) => message.role !== "system")
    .map((message) =>
      typeof message.content === "string" ? message.content : ""
    )
    .filter(Boolean)
    .join("\n\n");
};

export const buildOpenAICompatibleChatBody = (request: AIChatRequest) => {
  const body = {
    model: getModelName(request),
    ...(request.responseFormat
      ? { response_format: request.responseFormat }
      : {}),
    messages: request.messages,
    ...(request.stream ? { stream: true } : {}),
  };

  if (request.provider !== "openai") {
    return body;
  }

  return maybeAddOpenAIReasoningEffort(
    body,
    request.reasoningEffort,
    request.reasoningEnabled
  );
};

export const buildOpenAICompatibleChatUrl = (request: AIChatRequest) => {
  const modelConfig = AI_MODEL_CONFIGS[request.provider];
  if (!modelConfig) {
    throw new AIRequestError("Invalid model type", { status: 400 });
  }

  return modelConfig.url(request.apiEndpoint);
};

const fetchOpenAICompatibleChat = async (request: AIChatRequest) => {
  const modelConfig = AI_MODEL_CONFIGS[request.provider];
  if (!modelConfig) {
    throw new AIRequestError("Invalid model type", { status: 400 });
  }

  const response = await fetch(buildOpenAICompatibleChatUrl(request), {
    method: "POST",
    headers: modelConfig.headers(request.apiKey),
    body: JSON.stringify(buildOpenAICompatibleChatBody(request)),
  });

  if (!response.ok) {
    const fallbackMessage = `Upstream API error: ${response.status} ${response.statusText}`;
    const parsedError = parseUpstreamError(
      await response.text(),
      fallbackMessage
    );
    throw new AIRequestError(parsedError.message, {
      status: response.status,
      code: parsedError.code,
    });
  }

  return response;
};

const streamOpenAICompatibleResponse = (response: Response) => {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      if (!response.body) {
        controller.close();
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";

      const emitPayload = (payload: string) => {
        if (!payload || payload === "[DONE]") return;

        const data = JSON.parse(payload) as {
          error?: { message?: string };
          choices?: Array<{ delta?: { content?: string } }>;
        };

        if (data.error?.message) {
          throw new Error(data.error.message);
        }

        const content = data.choices?.[0]?.delta?.content;
        if (content) {
          controller.enqueue(encoder.encode(content));
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          pending += decoder.decode(value, { stream: true });
          const lines = pending.split(/\r?\n/);
          pending = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;

            try {
              emitPayload(trimmed.slice(5).trim());
            } catch (error) {
              if (error instanceof SyntaxError) {
                console.error("Error parsing stream payload:", error);
                continue;
              }

              throw error;
            }
          }
        }

        const tail = (pending + decoder.decode()).trim();
        if (tail.startsWith("data:")) {
          emitPayload(tail.slice(5).trim());
        }

        controller.close();
      } catch (error) {
        console.error("Stream reading error:", error);
        controller.error(error);
      }
    },
  });
};

export const createAIStream = async (
  request: AIChatRequest
): Promise<AIStreamResult> => {
  if (request.provider === "gemini") {
    const modelInstance = getGeminiModelInstance({
      apiKey: request.apiKey,
      model: getModelName(request),
      systemInstruction: getSystemInstruction(request.messages),
      generationConfig: {
        temperature: request.temperature ?? 0.4,
      },
    });
    const encoder = new TextEncoder();

    return {
      contentType: "text/event-stream",
      stream: new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            const result = await modelInstance.generateContentStream(
              getGeminiUserInput(request) as any
            );

            for await (const chunk of result.stream) {
              const chunkText = chunk.text();
              if (chunkText) {
                controller.enqueue(encoder.encode(chunkText));
              }
            }

            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      }),
    };
  }

  const response = await fetchOpenAICompatibleChat({
    ...request,
    stream: true,
  });

  return {
    contentType: "text/event-stream",
    stream: streamOpenAICompatibleResponse(response),
  };
};

export const generateAIJson = async <T>(
  request: AIChatRequest,
  normalize: (value: unknown) => T
): Promise<AIJsonResult<T>> => {
  if (request.provider === "gemini") {
    const modelInstance = getGeminiModelInstance({
      apiKey: request.apiKey,
      model: getModelName(request),
      systemInstruction: getSystemInstruction(request.messages),
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        responseMimeType: "application/json",
      },
    });

    const result = await modelInstance.generateContent(
      getGeminiUserInput(request) as any
    );
    const content = result.response.text() || "";
    const raw = parseJsonPayload(content);

    return {
      data: normalize(raw),
      content,
      raw,
    };
  }

  const response = await fetchOpenAICompatibleChat(request);
  const rawText = await response.text();
  let raw: unknown;

  try {
    raw = rawText ? JSON.parse(rawText) : {};
  } catch {
    throw new AIRequestError(
      "Invalid upstream response: expected JSON payload",
      { status: 502 }
    );
  }

  const content = extractOpenAIContent(raw);
  if (!content) {
    throw new AIRequestError("AI did not return structured content", {
      status: 500,
    });
  }

  const parsed = parseJsonPayload(content);

  return {
    data: normalize(parsed),
    content,
    raw,
  };
};
