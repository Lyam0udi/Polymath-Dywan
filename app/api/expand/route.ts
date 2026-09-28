import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { APP_CONFIG } from "@/app.config";
import { expansionPrompt } from "@/lib/ai/prompts";
import { sanitizeAiGraphData } from "@/lib/utils";

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
  nodes: z.array(graphNodeSchema).min(1).max(3),
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

function fillExpansionPrompt(conceptLabel: string): string {
  return expansionPrompt.replaceAll("[CONCEPT]", conceptLabel);
}

/**
 * POST /api/expand — semantic child-node generation via Vercel AI SDK.
 * Contract: `{ parentNode }` → GraphData JSON `{ nodes, links }`.
 * System instruction: `APP_CONFIG.ai.expansionPrompt` (via prompts re-export).
 * Model: `EXPANSION_MODEL` from env, defaulting to `APP_CONFIG.env.EXPANSION_MODEL` (gpt-4o).
 * Output is always passed through `sanitizeAiGraphData` before the response.
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

  const parent = {
    id: parentNode.id.trim(),
    label: parentNode.label.trim(),
  };

  const model =
    process.env.EXPANSION_MODEL?.trim() || APP_CONFIG.env.EXPANSION_MODEL;

  const system = fillExpansionPrompt(parent.label);

  try {
    const { object } = await generateObject({
      model: openai(model),
      schema: graphDataSchema,
      schemaName: "GraphData",
      schemaDescription:
        "Child knowledge-graph nodes and links for semantic expansion",
      system,
      prompt: `Parent concept id: "${parent.id}". Label: "${parent.label}". Generate 2-3 foggy child nodes linked from this parent. Return ONLY the GraphData JSON object.`,
      mode: "json",
    });

    const graph = sanitizeAiGraphData(object, {
      parentNode: parent,
      forceFoggy: true,
    });
    return NextResponse.json(graph);
  } catch {
    // Never crash the client on bad LLM / parse failures — one fallback node.
    return NextResponse.json(
      sanitizeAiGraphData(null, {
        parentNode: parent,
        forceFoggy: true,
      }),
    );
  }
}
