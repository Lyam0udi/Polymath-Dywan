"use client";

import {
  GRAPH_EXPAND_ENDPOINT,
  STATUS_COLOR_TOKENS,
  resolveStatusColor,
  shouldTriggerExpansionOnMastery,
} from "@/app.config";
import {
  useUniverseStore,
  type GraphData,
} from "@/components/UniverseProvider";
import {
  forceExpansionNodesFoggy,
  mergeGraphData,
  type GraphExpansionPayload,
  type MergeGraphResult,
} from "@/lib/merge-graph-data";
import { sanitizeAiGraphData } from "@/lib/utils";
import { useCallback } from "react";

export type { GraphExpansionPayload, MergeGraphResult };
export {
  forceExpansionNodesFoggy,
  mergeGraphData,
  GRAPH_EXPAND_ENDPOINT,
  STATUS_COLOR_TOKENS,
  resolveStatusColor,
  shouldTriggerExpansionOnMastery,
};

export interface UseGraphDataResult {
  /** Current graph from the universe store. */
  graphData: GraphData;
  /**
   * Merge an expansion payload into local graph state.
   * Returns merge stats; no-op when nothing valid remains to add.
   * New nodes are forced to Status-Foggy (`foggy` / #475569).
   */
  mergeExpansion: (incoming: GraphExpansionPayload) => MergeGraphResult;
  /** Replace the full graph (caller remains responsible for integrity). */
  setGraphData: (
    next: GraphData | ((prev: GraphData) => GraphData),
  ) => void;
}

/**
 * Graph data management for semantic expansion.
 * Merges `/api/expand` nodes + links into `useUniverseStore` while enforcing
 * unique ids, Graph Integrity, and no circular link references.
 * AI payloads are sanitized before merge / 3D canvas render.
 *
 * DoD (Semantic Expansion & Local Persistence):
 * 1. Mastered → Status-Mastered color via {@link resolveStatusColor} (#10b981)
 * 2. Mastery → fetch {@link GRAPH_EXPAND_ENDPOINT} when
 *    {@link shouldTriggerExpansionOnMastery} (ENABLE_INFINITE_EXPANSION)
 * 3. New children initialize as `foggy` (Status-Foggy / #475569)
 */
export function useGraphData(): UseGraphDataResult {
  const { graphData, setGraphData } = useUniverseStore();

  const mergeExpansion = useCallback(
    (incoming: GraphExpansionPayload): MergeGraphResult => {
      let result: MergeGraphResult | undefined;

      // Sanitize AI JSON before merge / 3D canvas render (Graph Integrity).
      const sanitized = sanitizeAiGraphData(incoming, { forceFoggy: true });
      // DoD: expansion children always Status-Foggy (#475569 via APP_CONFIG).
      const foggyPayload = forceExpansionNodesFoggy(sanitized);

      setGraphData((prev) => {
        result = mergeGraphData(prev, foggyPayload);
        return result.graph;
      });

      // useState updaters run synchronously — result is always assigned.
      return result as MergeGraphResult;
    },
    [setGraphData],
  );

  return {
    graphData,
    mergeExpansion,
    setGraphData,
  };
}
