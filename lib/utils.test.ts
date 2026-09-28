import { describe, expect, it } from "vitest";
import {
  buildAiGraphFallback,
  sanitizeAiGraphData,
  sanitizeNodeLabel,
  stripJunkLabelPrefixes,
  verifyAiGraphJson,
} from "./utils";

describe("lib/utils — AI graph sanitization", () => {
  const parent = { id: "root", label: "Artificial Intelligence" };

  it("sanitizes a valid expand payload and forces foggy status", () => {
    const result = sanitizeAiGraphData(
      {
        nodes: [
          { id: "ml", label: "Machine Learning", status: "mastered" },
          { id: "nlp", label: "NLP", status: "active" },
        ],
        links: [
          { source: "root", target: "ml" },
          { source: "root", target: "nlp" },
        ],
      },
      { parentNode: parent, forceFoggy: true },
    );

    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.every((n) => n.status === "foggy")).toBe(true);
    expect(result.links).toEqual([
      { source: "root", target: "ml" },
      { source: "root", target: "nlp" },
    ]);
  });

  it("drops orphan links and self-loops before canvas merge", () => {
    const result = sanitizeAiGraphData(
      {
        nodes: [{ id: "a", label: "A", status: "foggy" }],
        links: [
          { source: "root", target: "a" },
          { source: "a", target: "a" },
          { source: "a", target: "missing" },
        ],
      },
      { parentNode: parent },
    );

    expect(result.nodes).toEqual([{ id: "a", label: "A", status: "foggy" }]);
    expect(result.links).toEqual([{ source: "root", target: "a" }]);
  });

  it("returns one fallback foggy child when JSON is corrupt", () => {
    const result = sanitizeAiGraphData("{not-json", { parentNode: parent });
    expect(result).toEqual(buildAiGraphFallback(parent));
    expect(result.nodes[0]?.status).toBe("foggy");
    expect(result.nodes[0]?.label).not.toMatch(/related to/i);
    expect(result.nodes[0]?.label).toBe("Artificial Intelligence foundations");
  });

  it("rewrites cascading Related-to labels into concrete titles", () => {
    const result = sanitizeAiGraphData(
      {
        nodes: [
          {
            id: "junk",
            label: "Related to Related to Artificial Intelligence",
            status: "foggy",
          },
        ],
        links: [{ source: "root", target: "junk" }],
      },
      { parentNode: parent },
    );

    expect(result.nodes[0]?.label).toBe("Artificial Intelligence foundations");
    expect(result.nodes[0]?.label).not.toMatch(/related to/i);
  });

  it("verifyAiGraphJson aliases sanitizeAiGraphData", () => {
    const raw = {
      nodes: [{ id: "x", label: "X", status: "foggy" as const }],
      links: [{ source: "root", target: "x" }],
    };
    expect(verifyAiGraphJson(raw, { parentNode: parent })).toEqual(
      sanitizeAiGraphData(raw, { parentNode: parent }),
    );
  });
});

describe("sanitizeNodeLabel / stripJunkLabelPrefixes", () => {
  it("peels repeated Related-to prefixes", () => {
    expect(
      stripJunkLabelPrefixes("Related to Related to Artificial Intelligence"),
    ).toBe("Artificial Intelligence");
  });

  it("falls back to parent foundations when label is empty junk", () => {
    expect(sanitizeNodeLabel("Related to", "Machine Learning")).toBe(
      "Machine Learning foundations",
    );
  });
});
