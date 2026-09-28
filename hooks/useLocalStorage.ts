"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { GraphData } from "@/components/UniverseProvider";
import {
  clearGraphStorage,
  getSeedGraph,
  loadGraphFromStorage,
  saveGraphToStorage,
} from "@/lib/persistence/local-storage";

export interface UseLocalStorageOptions {
  /**
   * When localStorage is empty / corrupt, seed the root node with this topic.
   * Falls back to `data/local-graph.json` via `getSeedGraph()`.
   */
  seedTopic?: string;
}

export interface UseLocalStorageResult {
  /** Live graph synchronized with localStorage after hydration. */
  graphData: GraphData;
  /** Replace graph; every update is persisted once hydrated. */
  setGraphData: Dispatch<SetStateAction<GraphData>>;
  /** True after the first client read from localStorage (or seed). */
  isHydrated: boolean;
  /** Clear storage and reset in-memory state to the seed graph. */
  resetToSeed: () => void;
}

function buildSeedFromTopic(seedTopic?: string): GraphData {
  const label = seedTopic?.trim();
  if (!label) return getSeedGraph();
  return {
    nodes: [
      {
        id: "root",
        label,
        status: "active",
      },
    ],
    links: [],
  };
}

/**
 * Browser graph persistence hook.
 * Hydrates from localStorage on mount; writes on every subsequent update.
 * Corrupt storage is handled inside `loadGraphFromStorage` (Zod → seed).
 */
export function useLocalStorage(
  options: UseLocalStorageOptions = {},
): UseLocalStorageResult {
  const seedGraph = useMemo(
    () => buildSeedFromTopic(options.seedTopic),
    [options.seedTopic],
  );

  const [graphData, setGraphDataState] = useState<GraphData>(() => seedGraph);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setGraphDataState(loadGraphFromStorage(seedGraph));
    setIsHydrated(true);
  }, [seedGraph]);

  useEffect(() => {
    if (!isHydrated) return;
    saveGraphToStorage(graphData);
  }, [graphData, isHydrated]);

  const setGraphData = useCallback<Dispatch<SetStateAction<GraphData>>>(
    (next) => {
      setGraphDataState(next);
    },
    [],
  );

  const resetToSeed = useCallback(() => {
    clearGraphStorage();
    setGraphDataState(seedGraph);
    saveGraphToStorage(seedGraph);
  }, [seedGraph]);

  return {
    graphData,
    setGraphData,
    isHydrated,
    resetToSeed,
  };
}
