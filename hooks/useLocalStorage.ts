"use client";

import {
  useCallback,
  useEffect,
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

export interface UseLocalStorageResult {
  /** Live graph synchronized with localStorage after hydration. */
  graphData: GraphData;
  /** Replace graph; every update is persisted once hydrated. */
  setGraphData: Dispatch<SetStateAction<GraphData>>;
  /** True after the first client read from localStorage (or seed). */
  isHydrated: boolean;
  /** Clear storage and reset in-memory state to `data/local-graph.json` seed. */
  resetToSeed: () => void;
}

/**
 * Browser graph persistence hook.
 * Hydrates from localStorage on mount; writes on every subsequent update.
 * Corrupt storage is handled inside `loadGraphFromStorage` (Zod → seed).
 */
export function useLocalStorage(): UseLocalStorageResult {
  const [graphData, setGraphDataState] = useState<GraphData>(() =>
    getSeedGraph(),
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setGraphDataState(loadGraphFromStorage());
    setIsHydrated(true);
  }, []);

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
    const seed = getSeedGraph();
    setGraphDataState(seed);
    saveGraphToStorage(seed);
  }, []);

  return {
    graphData,
    setGraphData,
    isHydrated,
    resetToSeed,
  };
}
