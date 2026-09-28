/**
 * Shared model catalog + provider inference (safe for client + server).
 * Do not import `@ai-sdk/*` here — SettingsModal uses this module.
 */

export type AiProviderId = "openai" | "google";

/** Catalog entry for Settings + docs. Labels are UI-only; `id` is the API model id. */
export interface AiModelOption {
  id: string;
  provider: AiProviderId;
  label: string;
}

/**
 * Free / low-cost Gemini Flash + Pro options (Google AI Studio).
 * IDs match the Gemini API model catalog as of 2026.
 */
export const GOOGLE_MODEL_OPTIONS: readonly AiModelOption[] = [
  {
    id: "gemini-3.5-flash",
    provider: "google",
    label: "gemini-3.5-flash (Try first / Free)",
  },
  {
    id: "gemini-3.5-flash-lite",
    provider: "google",
    label: "gemini-3.5-flash-lite (High-volume)",
  },
  {
    id: "gemini-3.6-flash",
    provider: "google",
    label: "gemini-3.6-flash (Fallback)",
  },
  {
    id: "gemini-3.7-flash",
    provider: "google",
    label: "gemini-3.7-flash (Fallback)",
  },
  {
    id: "gemini-3-flash-preview",
    provider: "google",
    label: "gemini-3-flash-preview (Fast/Reliable)",
  },
  {
    id: "gemini-3.8-flash",
    provider: "google",
    label: "gemini-3.8-flash (Current Flash)",
  },
  {
    id: "gemini-3.1-pro-preview",
    provider: "google",
    label: "gemini-3.1-pro-preview (Smart/Architectural)",
  },
] as const;

export const OPENAI_MODEL_OPTIONS: readonly AiModelOption[] = [
  { id: "gpt-4o-mini", provider: "openai", label: "gpt-4o-mini" },
  { id: "gpt-4o", provider: "openai", label: "gpt-4o" },
  { id: "gpt-4.1-mini", provider: "openai", label: "gpt-4.1-mini" },
  { id: "gpt-4.1", provider: "openai", label: "gpt-4.1" },
  { id: "o4-mini", provider: "openai", label: "o4-mini" },
] as const;

export const ALL_MODEL_OPTIONS: readonly AiModelOption[] = [
  ...GOOGLE_MODEL_OPTIONS,
  ...OPENAI_MODEL_OPTIONS,
];

/**
 * Infer provider from model id (gemini-* → google; otherwise openai).
 * Optional `forcedProvider` mirrors `AI_PROVIDER` on the server.
 */
export function resolveProviderForModel(
  modelId: string,
  forcedProvider?: string | null,
): AiProviderId {
  const id = modelId.trim().toLowerCase();
  if (id.startsWith("gemini-") || id.startsWith("models/gemini-")) {
    return "google";
  }
  const forced = forcedProvider?.trim().toLowerCase();
  if (forced === "google" || forced === "openai") {
    return forced;
  }
  return "openai";
}
