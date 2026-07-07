import { ENV } from "./env";
import { logger } from "../logger";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

// Google AI Gemini model
const GEMINI_MODEL = "gemini-2.5-flash";
const GOOGLE_AI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

/**
 * Convert messages to OpenAI-compatible format for Google AI.
 * Google AI's OpenAI-compatible endpoint accepts the same format.
 */
function convertMessages(messages: Message[]): Array<{ role: string; content: string }> {
  const result: Array<{ role: string; content: string }> = [];

  for (const msg of messages) {
    const textContent = extractText(msg.content);
    if (msg.role === "system" || msg.role === "user" || msg.role === "assistant") {
      result.push({ role: msg.role, content: textContent });
    }
  }

  return result;
}

function extractText(content: MessageContent | MessageContent[]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) {
    if (content.type === "text") return content.text;
    return JSON.stringify(content);
  }
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part.type === "text") return part.text;
      return JSON.stringify(part);
    })
    .join("\n");
}

const LLM_TIMEOUT_MS = 30_000; // 30 second timeout
const LLM_MAX_RETRIES = 2; // retry up to 2 times on transient errors

/**
 * Invoke Google AI Gemini LLM via its OpenAI-compatible endpoint.
 * Returns result in OpenAI-compatible format (so existing callers don't need to change).
 * Includes timeout (30s) and retry logic (2 retries on 429/5xx).
 */
export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  console.log("[LLM] API key configured:", !!ENV.googleAiApiKey);
  if (!ENV.googleAiApiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not configured");
  }

  const maxTokens = params.maxTokens || params.max_tokens || 4096;
  const openaiMessages = convertMessages(params.messages);

  if (openaiMessages.length === 0) {
    openaiMessages.push({ role: "user", content: "(empty)" });
  }

  const body: Record<string, unknown> = {
    model: GEMINI_MODEL,
    max_tokens: maxTokens,
    messages: openaiMessages,
    temperature: 0.3, // Low temperature to follow instructions strictly and reduce hallucination
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= LLM_MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

      const response = await fetch(`${GOOGLE_AI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ENV.googleAiApiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        // Retry on rate limit (429) or server errors (5xx)
        if ((response.status === 429 || response.status >= 500) && attempt < LLM_MAX_RETRIES) {
          const backoff = (attempt + 1) * 1000;
          logger.warn("LLM", `Retrying (attempt ${attempt + 1}) after ${response.status}, backoff ${backoff}ms`);
          await new Promise(r => setTimeout(r, backoff));
          lastError = new Error(`Google AI API error (${response.status}): ${errorText}`);
          continue;
        }
        logger.error("LLM", `API error: ${response.status} ${errorText.substring(0, 500)}`);
        throw new Error(`Google AI API error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as InvokeResult;
      return data;
    } catch (err: any) {
      if (err.name === "AbortError") {
        lastError = new Error(`LLM request timed out after ${LLM_TIMEOUT_MS}ms`);
        if (attempt < LLM_MAX_RETRIES) {
          logger.warn("LLM", `Timeout, retrying (attempt ${attempt + 1})`);
          continue;
        }
      }
      // Don't retry non-transient errors
      if (err.message?.includes("not configured") || err.message?.includes("(4")) {
        throw err;
      }
      lastError = err;
      if (attempt < LLM_MAX_RETRIES) {
        const backoff = (attempt + 1) * 1000;
        logger.warn("LLM", `Error, retrying (attempt ${attempt + 1}), backoff ${backoff}ms: ${err.message}`);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
    }
  }

  throw lastError || new Error("LLM invocation failed after retries");
}

/**
 * Invoke Google AI Gemini LLM with streaming support.
 * Yields text tokens as they arrive from the API.
 * Includes same timeout and retry logic as invokeLLM.
 */
export async function* invokeLLMStream(
  params: InvokeParams
): AsyncGenerator<string, void, unknown> {
  console.log("[LLM Stream] API key configured:", !!ENV.googleAiApiKey);
  if (!ENV.googleAiApiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not configured");
  }

  const maxTokens = params.maxTokens || params.max_tokens || 4096;
  const openaiMessages = convertMessages(params.messages);

  if (openaiMessages.length === 0) {
    openaiMessages.push({ role: "user", content: "(empty)" });
  }

  const body: Record<string, unknown> = {
    model: GEMINI_MODEL,
    max_tokens: maxTokens,
    messages: openaiMessages,
    temperature: 0.3,
    stream: true, // Enable streaming
  };

  let lastError: Error | null = null;
  // Tracks whether any token has already been yielded to the caller (and
  // therefore already streamed to the customer's screen). Once true, we must
  // never retry — refetching and replaying the whole response would
  // duplicate the reply inside the customer's chat bubble.
  let hasYielded = false;

  for (let attempt = 0; attempt <= LLM_MAX_RETRIES; attempt++) {
    // Idle timer for this attempt. Intentionally NOT cleared right after
    // headers arrive — it keeps running into the body-read loop below, where
    // it is reset on every chunk. This turns it into a rolling "no bytes for
    // LLM_TIMEOUT_MS" idle timeout instead of a one-shot "response never
    // starts" timeout, so a stalled body can't hang the customer forever.
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

      const response = await fetch(`${GOOGLE_AI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ENV.googleAiApiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Retry on rate limit (429) or server errors (5xx)
        if (
          (response.status === 429 || response.status >= 500) &&
          attempt < LLM_MAX_RETRIES
        ) {
          clearTimeout(timeout);
          const backoff = (attempt + 1) * 1000;
          logger.warn(
            "LLM Stream",
            `Retrying (attempt ${attempt + 1}) after ${response.status}, backoff ${backoff}ms`
          );
          await new Promise((r) => setTimeout(r, backoff));
          lastError = new Error(
            `Google AI API error (${response.status}): ${errorText}`
          );
          continue;
        }
        clearTimeout(timeout);
        logger.error(
          "LLM Stream",
          `API error: ${response.status} ${errorText.substring(0, 500)}`
        );
        throw new Error(`Google AI API error (${response.status}): ${errorText}`);
      }

      // Process the streaming response
      if (!response.body) {
        clearTimeout(timeout);
        throw new Error("No response body for streaming");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();

          // Reset the idle timer: we just heard from the stream (a chunk
          // arrived, or it ended). A body that goes silent for
          // LLM_TIMEOUT_MS with no further bytes will now abort instead of
          // hanging the customer forever with no "done"/"error" ever sent.
          clearTimeout(timeout);
          if (done) break;
          timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === "data: [DONE]") continue;

            if (trimmedLine.startsWith("data: ")) {
              try {
                const json = JSON.parse(trimmedLine.slice(6));
                if (json.choices?.[0]?.finish_reason === "length") {
                  logger.warn("LLM Stream", "response truncated by max_tokens");
                }
                const chunk = json.choices?.[0]?.delta?.content;
                if (chunk) {
                  hasYielded = true;
                  yield chunk;
                }
              } catch (e) {
                // Skip malformed JSON
                logger.warn("LLM Stream", `Malformed SSE JSON: ${trimmedLine}`);
              }
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim() && buffer.trim() !== "data: [DONE]") {
          if (buffer.trim().startsWith("data: ")) {
            try {
              const json = JSON.parse(buffer.trim().slice(6));
              if (json.choices?.[0]?.finish_reason === "length") {
                logger.warn("LLM Stream", "response truncated by max_tokens");
              }
              const chunk = json.choices?.[0]?.delta?.content;
              if (chunk) {
                hasYielded = true;
                yield chunk;
              }
            } catch (e) {
              logger.warn("LLM Stream", `Malformed SSE JSON in buffer: ${buffer}`);
            }
          }
        }

        return; // Success
      } finally {
        clearTimeout(timeout);
        reader.releaseLock();
      }
    } catch (err: any) {
      clearTimeout(timeout);

      // Never retry once any token has already been streamed to the caller.
      // Refetching and replaying the whole response would duplicate the
      // reply inside the customer's chat bubble. Rethrow so the caller's
      // existing error handling (e.g. the SSE "error" event) can inform the
      // user instead.
      if (hasYielded) {
        logger.warn(
          "LLM Stream",
          `Stream failed after partial output, not retrying: ${err.message}`
        );
        throw err;
      }

      if (err.name === "AbortError") {
        lastError = new Error(`LLM request timed out after ${LLM_TIMEOUT_MS}ms`);
        if (attempt < LLM_MAX_RETRIES) {
          logger.warn("LLM Stream", `Timeout, retrying (attempt ${attempt + 1})`);
          continue;
        }
      }
      // Don't retry non-transient errors
      if (
        err.message?.includes("not configured") ||
        err.message?.includes("(4")
      ) {
        throw err;
      }
      lastError = err;
      if (attempt < LLM_MAX_RETRIES) {
        const backoff = (attempt + 1) * 1000;
        logger.warn(
          "LLM Stream",
          `Error, retrying (attempt ${attempt + 1}), backoff ${backoff}ms: ${err.message}`
        );
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
    }
  }

  throw lastError || new Error("LLM streaming failed after retries");
}
