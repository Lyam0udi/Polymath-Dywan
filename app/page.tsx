"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { APP_CONFIG, buildUniverseHref } from "@/app.config";

export default function HomePage() {
  const router = useRouter();
  const [seedTopic, setSeedTopic] = useState(APP_CONFIG.metadata.seedTopic);

  function handleEnterUniverse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(buildUniverseHref(seedTopic));
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
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
    </main>
  );
}
