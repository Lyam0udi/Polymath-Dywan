"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { APP_CONFIG } from "@/app.config";
import { useLocalStorage } from "@/hooks/useLocalStorage";

/** Node lifecycle status for the knowledge graph. */
export type NodeStatus = "foggy" | "mastered" | "active";

export interface GraphNode {
  id: string;
  label: string;
  status: NodeStatus;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/** Stable id for the seed / root concept node. */
export const ROOT_NODE_ID = "root" as const;

/**
 * Builds the initial graph with a single root node derived from the seed topic.
 * Falls back to `APP_CONFIG.metadata.seedTopic` when the input is blank.
 */
export function buildSeedGraph(seedTopic?: string): GraphData {
  const label = seedTopic?.trim() || APP_CONFIG.metadata.seedTopic;
  return {
    nodes: [
      {
        id: ROOT_NODE_ID,
        label,
        status: "active",
      },
    ],
    links: [],
  };
}

export interface UniverseContextValue {
  /** Full graph for canvas + panel consumers. */
  graphData: GraphData;
  /** Replace or merge graph data (Graph Integrity: caller must keep link ids valid). */
  setGraphData: (
    next: GraphData | ((prev: GraphData) => GraphData),
  ) => void;
  /** Currently selected node id (`null` = none). */
  selectedNodeId: string | null;
  /** Update selection (canvas click / panel). */
  selectNode: (nodeId: string | null) => void;
  /** Resolved selected node object, if present in `graphData`. */
  selectedNode: GraphNode | null;
  /** Seed topic used to initialize the root node. */
  seedTopic: string;
  /** True after localStorage hydration (avoid treating seed flash as authoritative). */
  isHydrated: boolean;
  /** True while POST `/api/expand` is in flight for a mastered parent. */
  isExpanding: boolean;
  /** Set by universe page while semantic expansion runs. */
  setIsExpanding: (value: boolean) => void;
}

const UniverseContext = createContext<UniverseContextValue | null>(null);

/**
 * Context hook for graph data + selection.
 * Must be called under `UniverseProvider`.
 * Wraps localStorage via `useLocalStorage` (PERSISTENCE_STRATEGY).
 */
export function useUniverseStore(): UniverseContextValue {
  const ctx = useContext(UniverseContext);
  if (!ctx) {
    throw new Error(
      "useUniverseStore must be used within a UniverseProvider",
    );
  }
  return ctx;
}

export interface UniverseProviderProps {
  children: ReactNode;
  /** Optional seed from landing query / Enter Universe; defaults to APP_CONFIG. */
  seedTopic?: string;
}

/**
 * Orchestrates shared universe state between the 3D canvas and the UI shell.
 * Owns seed initialization, localStorage sync, and selection; rendering stays
 * in UniverseCanvas.
 */
export default function UniverseProvider({
  children,
  seedTopic: seedTopicProp,
}: UniverseProviderProps) {
  const seedTopic =
    seedTopicProp?.trim() || APP_CONFIG.metadata.seedTopic;

  const { graphData, setGraphData, isHydrated } = useLocalStorage({
    seedTopic,
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    ROOT_NODE_ID,
  );
  const [isExpanding, setIsExpanding] = useState(false);

  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const selectedNode = useMemo(() => {
    if (selectedNodeId === null) return null;
    return graphData.nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [graphData.nodes, selectedNodeId]);

  const value = useMemo<UniverseContextValue>(
    () => ({
      graphData,
      setGraphData,
      selectedNodeId,
      selectNode,
      selectedNode,
      seedTopic,
      isHydrated,
      isExpanding,
      setIsExpanding,
    }),
    [
      graphData,
      setGraphData,
      selectedNodeId,
      selectNode,
      selectedNode,
      seedTopic,
      isHydrated,
      isExpanding,
    ],
  );

  return (
    <UniverseContext.Provider value={value}>
      {children}
    </UniverseContext.Provider>
  );
}
