/**
 * Pure graph merge for semantic expansion — Graph Integrity + no cycles.
 * Kept free of React / JSX so unit tests can import it without a DOM transform.
 */

export type MergeNodeStatus = "foggy" | "mastered" | "active";

export interface MergeGraphNode {
  id: string;
  label: string;
  status: MergeNodeStatus;
}

export interface MergeGraphLink {
  source: string;
  target: string;
}

export interface MergeGraphDataShape {
  nodes: MergeGraphNode[];
  links: MergeGraphLink[];
}

export type GraphExpansionPayload = {
  nodes?: MergeGraphNode[];
  links?: MergeGraphLink[];
};

export interface MergeGraphResult {
  /** Merged graph with Graph Integrity preserved. */
  graph: MergeGraphDataShape;
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

function buildAdjacency(links: MergeGraphLink[]): Map<string, string[]> {
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
  current: MergeGraphDataShape,
  incoming: GraphExpansionPayload,
): MergeGraphResult {
  const existingIds = new Set(
    current.nodes
      .map((node) => normalizeId(node.id))
      .filter((id): id is string => id !== null),
  );

  const addedNodes: MergeGraphNode[] = [];
  const addedNodeIds: string[] = [];
  const skippedNodeIds: string[] = [];
  const seenIncomingIds = new Set<string>();

  for (const raw of incoming.nodes ?? []) {
    const id = normalizeId(raw.id);
    if (!id) {
      skippedNodeIds.push(typeof raw.id === "string" ? raw.id : "");
      continue;
    }

    if (seenIncomingIds.has(id)) {
      skippedNodeIds.push(id);
      continue;
    }
    seenIncomingIds.add(id);

    if (existingIds.has(id)) {
      skippedNodeIds.push(id);
      continue;
    }

    const label =
      typeof raw.label === "string" && raw.label.trim().length > 0
        ? raw.label.trim()
        : id;

    const status =
      raw.status === "mastered" || raw.status === "active"
        ? raw.status
        : "foggy";

    addedNodes.push({ id, label, status });
    addedNodeIds.push(id);
    existingIds.add(id);
  }

  const knownIds = existingIds;
  const mergedLinks: MergeGraphLink[] = [...current.links];
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

    if (!knownIds.has(source) || !knownIds.has(target)) {
      skippedLinkCount += 1;
      continue;
    }

    if (source === target) {
      skippedLinkCount += 1;
      continue;
    }

    const key = linkKey(source, target);
    if (existingLinkKeys.has(key)) {
      skippedLinkCount += 1;
      continue;
    }

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
