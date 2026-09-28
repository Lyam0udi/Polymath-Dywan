import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { APP_CONFIG } from "@/app.config";
import {
  GRAPH_STORAGE_KEY,
  clearGraphStorage,
  enforceGraphIntegrity,
  getSeedGraph,
  graphDataSchema,
  loadGraphFromStorage,
  saveGraphToStorage,
} from "./local-storage";

/**
 * Vitest coverage for `lib/persistence/local-storage` — Zod validation,
 * Graph Integrity sanitization, and the edge_cases_security corrupt-storage
 * reset path (fail closed to seed, never crash).
 */

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

describe("lib/persistence/local-storage", () => {
  describe("graphDataSchema — success", () => {
    it("accepts a valid GraphData payload", () => {
      const payload = {
        nodes: [
          { id: "root", label: "Artificial Intelligence", status: "active" },
          { id: "child", label: "Neural Nets", status: "foggy" },
        ],
        links: [{ source: "root", target: "child" }],
      };

      const parsed = graphDataSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.nodes).toHaveLength(2);
        expect(parsed.data.links[0]).toEqual({
          source: "root",
          target: "child",
        });
      }
    });
  });

  describe("graphDataSchema — failure / edge", () => {
    it("rejects corrupted payloads (missing fields, bad status, wrong types)", () => {
      // Client-Side Data Integrity (edge_cases_security): manually edited /
      // corrupt local JSON must fail Zod rather than hydrate into the UI.
      expect(graphDataSchema.safeParse(null).success).toBe(false);
      expect(graphDataSchema.safeParse({}).success).toBe(false);
      expect(
        graphDataSchema.safeParse({
          nodes: [{ id: "x", label: "X", status: "unlocked" }],
          links: [],
        }).success,
      ).toBe(false);
      expect(
        graphDataSchema.safeParse({
          nodes: [{ id: "", label: "blank-id", status: "foggy" }],
          links: [],
        }).success,
      ).toBe(false);
      expect(
        graphDataSchema.safeParse({
          nodes: "not-an-array",
          links: [],
        }).success,
      ).toBe(false);
    });
  });

  describe("enforceGraphIntegrity — success and edge branches", () => {
    it("keeps valid nodes/links and trims whitespace", () => {
      const result = enforceGraphIntegrity({
        nodes: [
          { id: " root ", label: "  AI  ", status: "active" },
          { id: "child", label: "Child", status: "foggy" },
        ],
        links: [{ source: " root ", target: "child" }],
      });

      expect(result.nodes).toEqual([
        { id: "root", label: "AI", status: "active" },
        { id: "child", label: "Child", status: "foggy" },
      ]);
      expect(result.links).toEqual([{ source: "root", target: "child" }]);
    });

    it("drops orphan, self-referential, blank, and duplicate links", () => {
      const result = enforceGraphIntegrity({
        nodes: [
          { id: "a", label: "A", status: "active" },
          { id: "b", label: "B", status: "foggy" },
        ],
        links: [
          { source: "a", target: "missing" },
          { source: "a", target: "a" },
          { source: "", target: "b" },
          { source: "a", target: "b" },
          { source: "a", target: "b" },
        ],
      });

      expect(result.links).toEqual([{ source: "a", target: "b" }]);
      expect(result.nodes).toHaveLength(2);
    });
  });

  describe("getSeedGraph", () => {
    it("returns the compile-time seed with Graph Integrity applied", () => {
      const seed = getSeedGraph();
      expect(seed.nodes.length).toBeGreaterThan(0);
      expect(seed.nodes[0]?.label).toBe(APP_CONFIG.metadata.seedTopic);
      expect(seed.nodes.every((n) => n.id.length > 0)).toBe(true);
      expect(
        seed.links.every(
          (l) =>
            seed.nodes.some((n) => n.id === l.source) &&
            seed.nodes.some((n) => n.id === l.target),
        ),
      ).toBe(true);
    });
  });

  describe("loadGraphFromStorage / saveGraphToStorage — with localStorage", () => {
    beforeEach(() => {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        writable: true,
        value: { localStorage: createMemoryLocalStorage() },
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(globalThis, "window");
    });

    it("hydrates a previously saved valid graph (success path)", () => {
      const graph = {
        nodes: [
          { id: "root", label: "Artificial Intelligence", status: "active" as const },
          { id: "ml", label: "Machine Learning", status: "foggy" as const },
        ],
        links: [{ source: "root", target: "ml" }],
      };

      saveGraphToStorage(graph);
      const raw = window.localStorage.getItem(GRAPH_STORAGE_KEY);
      expect(raw).not.toBeNull();

      const loaded = loadGraphFromStorage();
      expect(loaded).toEqual(graph);
    });

    it("resets to seed when stored JSON fails Zod (corrupt storage edge)", () => {
      // edge_cases_security: corrupt / manually edited local JSON → clear key
      // and fail closed to seed instead of crashing.
      window.localStorage.setItem(
        GRAPH_STORAGE_KEY,
        JSON.stringify({
          nodes: [{ id: "hack", label: "Evil", status: "not-a-status" }],
          links: [],
        }),
      );

      const loaded = loadGraphFromStorage();
      const seed = getSeedGraph();

      expect(loaded).toEqual(seed);
      const rewritten = window.localStorage.getItem(GRAPH_STORAGE_KEY);
      expect(rewritten).not.toBeNull();
      expect(JSON.parse(rewritten!)).toEqual(seed);
    });

    it("resets to seed when stored value is invalid JSON", () => {
      window.localStorage.setItem(GRAPH_STORAGE_KEY, "{not-json");

      const loaded = loadGraphFromStorage();
      expect(loaded).toEqual(getSeedGraph());
    });

    it("returns seed when the storage key is missing or blank", () => {
      expect(loadGraphFromStorage()).toEqual(getSeedGraph());

      window.localStorage.setItem(GRAPH_STORAGE_KEY, "   ");
      expect(loadGraphFromStorage()).toEqual(getSeedGraph());
    });

    it("clearGraphStorage removes the graph key", () => {
      saveGraphToStorage(getSeedGraph());
      expect(window.localStorage.getItem(GRAPH_STORAGE_KEY)).not.toBeNull();

      clearGraphStorage();
      expect(window.localStorage.getItem(GRAPH_STORAGE_KEY)).toBeNull();
    });
  });
});
