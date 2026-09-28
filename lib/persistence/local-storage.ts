import { z } from "zod";
import { APP_CONFIG } from "@/app.config";
import type {
  GraphData,
  GraphLink,
  GraphNode,
  NodeStatus,
} from "@/components/UniverseProvider";
import seedGraphJson from "@/data/local-graph.json";

/** localStorage key for the knowledge-graph payload (PERSISTENCE_STRATEGY). */
export const GRAPH_STORAGE_KEY = "polymath-dywan-graph" as const;

const nodeStatusSchema = z.enum(["foggy", "mastered", "active"]);

const graphNodeSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    status: nodeStatusSchema,
  })
  .strict();

const graphLinkSchema = z
  .object({
    source: z.string().min(1),
    target: z.string().min(1),
  })
  .strict();

/**
 * Zod schema for persisted GraphData.
 * Production: at least one node; unknown keys fail closed (corrupt / hand-edited JSON).
 */
export const graphDataSchema = z
  .object({
    nodes: z.array(graphNodeSchema).min(1),
    links: z.array(graphLinkSchema),
  })
  .strict();

export type PersistedGraphData = z.infer<typeof graphDataSchema>;

/**
 * Drop links whose endpoints are missing or self-referential.
 * Keeps Graph Integrity without inventing nodes.
 */
export function enforceGraphIntegrity(data: GraphData): GraphData {
  const knownIds = new Set(
    data.nodes
      .map((node) => node.id.trim())
      .filter((id) => id.length > 0),
  );

  const nodes: GraphNode[] = data.nodes
    .filter((node) => knownIds.has(node.id.trim()))
    .map((node) => ({
      id: node.id.trim(),
      label: node.label.trim() || node.id.trim(),
      status: node.status as NodeStatus,
    }));

  const links: GraphLink[] = [];
  const seen = new Set<string>();

  for (const link of data.links) {
    const source = link.source.trim();
    const target = link.target.trim();
    if (!source || !target) continue;
    if (source === target) continue;
    if (!knownIds.has(source) || !knownIds.has(target)) continue;

    const key = `${source}\0${target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ source, target });
  }

  return { nodes, links };
}

/**
 * Validate an unknown payload as GraphData.
 * Returns `null` when Zod fails or integrity leaves zero nodes (never throws).
 */
export function parsePersistedGraph(raw: unknown): GraphData | null {
  const parsed = graphDataSchema.safeParse(raw);
  if (!parsed.success) return null;

  const intact = enforceGraphIntegrity(parsed.data);
  if (intact.nodes.length === 0) return null;

  // Re-check after sanitize — integrity may have changed shape slightly.
  const revalidated = graphDataSchema.safeParse(intact);
  return revalidated.success ? intact : null;
}

/**
 * Compile-time seed from `data/local-graph.json`.
 * Invalid / empty seed falls back to APP_CONFIG.metadata.seedTopic root.
 */
export function getSeedGraph(): GraphData {
  const fromFile = parsePersistedGraph(seedGraphJson);
  if (fromFile) return fromFile;

  return {
    nodes: [
      {
        id: "root",
        label: APP_CONFIG.metadata.seedTopic,
        status: "active",
      },
    ],
    links: [],
  };
}

/** Remove the graph key from localStorage (SSR-safe no-op). */
export function clearGraphStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GRAPH_STORAGE_KEY);
  } catch {
    // Quota / privacy mode — ignore.
  }
}

/**
 * Persist graph state. Always writes integrity-sanitized, Zod-valid JSON.
 * Refuses to write when the payload cannot be validated (never stores corrupt data).
 * SSR-safe no-op when `window` is unavailable.
 */
export function saveGraphToStorage(graph: GraphData): void {
  if (typeof window === "undefined") return;

  const safe = parsePersistedGraph(enforceGraphIntegrity(graph));
  if (!safe) return;

  try {
    window.localStorage.setItem(GRAPH_STORAGE_KEY, JSON.stringify(safe));
  } catch {
    // QuotaExceeded / private mode — leave in-memory state alone.
  }
}

/**
 * Hydrate graph from localStorage.
 * Missing key → `fallbackSeed` (or compile-time seed). Corrupt JSON / Zod failure
 * → clear key and reset to that same seed (fail closed, never crash).
 */
export function loadGraphFromStorage(fallbackSeed?: GraphData): GraphData {
  const seedCandidate = fallbackSeed
    ? parsePersistedGraph(enforceGraphIntegrity(fallbackSeed))
    : null;
  const seed = seedCandidate ?? getSeedGraph();

  if (typeof window === "undefined") {
    return seed;
  }

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(GRAPH_STORAGE_KEY);
  } catch {
    return seed;
  }

  if (raw === null || raw.trim() === "") {
    return seed;
  }

  try {
    const json: unknown = JSON.parse(raw);
    const validated = parsePersistedGraph(json);

    if (!validated) {
      clearGraphStorage();
      saveGraphToStorage(seed);
      return seed;
    }

    return validated;
  } catch {
    // JSON.parse threw or storage threw — Zod reset path.
    clearGraphStorage();
    saveGraphToStorage(seed);
    return seed;
  }
}
