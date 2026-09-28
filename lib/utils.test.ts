import { describe, expect, it } from "vitest";
import {
  buildAiGraphFallback,
  sanitizeAiGraphData,
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
