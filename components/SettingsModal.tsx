"use client";

import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { APP_CONFIG } from "@/app.config";
import { ALL_MODEL_OPTIONS } from "@/lib/ai/models";

/** localStorage key for AI model / key preferences. */
export const SETTINGS_STORAGE_KEY = "polymath-dywan-settings" as const;

/** Runtime AI preferences persisted client-side. */
export interface AiSettings {
  /** Client-held OpenAI key hint for setup UX. Server still requires `.env.local`. */
  openaiApiKey: string;
  /** Client-held Google AI Studio key hint. Server needs `GOOGLE_GENERATIVE_AI_API_KEY`. */
  googleApiKey: string;
  defaultModel: string;
  expansionModel: string;
}

function defaultSettings(): AiSettings {
  return {
    openaiApiKey: "",
    googleApiKey: "",
    defaultModel: APP_CONFIG.env.DEFAULT_MODEL,
    expansionModel: APP_CONFIG.env.EXPANSION_MODEL,
  };
}

/** True when the user has configured at least one provider key in the browser. */
export function hasClientProviderKey(settings: AiSettings): boolean {
  return (
    settings.openaiApiKey.trim().length > 0 ||
    settings.googleApiKey.trim().length > 0
  );
}

/** Read settings from localStorage; corrupt/missing → APP_CONFIG defaults. */
export function loadAiSettings(): AiSettings {
  const fallback = defaultSettings();
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return {
      openaiApiKey:
        typeof parsed.openaiApiKey === "string" ? parsed.openaiApiKey : "",
      googleApiKey:
        typeof parsed.googleApiKey === "string" ? parsed.googleApiKey : "",
      defaultModel:
        typeof parsed.defaultModel === "string" && parsed.defaultModel.trim()
          ? parsed.defaultModel
          : fallback.defaultModel,
      expansionModel:
        typeof parsed.expansionModel === "string" &&
        parsed.expansionModel.trim()
          ? parsed.expansionModel
          : fallback.expansionModel,
    };
  } catch {
    return fallback;
  }
}

/** Persist settings to localStorage. */
export function saveAiSettings(settings: AiSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful save (settings already written to localStorage). */
  onSave?: (settings: AiSettings) => void;
}

/**
 * Settings modal — OpenAI + Google keys + DEFAULT_MODEL / EXPANSION_MODEL selects.
 * Preferences persist in localStorage (`SETTINGS_STORAGE_KEY`).
 * Live API keys for `/api/mentor` and `/api/expand` must also be set in `.env.local`.
 */
export function SettingsModal({ open, onClose, onSave }: SettingsModalProps) {
  const titleId = useId();
  const openaiKeyFieldId = useId();
  const googleKeyFieldId = useId();
  const defaultModelId = useId();
  const expansionModelId = useId();

  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [defaultModel, setDefaultModel] = useState(
    APP_CONFIG.env.DEFAULT_MODEL,
  );
  const [expansionModel, setExpansionModel] = useState(
    APP_CONFIG.env.EXPANSION_MODEL,
  );
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!open) return;
    const loaded = loadAiSettings();
    setOpenaiApiKey(loaded.openaiApiKey);
    setGoogleApiKey(loaded.googleApiKey);
    setDefaultModel(loaded.defaultModel);
    setExpansionModel(loaded.expansionModel);
    setSavedFlash(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const next: AiSettings = {
        openaiApiKey: openaiApiKey.trim(),
        googleApiKey: googleApiKey.trim(),
        defaultModel: defaultModel.trim() || APP_CONFIG.env.DEFAULT_MODEL,
        expansionModel:
          expansionModel.trim() || APP_CONFIG.env.EXPANSION_MODEL,
      };
      saveAiSettings(next);
      setSavedFlash(true);
      onSave?.(next);
    },
    [openaiApiKey, googleApiKey, defaultModel, expansionModel, onSave],
  );

  if (!open) return null;

  const knownIds = new Set(ALL_MODEL_OPTIONS.map((m) => m.id));
  const extraModels = [defaultModel, expansionModel].filter(
    (id) => id.trim() && !knownIds.has(id),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close settings backdrop"
        className="absolute inset-0 bg-background/80"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-lg border border-border-subtle bg-surface-elevated p-6 shadow-xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2
              id={titleId}
              className="text-lg font-semibold text-text-high-contrast"
            >
              Settings
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Choose Gemini (free) or OpenAI models. Keys in this browser are
              setup hints — server routes read{" "}
              <code className="text-active">.env.local</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted transition hover:bg-background hover:text-text-high-contrast focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-active"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto"
          aria-label="AI settings"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={googleKeyFieldId}
              className="text-sm font-medium text-text-high-contrast"
            >
              GOOGLE_GENERATIVE_AI_API_KEY
            </label>
            <input
              id={googleKeyFieldId}
              name="googleApiKey"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={googleApiKey}
              onChange={(event) => setGoogleApiKey(event.target.value)}
              placeholder="AIza…"
              className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm text-text-high-contrast outline-none transition placeholder:text-text-muted focus:border-active focus:ring-2 focus:ring-active/40"
            />
            <p className="text-xs text-text-muted">
              Free key from{" "}
              <span className="text-active">aistudio.google.com/apikey</span>.
              Also set in{" "}
              <code className="text-active">.env.local</code> for{" "}
              <code className="text-active">gemini-*</code> models.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={openaiKeyFieldId}
              className="text-sm font-medium text-text-high-contrast"
            >
              OPENAI_API_KEY
            </label>
            <input
              id={openaiKeyFieldId}
              name="openaiApiKey"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={openaiApiKey}
              onChange={(event) => setOpenaiApiKey(event.target.value)}
              placeholder="sk-…"
              className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm text-text-high-contrast outline-none transition placeholder:text-text-muted focus:border-active focus:ring-2 focus:ring-active/40"
            />
            <p className="text-xs text-text-muted">
              Optional if you use Gemini. Required for{" "}
              <code className="text-active">gpt-*</code> /{" "}
              <code className="text-active">o*</code> models.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={defaultModelId}
              className="text-sm font-medium text-text-high-contrast"
            >
              DEFAULT_MODEL
            </label>
            <select
              id={defaultModelId}
              name="defaultModel"
              value={defaultModel}
              onChange={(event) => setDefaultModel(event.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm text-text-high-contrast outline-none transition focus:border-active focus:ring-2 focus:ring-active/40"
            >
              <optgroup label="Google Gemini (free)">
                {ALL_MODEL_OPTIONS.filter((m) => m.provider === "google").map(
                  (model) => (
                    <option key={`default-${model.id}`} value={model.id}>
                      {model.label}
                    </option>
                  ),
                )}
              </optgroup>
              <optgroup label="OpenAI">
                {ALL_MODEL_OPTIONS.filter((m) => m.provider === "openai").map(
                  (model) => (
                    <option key={`default-${model.id}`} value={model.id}>
                      {model.label}
                    </option>
                  ),
                )}
              </optgroup>
              {extraModels.map((model) => (
                <option key={`default-extra-${model}`} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-muted">
              Used by the Socratic mentor chat loop. Mirror in{" "}
              <code className="text-active">.env.local</code> as{" "}
              <code className="text-active">DEFAULT_MODEL</code>.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={expansionModelId}
              className="text-sm font-medium text-text-high-contrast"
            >
              EXPANSION_MODEL
            </label>
            <select
              id={expansionModelId}
              name="expansionModel"
              value={expansionModel}
              onChange={(event) => setExpansionModel(event.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm text-text-high-contrast outline-none transition focus:border-active focus:ring-2 focus:ring-active/40"
            >
              <optgroup label="Google Gemini (free)">
                {ALL_MODEL_OPTIONS.filter((m) => m.provider === "google").map(
                  (model) => (
                    <option key={`expansion-${model.id}`} value={model.id}>
                      {model.label}
                    </option>
                  ),
                )}
              </optgroup>
              <optgroup label="OpenAI">
                {ALL_MODEL_OPTIONS.filter((m) => m.provider === "openai").map(
                  (model) => (
                    <option key={`expansion-${model.id}`} value={model.id}>
                      {model.label}
                    </option>
                  ),
                )}
              </optgroup>
              {extraModels.map((model) => (
                <option key={`expansion-extra-${model}`} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-muted">
              Used when mastery expands the knowledge graph. Mirror as{" "}
              <code className="text-active">EXPANSION_MODEL</code>.
            </p>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <p
              className="text-xs text-mastered"
              role="status"
              aria-live="polite"
            >
              {savedFlash ? "Settings saved to local storage." : "\u00a0"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border-subtle px-3 py-2 text-sm font-medium text-text-muted transition hover:text-text-high-contrast focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-active"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-accent-action px-3 py-2 text-sm font-semibold text-text-high-contrast transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-active"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SettingsModal;
