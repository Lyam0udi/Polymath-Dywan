/**
 * Vercel AI SDK stream helpers for the Socratic mentor.
 * Used by POST /api/mentor and by mastery / reveal token detection.
 *
 * Contract:
 * - Never throw on empty or malformed chunks.
 * - Never log raw stream payloads or secrets.
 */

/** Tokens the mentor may emit once conceptual clarity (or reveal) is reached. */
export const MASTERED_TOKEN = "[MASTERED]" as const;
export const REVEALED_TOKEN = "[REVEALED]" as const;

export type MentorStreamToken = typeof MASTERED_TOKEN | typeof REVEALED_TOKEN;

/** Minimal surface of `streamText` needed to build a useChat-compatible response. */
export interface MentorStreamResult {
  toDataStreamResponse: (
    options?: ResponseInit & {
      getErrorMessage?: (error: unknown) => string;
    },
  ) => Response;
}

/** Data-stream text part prefix (`0:"…"`) from the AI SDK protocol. */
const DATA_STREAM_TEXT_PREFIX = "0:";

/** Lines that look like AI SDK data-stream parts (`0:`, `2:`, `d:`, …). */
const DATA_STREAM_PART_RE = /^[0-9a-z]:/;

/**
 * Decode a raw stream chunk into a UTF-8 string.
 * Empty / unknown shapes return "" — never throws.
 */
export function chunkToText(chunk: unknown): string {
  if (chunk == null) return "";

  if (typeof chunk === "string") return chunk;

  if (chunk instanceof Uint8Array) {
    try {
      return new TextDecoder().decode(chunk);
    } catch {
      return "";
    }
  }

  if (typeof ArrayBuffer !== "undefined" && chunk instanceof ArrayBuffer) {
    try {
      return new TextDecoder().decode(new Uint8Array(chunk));
    } catch {
      return "";
    }
  }

  if (typeof chunk === "object") {
    const record = chunk as Record<string, unknown>;
    if (typeof record.textDelta === "string") return record.textDelta;
    if (typeof record.text === "string") return record.text;
    if (typeof record.delta === "string") return record.delta;
  }

  return "";
}

/**
 * Parse a single Vercel AI data-stream protocol line.
 * Text parts (`0:<json-string>`) yield their payload; other / bad lines yield "".
 */
export function parseDataStreamLine(line: unknown): string {
  if (typeof line !== "string") return "";

  const trimmed = line.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith(DATA_STREAM_TEXT_PREFIX)) {
    try {
      const parsed: unknown = JSON.parse(trimmed.slice(DATA_STREAM_TEXT_PREFIX.length));
      return typeof parsed === "string" ? parsed : "";
    } catch {
      return "";
    }
  }

  // Plain text stream (not data-stream protocol) — return as-is when no type prefix.
  if (!DATA_STREAM_PART_RE.test(trimmed)) {
    return trimmed;
  }

  return "";
}

/**
 * Safely turn any streamed chunk into mentor-visible text.
 * Accepts data-stream lines, raw strings, Uint8Array, or text-delta objects.
 */
export function safeParseStreamChunk(chunk: unknown): string {
  if (chunk == null || chunk === "") return "";

  if (typeof chunk === "string") {
    const looksLikeDataStream =
      chunk.includes("\n") || DATA_STREAM_PART_RE.test(chunk.trim());

    if (looksLikeDataStream) {
      return chunk
        .split("\n")
        .map((line) => parseDataStreamLine(line))
        .join("");
    }

    return chunk;
  }

  return chunkToText(chunk);
}

/**
 * Scan accumulated mentor text for [MASTERED] / [REVEALED].
 * Prefer MASTERED when both appear.
 */
export function detectMentorStreamToken(
  text: string,
): MentorStreamToken | null {
  if (typeof text !== "string" || text.length === 0) return null;
  if (text.includes(MASTERED_TOKEN)) return MASTERED_TOKEN;
  if (text.includes(REVEALED_TOKEN)) return REVEALED_TOKEN;
  return null;
}

/**
 * Fold an async text / data stream into one string.
 * Bad chunks are skipped; stream failures return partial text instead of throwing.
 */
export async function accumulateTextStream(
  stream: AsyncIterable<string> | ReadableStream<string | Uint8Array>,
): Promise<string> {
  const parts: string[] = [];

  try {
    if (isAsyncIterable(stream)) {
      for await (const chunk of stream) {
        const text = safeParseStreamChunk(chunk);
        if (text) parts.push(text);
      }
      return parts.join("");
    }

    const reader = stream.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = safeParseStreamChunk(value);
        if (text) parts.push(text);
      }
    } finally {
      reader.releaseLock();
    }
  } catch {
    // Keep partial accumulation — never surface raw stream errors to callers.
  }

  return parts.join("");
}

/**
 * Map stream errors to a client-safe message.
 * Scrubs key-like substrings; does not console.log (secrets must not be logged).
 */
export function getSafeStreamErrorMessage(error: unknown): string {
  let message = "";

  if (typeof error === "string") {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    message = (error as { message: string }).message;
  }

  const scrubbed = scrubSecrets(message).trim();
  if (!scrubbed) return "Mentor stream failed.";
  return scrubbed.slice(0, 200);
}

/**
 * Build the data-stream Response consumed by `useChat` on the mentor panel.
 */
export function createMentorStreamResponse(
  result: MentorStreamResult,
  init?: ResponseInit,
): Response {
  return result.toDataStreamResponse({
    ...init,
    getErrorMessage: getSafeStreamErrorMessage,
  });
}

function isAsyncIterable(
  value: object,
): value is AsyncIterable<string> {
  return Symbol.asyncIterator in value;
}

/** Redact credential-shaped substrings from error text. Never logs. */
function scrubSecrets(input: string): string {
  if (!input) return "";

  return input
    .replace(/sk-[a-zA-Z0-9_-]+/g, "[REDACTED]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(
      /\b[A-Z0-9_]*(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD)[A-Z0-9_]*\s*[:=]\s*\S+/gi,
      "[REDACTED]",
    );
}
