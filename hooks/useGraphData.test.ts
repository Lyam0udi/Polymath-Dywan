import { describe, expect, it } from "vitest";
import { mergeGraphData } from "@/lib/merge-graph-data";
import type { MergeGraphDataShape } from "@/lib/merge-graph-data";

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
