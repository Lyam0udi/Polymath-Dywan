/**
 * Production flow verification: seed input (Landing) → localStorage graph →
 * `/api/expand` payload contract. Complements the live smoke against a running
 * server with production env vars (`OPENAI_API_KEY`, `EXPANSION_MODEL`, …).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  APP_CONFIG,
  GRAPH_EXPAND_ENDPOINT,
  buildUniverseHref,
} from "@/app.config";
import {
  ROOT_NODE_ID,
  buildSeedGraph,
  seedUniverseFromLanding,
} from "@/lib/seed-universe";
import {
  GRAPH_STORAGE_KEY,
  loadGraphFromStorage,
} from "@/lib/persistence/local-storage";
import { sanitizeAiGraphData } from "@/lib/utils";

function createMemoryLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

describe("seed input → 3D graph state (Landing handoff)", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: createMemoryLocalStorage(),
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: globalThis.localStorage },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "localStorage");
  });

  it("seedUniverseFromLanding initializes a single active root for the topic", () => {
    const topic = "Quantum Computing";
    const seeded = seedUniverseFromLanding(topic);

    expect(seeded.nodes).toHaveLength(1);
    expect(seeded.nodes[0]).toEqual({
      id: ROOT_NODE_ID,
      label: topic,
      status: "active",
    });
    expect(seeded.links).toEqual([]);

    const raw = globalThis.localStorage.getItem(GRAPH_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual(seeded);

    // UniverseProvider / canvas hydrate from the same key.
    expect(loadGraphFromStorage(buildSeedGraph(topic))).toEqual(seeded);
  });

  it("replaces a prior graph so a new seed always wins", () => {
    seedUniverseFromLanding("Old Domain");
    const next = seedUniverseFromLanding("Stoicism");

    expect(loadGraphFromStorage()).toEqual(next);
    expect(next.nodes[0]?.label).toBe("Stoicism");
  });

  it("buildUniverseHref carries the seed into /universe for Provider hydration", () => {
    expect(buildUniverseHref("Neural Networks")).toBe(
      "/universe?seed=Neural+Networks",
    );
    expect(buildUniverseHref("")).toBe(
      `/universe?seed=${encodeURIComponent(APP_CONFIG.metadata.seedTopic).replace(/%20/g, "+")}`,
    );
  });
});

describe("Expansion API payload contract (POST /api/expand)", () => {
  it("exposes the production expand endpoint constant", () => {
    expect(GRAPH_EXPAND_ENDPOINT).toBe("/api/expand");
  });

  it("sanitizes a valid expand JSON payload into foggy child nodes", () => {
    const parent = { id: ROOT_NODE_ID, label: "Artificial Intelligence" };
    const llmPayload = {
      nodes: [
        { id: "ml", label: "Machine Learning", status: "foggy" },
        { id: "ethics", label: "AI Ethics", status: "active" },
      ],
      links: [
        { source: ROOT_NODE_ID, target: "ml" },
        { source: ROOT_NODE_ID, target: "ethics" },
      ],
    };

    const graph = sanitizeAiGraphData(llmPayload, {
      parentNode: parent,
      forceFoggy: true,
    });

    expect(graph.nodes.length).toBeGreaterThanOrEqual(1);
    expect(graph.nodes.every((node) => node.status === "foggy")).toBe(true);
    expect(
      graph.links.every(
        (link) =>
          graph.nodes.some((n) => n.id === link.target) ||
          link.source === parent.id,
      ),
    ).toBe(true);
  });

  it("never crashes on bad expand JSON — returns one foggy fallback child", () => {
    const parent = { id: ROOT_NODE_ID, label: "Stoicism" };
    const graph = sanitizeAiGraphData("not-json{{{", {
      parentNode: parent,
      forceFoggy: true,
    });

    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0]?.status).toBe("foggy");
    expect(graph.links).toEqual([
      { source: ROOT_NODE_ID, target: graph.nodes[0]!.id },
    ]);
  });
});
