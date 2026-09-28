/**
 * Multi-provider language-model resolver for mentor / expand routes (server-only).
 * Supports OpenAI (`gpt-*`, `o*`) and Google Gemini (`gemini-*`).
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV1 } from "@ai-sdk/provider";
import { APP_CONFIG } from "@/app.config";
import {
  GOOGLE_MODEL_OPTIONS,
  resolveProviderForModel,
  type AiProviderId,
} from "@/lib/ai/models";

export type { AiProviderId, AiModelOption } from "@/lib/ai/models";
export {
  ALL_MODEL_OPTIONS,
  GOOGLE_MODEL_OPTIONS,
  OPENAI_MODEL_OPTIONS,
  resolveProviderForModel,
} from "@/lib/ai/models";

function readOpenAiKey(): string {
  return process.env.OPENAI_API_KEY?.trim() ?? "";
}

function readGoogleKey(): string {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    ""
  );
}

/**
 * Returns a human-readable 503 message when the required provider key is missing.
 * OpenAI-only or Google-only setups are both valid.
 */
export function missingProviderKeyError(modelId: string): string | null {
  const provider = resolveProviderForModel(
    modelId,
    process.env.AI_PROVIDER,
  );
  if (provider === "google") {
    if (readGoogleKey()) return null;
    return "GOOGLE_GENERATIVE_AI_API_KEY is not configured. Add it to .env.local (Google AI Studio key) or switch to an OpenAI model.";
  }
  if (readOpenAiKey()) return null;
  return "OPENAI_API_KEY is not configured. Add it to .env.local or switch to a Gemini model and set GOOGLE_GENERATIVE_AI_API_KEY.";
}

/** True when at least one provider key is present on the server. */
export function hasAnyProviderKey(): boolean {
  return Boolean(readOpenAiKey() || readGoogleKey());
}

/**
 * Build a Vercel AI SDK language model for the given model id.
 * Call `missingProviderKeyError` first for a friendly 503.
 */
export function resolveLanguageModel(modelId: string): LanguageModelV1 {
  const id =
    modelId.trim() ||
    APP_CONFIG.env.DEFAULT_MODEL ||
    GOOGLE_MODEL_OPTIONS[0].id;
  const provider = resolveProviderForModel(id, process.env.AI_PROVIDER);

  if (provider === "google") {
    const apiKey = readGoogleKey();
    if (!apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
    }
    const google = createGoogleGenerativeAI({ apiKey });
    return google(id);
  }

  const apiKey = readOpenAiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const openai = createOpenAI({ apiKey });
  return openai(id);
}
