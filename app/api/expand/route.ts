import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { APP_CONFIG } from "@/app.config";
import { expansionPrompt } from "@/lib/ai/prompts";

/** Graph node lifecycle — matches GraphData / UniverseProvider NodeStatus. */
const nodeStatusSchema = z.enum(["foggy", "mastered", "active"]);

const graphNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: nodeStatusSchema,
});

const graphLinkSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
});

/** Expansion payload shape — conforms to the GraphData interface. */
const graphDataSchema = z.object({
  nodes: z.array(graphNodeSchema),
  links: z.array(graphLinkSchema),
});

export type ExpandGraphData = z.infer<typeof graphDataSchema>;

/** Parent concept that mastery expands into child nodes. */
interface ExpandParentNode {
  id: string;
  label: string;
  status?: string;
}

interface ExpandRequestBody {
  parentNode: ExpandParentNode;
}

/**
 * Single foggy child when LLM output is missing or invalid.
 * Manifest edge: bad expand JSON → one fallback node (never crash).
 */
function buildFallbackExpansion(parentNode: ExpandParentNode): ExpandGraphData {
  const childId = `${parentNode.id}-related`;
  return {
    nodes: [
      {
        id: childId,
        label: `Related to ${parentNode.label}`,
        status: "foggy",
      },
    ],
    links: [
      {
        source: parentNode.id,
        target: childId,
      },
    ],
  };
}

/**
 * Coerce LLM output into GraphData: force foggy status, drop broken links,
 * ensure every child has a link from the parent when links are empty.
 */
function normalizeExpansion(
  raw: ExpandGraphData,
  parentNode: ExpandParentNode,
): ExpandGraphData {
  const nodes = raw.nodes.map((node) => ({
    ...node,
    status: "foggy" as const,
  }));

  if (nodes.length === 0) {
    return buildFallbackExpansion(parentNode);
  }

  const knownIds = new Set<string>([
    parentNode.id,
    ...nodes.map((node) => node.id),
  ]);

  let links = raw.links.filter(
    (link) => knownIds.has(link.source) && knownIds.has(link.target),
  );

  if (links.length === 0) {
    links = nodes.map((node) => ({
      source: parentNode.id,
      target: node.id,
    }));
  }

  return { nodes, links };
}

function fillExpansionPrompt(conceptLabel: string): string {
  return expansionPrompt.replaceAll("[CONCEPT]", conceptLabel);
}

/**
 * POST /api/expand — semantic child-node generation via Vercel AI SDK.
 * Contract: `{ parentNode }` → GraphData JSON `{ nodes, links }`.
 * System instruction: `APP_CONFIG.ai.expansionPrompt` (via prompts re-export).
 * Model: `EXPANSION_MODEL` from env, defaulting to `APP_CONFIG.env.EXPANSION_MODEL` (gpt-4o).
 */
export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Open Settings and set the key in .env.local.",
      },
      { status: 503 },
    );
  }

  let body: ExpandRequestBody;
  try {
    body = (await request.json()) as ExpandRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { parentNode } = body;

  if (
    !parentNode ||
    typeof parentNode.id !== "string" ||
    typeof parentNode.label !== "string" ||
    !parentNode.id.trim() ||
    !parentNode.label.trim()
  ) {
    return NextResponse.json(
      { error: "parentNode with id and label is required" },
      { status: 400 },
    );
  }

  const model =
    process.env.EXPANSION_MODEL?.trim() || APP_CONFIG.env.EXPANSION_MODEL;

  const system = fillExpansionPrompt(parentNode.label.trim());

  try {
    const { object } = await generateObject({
      model: openai(model),
      schema: graphDataSchema,
      schemaName: "GraphData",
      schemaDescription:
        "Child knowledge-graph nodes and links for semantic expansion",
      system,
      prompt: `Parent concept id: "${parentNode.id}". Label: "${parentNode.label}". Generate 2-3 foggy child nodes linked from this parent. Return ONLY the GraphData JSON object.`,
      mode: "json",
    });

    const graph = normalizeExpansion(object, parentNode);
    return NextResponse.json(graph);
  } catch {
    // Never crash the client on bad LLM / parse failures — one fallback node.
    return NextResponse.json(buildFallbackExpansion(parentNode));
  }
}
