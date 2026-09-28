import { describe, expect, it } from "vitest";
import {
  APP_CONFIG,
  GRAPH_EXPAND_ENDPOINT,
  STATUS_COLOR_TOKENS,
  resolveStatusColor,
  shouldTriggerExpansionOnMastery,
} from "@/app.config";
import {
  forceExpansionNodesFoggy,
  mergeGraphData,
  type MergeGraphDataShape,
} from "@/lib/merge-graph-data";

describe("mergeGraphData", () => {
  const base: MergeGraphDataShape = {
    nodes: [{ id: "root", label: "AI", status: "mastered" }],
    links: [],
  };

  it("merges 2-3 foggy children with integrity-checked links", () => {
    const result = mergeGraphData(base, {
      nodes: [
        { id: "ml", label: "Machine Learning", status: "foggy" },
        { id: "nlp", label: "NLP", status: "foggy" },
        { id: "cv", label: "Computer Vision", status: "foggy" },
      ],
      links: [
        { source: "root", target: "ml" },
        { source: "root", target: "nlp" },
        { source: "root", target: "cv" },
      ],
    });

    expect(result.addedNodeIds).toEqual(["ml", "nlp", "cv"]);
    expect(result.addedLinkCount).toBe(3);
    expect(result.graph.nodes).toHaveLength(4);
    expect(
      result.graph.nodes.filter((n) => n.status === "foggy"),
    ).toHaveLength(3);
  });

  it("rejects circular links and duplicate ids", () => {
    const withChild: MergeGraphDataShape = {
      nodes: [
        { id: "root", label: "AI", status: "mastered" },
        { id: "ml", label: "ML", status: "foggy" },
      ],
      links: [{ source: "root", target: "ml" }],
    };

    const result = mergeGraphData(withChild, {
      nodes: [
        { id: "ml", label: "dup", status: "foggy" },
        { id: "dl", label: "Deep Learning", status: "foggy" },
      ],
      links: [
        { source: "ml", target: "root" },
        { source: "ml", target: "dl" },
      ],
    });

    expect(result.skippedNodeIds).toContain("ml");
    expect(result.addedNodeIds).toEqual(["dl"]);
    expect(result.skippedLinkCount).toBeGreaterThanOrEqual(1);
    expect(
      result.graph.links.some((l) => l.source === "ml" && l.target === "root"),
    ).toBe(false);
  });
});

describe("DoD — Semantic Expansion & Local Persistence", () => {
  it("maps mastered status to Status-Mastered color property (#10b981)", () => {
    expect(resolveStatusColor("mastered")).toBe("#10b981");
    expect(resolveStatusColor("mastered")).toBe(
      APP_CONFIG.ui.colors.mastered,
    );
    expect(resolveStatusColor("mastered")).toBe(STATUS_COLOR_TOKENS.mastered);
  });

  it("maps foggy status to Status-Foggy (#475569) for expansion children", () => {
    expect(resolveStatusColor("foggy")).toBe("#475569");
    expect(resolveStatusColor("foggy")).toBe(APP_CONFIG.ui.colors.foggy);
  });

  it("gates mastery→expand fetch on ENABLE_INFINITE_EXPANSION → /api/expand", () => {
    expect(shouldTriggerExpansionOnMastery()).toBe(true);
    expect(GRAPH_EXPAND_ENDPOINT).toBe("/api/expand");
    expect(APP_CONFIG.features.ENABLE_INFINITE_EXPANSION).toBe(true);
  });

  it("forceExpansionNodesFoggy initializes new nodes with foggy status", () => {
    const forced = forceExpansionNodesFoggy({
      nodes: [
        { id: "a", label: "A", status: "mastered" },
        { id: "b", label: "B", status: "active" },
      ],
      links: [{ source: "root", target: "a" }],
    });

    expect(forced.nodes?.every((n) => n.status === "foggy")).toBe(true);
    expect(
      forced.nodes?.map((n) => resolveStatusColor(n.status)),
    ).toEqual(["#475569", "#475569"]);
  });
});
