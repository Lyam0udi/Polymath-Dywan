"use client";

import { useCallback } from "react";
import {
  useUniverseStore,
  type GraphData,
} from "@/components/UniverseProvider";
import {
  mergeGraphData,
  type GraphExpansionPayload,
  type MergeGraphResult,
} from "@/lib/merge-graph-data";
import { sanitizeAiGraphData } from "@/lib/utils";

export type { GraphExpansionPayload, MergeGraphResult };
export { mergeGraphData };

export interface UseGraphDataResult {
  /** Current graph from the universe store. */
  graphData: GraphData;
  /**
   * Merge an expansion payload into local graph state.
   * Returns merge stats; no-op when nothing valid remains to add.
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
 */
export function useGraphData(): UseGraphDataResult {
  const { graphData, setGraphData } = useUniverseStore();

  const mergeExpansion = useCallback(
    (incoming: GraphExpansionPayload): MergeGraphResult => {
      let result: MergeGraphResult | undefined;

      // Sanitize AI JSON before merge / 3D canvas render (Graph Integrity).
      const sanitized = sanitizeAiGraphData(incoming, { forceFoggy: true });

      setGraphData((prev) => {
        result = mergeGraphData(prev, sanitized);
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
