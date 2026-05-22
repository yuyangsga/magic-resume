export interface AIUpstreamError {
  message: string;
  code?: string;
}

export class AIRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message);
    this.name = "AIRequestError";
    this.status = options?.status ?? 500;
    this.code = options?.code;
  }
}

export const parseUpstreamError = (
  raw: string,
  fallback: string
): AIUpstreamError => {
  if (!raw) return { message: fallback };

  try {
    const data = JSON.parse(raw) as {
      error?: { message?: string; code?: string };
      message?: string;
    };

    return {
      message: data.error?.message || data.message || fallback,
      code: data.error?.code,
    };
  } catch {
    return { message: raw };
  }
};

export const getErrorMessage = (
  error: unknown,
  fallback = "AI request failed"
) =>
  error instanceof Error && error.message
    ? error.message
    : fallback;

