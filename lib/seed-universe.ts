/**
 * Landing → Universe seed handoff (no React).
 * Used by `app/page.tsx` before navigating to `/universe`, and by tests.
 */
import { APP_CONFIG } from "@/app.config";
import {
  clearGraphStorage,
  saveGraphToStorage,
} from "@/lib/persistence/local-storage";

/** Stable id for the seed / root concept node. */
export const ROOT_NODE_ID = "root" as const;

/** Minimal graph shape for seed persistence (matches UniverseProvider GraphData). */
export interface SeedGraphData {
  nodes: Array<{
    id: string;
    label: string;
    status: "foggy" | "mastered" | "active";
  }>;
  links: Array<{ source: string; target: string }>;
}

/**
 * Builds the initial graph with a single root node derived from the seed topic.
 * Falls back to `APP_CONFIG.metadata.seedTopic` when the input is blank.
 */
export function buildSeedGraph(seedTopic?: string): SeedGraphData {
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

/**
 * Landing → Universe handoff: wipe prior graph, persist a fresh root from the
 * seed input, then navigate to `/universe`. Guarantees the 3D canvas hydrates
 * from localStorage with the topic the user just entered (PERSISTENCE_STRATEGY).
 */
export function seedUniverseFromLanding(seedTopic?: string): SeedGraphData {
  const graph = buildSeedGraph(seedTopic);
  clearGraphStorage();
  saveGraphToStorage(graph);
  return graph;
}
