"use client";

import { useCallback } from "react";
import {
  useUniverseStore,
  type GraphData,
  type GraphLink,
  type GraphNode,
} from "@/components/UniverseProvider";

/** Incoming expansion payload from POST `/api/expand` (or equivalent). */
export type GraphExpansionPayload = {
  nodes?: GraphNode[];
  links?: GraphLink[];
};

export interface MergeGraphResult {
  /** Merged graph with Graph Integrity preserved. */
  graph: GraphData;
  /** Node ids that were newly appended. */
  addedNodeIds: string[];
  /** Incoming node ids skipped (blank, duplicate in payload, or already present). */
  skippedNodeIds: string[];
  /** Links appended after integrity + circularity checks. */
  addedLinkCount: number;
  /** Links dropped (invalid endpoints, self-loop, duplicate, or would form a cycle). */
  skippedLinkCount: number;
}

function normalizeId(id: string | undefined | null): string | null {
  if (typeof id !== "string") return null;
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function linkKey(source: string, target: string): string {
  return `${source}\0${target}`;
}

/**
 * Builds adjacency lists for directed edges (source → targets).
 */
function buildAdjacency(links: GraphLink[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const link of links) {
    const source = normalizeId(link.source);
    const target = normalizeId(link.target);
    if (!source || !target) continue;
    const bucket = adj.get(source);
    if (bucket) {
      bucket.push(target);
    } else {
      adj.set(source, [target]);
    }
  }
  return adj;
}

/**
 * True when a directed path already exists from `from` to `to`
 * (used to reject an edge `to → from` that would close a cycle).
 */
function hasDirectedPath(
  adjacency: Map<string, string[]>,
  from: string,
  to: string,
): boolean {
  if (from === to) return true;

  const stack = [from];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const neighbors = adjacency.get(current);
    if (!neighbors) continue;

    for (const next of neighbors) {
      if (next === to) return true;
      if (!visited.has(next)) {
        stack.push(next);
      }
    }
  }

  return false;
}

/**
 * Pure merge for semantic expansion.
 * - Dedupes node ids (incoming + against existing state).
 * - Keeps only links whose endpoints exist after the merge.
 * - Rejects self-loops and edges that would introduce a directed cycle.
 */
export function mergeGraphData(
  current: GraphData,
  incoming: GraphExpansionPayload,
): MergeGraphResult {
  const existingIds = new Set(
    current.nodes
      .map((node) => normalizeId(node.id))
      .filter((id): id is string => id !== null),
  );

  const addedNodes: GraphNode[] = [];
  const addedNodeIds: string[] = [];
  const skippedNodeIds: string[] = [];
  const seenIncomingIds = new Set<string>();

  for (const raw of incoming.nodes ?? []) {
    const id = normalizeId(raw.id);
    if (!id) {
      skippedNodeIds.push(typeof raw.id === "string" ? raw.id : "");
      continue;
    }

    // Unique within the expansion batch.
    if (seenIncomingIds.has(id)) {
      skippedNodeIds.push(id);
      continue;
    }
    seenIncomingIds.add(id);

    // Unique against the live graph — existing node wins.
    if (existingIds.has(id)) {
      skippedNodeIds.push(id);
      continue;
    }

    const label =
      typeof raw.label === "string" && raw.label.trim().length > 0
        ? raw.label.trim()
        : id;

    const status = raw.status === "mastered" || raw.status === "active"
      ? raw.status
      : "foggy";

    addedNodes.push({ id, label, status });
    addedNodeIds.push(id);
    existingIds.add(id);
  }

  const knownIds = existingIds;
  const mergedLinks: GraphLink[] = [...current.links];
  const existingLinkKeys = new Set(
    current.links
      .map((link) => {
        const source = normalizeId(link.source);
        const target = normalizeId(link.target);
        return source && target ? linkKey(source, target) : null;
      })
      .filter((key): key is string => key !== null),
  );

  const adjacency = buildAdjacency(mergedLinks);
  let addedLinkCount = 0;
  let skippedLinkCount = 0;

  for (const raw of incoming.links ?? []) {
    const source = normalizeId(raw.source);
    const target = normalizeId(raw.target);

    if (!source || !target) {
      skippedLinkCount += 1;
      continue;
    }

    // Graph Integrity: both endpoints must exist in the merged node set.
    if (!knownIds.has(source) || !knownIds.has(target)) {
      skippedLinkCount += 1;
      continue;
    }

    // Circularity: self-loop.
    if (source === target) {
      skippedLinkCount += 1;
      continue;
    }

    const key = linkKey(source, target);
    if (existingLinkKeys.has(key)) {
      skippedLinkCount += 1;
      continue;
    }

    // Circularity: adding source→target when target already reaches source.
    if (hasDirectedPath(adjacency, target, source)) {
      skippedLinkCount += 1;
      continue;
    }

    mergedLinks.push({ source, target });
    existingLinkKeys.add(key);
    addedLinkCount += 1;

    const bucket = adjacency.get(source);
    if (bucket) {
      bucket.push(target);
    } else {
      adjacency.set(source, [target]);
    }
  }

  return {
    graph: {
      nodes: [...current.nodes, ...addedNodes],
      links: mergedLinks,
    },
    addedNodeIds,
    skippedNodeIds,
    addedLinkCount,
    skippedLinkCount,
  };
}

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
 */
export function useGraphData(): UseGraphDataResult {
  const { graphData, setGraphData } = useUniverseStore();

  const mergeExpansion = useCallback(
    (incoming: GraphExpansionPayload): MergeGraphResult => {
      let result: MergeGraphResult | undefined;

      setGraphData((prev) => {
        result = mergeGraphData(prev, incoming);
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
