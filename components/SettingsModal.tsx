"use client";

import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { APP_CONFIG } from "@/app.config";

/** localStorage key for AI model / key preferences. */
export const SETTINGS_STORAGE_KEY = "polymath-dywan-settings" as const;

/** Runtime AI preferences persisted client-side. */
export interface AiSettings {
  /** Client-held copy for setup UX. Server routes still require `.env.local`. */
  openaiApiKey: string;
  defaultModel: string;
  expansionModel: string;
}

const MODEL_OPTIONS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-mini",
  "gpt-4.1",
  "o4-mini",
] as const;

function defaultSettings(): AiSettings {
  return {
    openaiApiKey: "",
    defaultModel: APP_CONFIG.env.DEFAULT_MODEL,
    expansionModel: APP_CONFIG.env.EXPANSION_MODEL,
  };
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
 * Settings modal — OPENAI_API_KEY input + DEFAULT_MODEL / EXPANSION_MODEL selects.
 * Preferences persist in localStorage (`SETTINGS_STORAGE_KEY`).
 * The live API key for `/api/mentor` and `/api/expand` must also be set in `.env.local`.
 */
export function SettingsModal({ open, onClose, onSave }: SettingsModalProps) {
  const titleId = useId();
  const keyFieldId = useId();
  const defaultModelId = useId();
  const expansionModelId = useId();

  const [openaiApiKey, setOpenaiApiKey] = useState("");
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
        defaultModel: defaultModel.trim() || APP_CONFIG.env.DEFAULT_MODEL,
        expansionModel:
          expansionModel.trim() || APP_CONFIG.env.EXPANSION_MODEL,
      };
      saveAiSettings(next);
      setSavedFlash(true);
      onSave?.(next);
    },
    [openaiApiKey, defaultModel, expansionModel, onSave],
  );

  if (!open) return null;

  const modelChoices = Array.from(
    new Set<string>([
      ...MODEL_OPTIONS,
      APP_CONFIG.env.DEFAULT_MODEL,
      APP_CONFIG.env.EXPANSION_MODEL,
      defaultModel,
      expansionModel,
    ]),
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
              Choose AI models and configure your OpenAI key for the Socratic
              mentor.
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
          className="flex flex-col gap-4"
          aria-label="AI settings"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={keyFieldId}
              className="text-sm font-medium text-text-high-contrast"
            >
              OPENAI_API_KEY
            </label>
            <input
              id={keyFieldId}
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
              Stored in this browser for setup. Server routes also need{" "}
              <code className="text-active">OPENAI_API_KEY</code> in{" "}
              <code className="text-active">.env.local</code>.
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
              {modelChoices.map((model) => (
                <option key={`default-${model}`} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-muted">
              Used by the Socratic mentor chat loop.
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
              {modelChoices.map((model) => (
                <option key={`expansion-${model}`} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-muted">
              Used when mastery expands the knowledge graph.
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
