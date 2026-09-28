"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { APP_CONFIG, buildUniverseHref } from "@/app.config";
import SettingsModal, { loadAiSettings } from "@/components/SettingsModal";
import { seedUniverseFromLanding } from "@/lib/seed-universe";

/**
 * Landing View — seed input + Settings → persist root graph → `/universe`.
 * Production flow starts here: seed initializes 3D graph state via localStorage
 * before the canvas mounts; mastery later hits POST `/api/expand`.
 */
export default function HomePage() {
  const router = useRouter();
  const [seedTopic, setSeedTopic] = useState(APP_CONFIG.metadata.seedTopic);
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Client-held key hint for setup UX (server still needs `.env.local`). */
  const [hasClientKey, setHasClientKey] = useState(true);

  useEffect(() => {
    const settings = loadAiSettings();
    const configured = settings.openaiApiKey.trim().length > 0;
    setHasClientKey(configured);
    // Missing key → force Settings / clear setup UX (assembly contract).
    if (!configured) {
      setSettingsOpen(true);
    }
  }, []);

  function handleEnterUniverse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Seed root node into localStorage so UniverseCanvas hydrates the topic.
    seedUniverseFromLanding(seedTopic);
    router.push(buildUniverseHref(seedTopic));
  }

  function handleSettingsSaved() {
    const settings = loadAiSettings();
    setHasClientKey(settings.openaiApiKey.trim().length > 0);
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-elevated px-3 py-2 text-sm font-medium text-text-high-contrast transition hover:border-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-active sm:right-6 sm:top-6"
        aria-label="Open settings"
      >
        <Settings className="h-4 w-4 text-active" aria-hidden />
        Settings
      </button>

      <div className="flex w-full max-w-lg flex-col items-center gap-8 text-center">
        <header className="flex flex-col items-center gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-active">
            {APP_CONFIG.metadata.title}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-text-high-contrast sm:text-4xl">
            Map a domain you are ready to master
          </h1>
          <p className="max-w-md text-base leading-relaxed text-text-muted">
            Name the concept that pulls you forward. We will grow a living
            knowledge graph around it — rigorous questions, spatial connections,
            one clear step at a time.
          </p>
        </header>

        {!hasClientKey ? (
          <p
            className="w-full rounded-lg border border-border-subtle bg-surface-elevated px-4 py-3 text-left text-sm text-text-muted"
            role="status"
          >
            Set{" "}
            <code className="text-active">OPENAI_API_KEY</code> in Settings and
            in{" "}
            <code className="text-active">.env.local</code> (or your production
            host env) so the mentor and{" "}
            <code className="text-active">/api/expand</code> can run.
          </p>
        ) : null}

        <form
          onSubmit={handleEnterUniverse}
          className="flex w-full flex-col gap-4"
          aria-label="Seed topic"
        >
          <label
            htmlFor="seed-topic"
            className="text-left text-sm font-medium text-text-high-contrast"
          >
            Seed topic
          </label>
          <input
            id="seed-topic"
            name="seed"
            type="text"
            value={seedTopic}
            onChange={(event) => setSeedTopic(event.target.value)}
            placeholder={APP_CONFIG.metadata.seedTopic}
            autoComplete="off"
            className="w-full rounded-lg border border-border-subtle bg-surface-elevated px-4 py-3 text-left text-base text-text-high-contrast outline-none transition placeholder:text-text-muted focus:border-active focus:ring-2 focus:ring-active/40"
          />
          <button
            type="submit"
            className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-accent-action px-4 py-3 text-base font-semibold text-text-high-contrast transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-active"
          >
            Enter Universe
          </button>
        </form>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSettingsSaved}
      />
    </main>
  );
}
