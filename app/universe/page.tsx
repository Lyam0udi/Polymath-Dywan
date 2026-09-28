"use client";

import { Suspense, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  APP_CONFIG,
  UNIVERSE_SEED_QUERY_PARAM,
} from "@/app.config";
import MentorChatPanel from "@/components/MentorChatPanel";
import UniverseProvider, {
  useUniverseStore,
  type GraphNode,
} from "@/components/UniverseProvider";
import { useGraphData } from "@/hooks/useGraphData";
import { sanitizeAiGraphData } from "@/lib/utils";

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

/**
 * Mastery → semantic expansion: POST `/api/expand`, sanitize, merge, persist.
 * Owns the trigger outside UniverseCanvas (Component Boundary).
 */
function useMasteryExpansion() {
  const { graphData, isHydrated, isExpanding, setIsExpanding } =
    useUniverseStore();
  const { mergeExpansion } = useGraphData();
  /** Parents we already tried so a failed expand cannot loop forever. */
  const attemptedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isHydrated) return;
    if (!APP_CONFIG.features.ENABLE_INFINITE_EXPANSION) return;
    if (isExpanding) return;

    const pending = graphData.nodes.find((node) => {
      if (node.status !== "mastered") return false;
      if (attemptedRef.current.has(node.id)) return false;
      const hasChildren = graphData.links.some(
        (link) => link.source === node.id,
      );
      return !hasChildren;
    });

    if (!pending) return;

    const parent: GraphNode = pending;
    attemptedRef.current.add(parent.id);
    setIsExpanding(true);

    void (async () => {
      try {
        const response = await fetch("/api/expand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentNode: { id: parent.id, label: parent.label },
          }),
        });

        if (!response.ok) return;

        const raw: unknown = await response.json();
        const sanitized = sanitizeAiGraphData(raw, {
          parentNode: { id: parent.id, label: parent.label },
          forceFoggy: true,
        });
        mergeExpansion(sanitized);
      } catch {
        // Network / parse failure — leave graph intact; attempt already recorded.
      } finally {
        setIsExpanding(false);
      }
    })();
  }, [
    graphData,
    isHydrated,
    isExpanding,
    mergeExpansion,
    setIsExpanding,
  ]);
}

function UniverseShell() {
  const {
    graphData,
    selectedNodeId,
    selectNode,
    selectedNode,
    isHydrated,
    isExpanding,
  } = useUniverseStore();

  useMasteryExpansion();

  if (!isHydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-sm text-text-muted">
        Restoring universe…
      </main>
    );
  }

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
          isExpanding={isExpanding}
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
