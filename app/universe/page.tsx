"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  APP_CONFIG,
  UNIVERSE_SEED_QUERY_PARAM,
} from "@/app.config";
import MentorChatPanel from "@/components/MentorChatPanel";
import UniverseProvider, {
  useUniverseStore,
} from "@/components/UniverseProvider";

/**
 * Client-only WebGL canvas — never SSR (avoids hydration mismatch / missing WebGL).
 */
const UniverseCanvas = dynamic(
  () => import("@/components/UniverseCanvas"),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-full w-full items-center justify-center bg-background text-sm text-text-muted"
        aria-busy="true"
        aria-label="Loading universe canvas"
      >
        Initializing universe…
      </div>
    ),
  },
);

function UniverseShell() {
  const { graphData, selectedNodeId, selectNode, selectedNode } =
    useUniverseStore();

  return (
    <main className="flex min-h-screen">
      <section
        className="relative min-h-screen flex-1"
        aria-label="Universe canvas"
      >
        <UniverseCanvas
          graphData={graphData}
          activeNodeId={selectedNodeId}
          onNodeSelect={selectNode}
        />
      </section>
      <div className="min-h-screen shrink-0">
        <MentorChatPanel
          activeNodeId={selectedNodeId}
          activeNodeLabel={selectedNode?.label ?? null}
        />
      </div>
    </main>
  );
}

function UniversePageContent() {
  const searchParams = useSearchParams();
  const seedFromQuery =
    searchParams.get(UNIVERSE_SEED_QUERY_PARAM)?.trim() ||
    APP_CONFIG.metadata.seedTopic;

  return (
    <UniverseProvider seedTopic={seedFromQuery}>
      <UniverseShell />
    </UniverseProvider>
  );
}

export default function UniversePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background text-sm text-text-muted">
          Loading universe…
        </main>
      }
    >
      <UniversePageContent />
    </Suspense>
  );
}
