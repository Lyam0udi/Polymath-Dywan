import { z } from "zod";
import type {
  GraphData,
  GraphLink,
  GraphNode,
  NodeStatus,
} from "@/components/UniverseProvider";

/**
 * JSON integrity helpers for AI-generated graph payloads (`/api/expand`).
 * Manifest: Graph Integrity + bad expand JSON → never crash; children stay foggy.
 */

const nodeStatusSchema = z.enum(["foggy", "mastered", "active"]);

const aiGraphNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: nodeStatusSchema.optional(),
});

const aiGraphLinkSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
});

/** Zod contract for LLM expand JSON — `{ nodes, links }` only. */
export const aiGraphDataSchema = z.object({
  nodes: z.array(aiGraphNodeSchema),
  links: z.array(aiGraphLinkSchema),
});

export type AiGraphData = z.infer<typeof aiGraphDataSchema>;

export type SanitizeAiGraphOptions = {
  /** When set, empty/invalid payloads yield one foggy child linked from this parent. */
  parentNode?: { id: string; label: string };
  /** Force every sanitized node to foggy (default true for expansion). */
  forceFoggy?: boolean;
};

/** Phrases that cascade into "Related to Related to…" junk labels. */
const JUNK_LABEL_PREFIX =
  /^(related to|aspect of|topic of|overview of|part of|about)(?:\s+|$)/i;

function normalizeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function linkKey(source: string, target: string): string {
  return `${source}\0${target}`;
}

/**
 * Strip cascading "Related to …" / vague prefixes so expand children stay concrete.
 */
export function stripJunkLabelPrefixes(label: string): string {
  let cleaned = label.trim().replace(/\s+/g, " ");
  // Peel repeated junk prefixes (Related to Related to …).
  for (let i = 0; i < 8; i += 1) {
    const next = cleaned.replace(JUNK_LABEL_PREFIX, "").trim();
    if (next === cleaned) break;
    cleaned = next;
  }
  return cleaned;
}

/**
 * Normalize an AI (or fallback) node label into a short concrete title.
 */
export function sanitizeNodeLabel(
  label: string,
  parentLabel?: string,
): string {
  let cleaned = stripJunkLabelPrefixes(label);

  const parentClean = parentLabel
    ? stripJunkLabelPrefixes(parentLabel) || "Concept"
    : "Concept";

  if (
    !cleaned ||
    /^related$/i.test(cleaned) ||
    /^foundations$/i.test(cleaned) ||
    cleaned.toLowerCase() === parentClean.toLowerCase()
  ) {
    cleaned = `${parentClean} foundations`;
  }

  // Soft cap for canvas sprites / mentor header.
  if (cleaned.length > 48) {
    cleaned = `${cleaned.slice(0, 45).trimEnd()}…`;
  }

  return cleaned;
}

/**
 * Coerce unknown input into a parseable object.
 * Accepts a JSON string or plain object; returns null on failure (never throws).
 */
export function parseAiGraphJson(raw: unknown): unknown | null {
  if (raw == null) return null;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return null;
    }
  }

  if (typeof raw === "object") {
    return raw;
  }

  return null;
}

/**
 * Single foggy child when LLM JSON is missing or fails integrity checks.
 * Manifest edge: bad expand JSON → one fallback node (never crash).
 * Label is concrete — never "Related to …" (that cascaded in expand).
 */
export function buildAiGraphFallback(parentNode: {
  id: string;
  label: string;
}): GraphData {
  const parentId = normalizeId(parentNode.id) ?? "parent";
  const parentLabel =
    typeof parentNode.label === "string" && parentNode.label.trim()
      ? parentNode.label.trim()
      : parentId;
  const childId = `${parentId}-foundations`;
  const label = sanitizeNodeLabel("foundations", parentLabel);

  return {
    nodes: [
      {
        id: childId,
        label,
        status: "foggy",
      },
    ],
    links: [{ source: parentId, target: childId }],
  };
}

/**
 * Drop links whose endpoints are missing or self-referential.
 * Dedupes edges. Optionally forces all node statuses to foggy.
 */
export function enforceAiGraphIntegrity(
  data: GraphData,
  options?: {
    forceFoggy?: boolean;
    extraKnownIds?: Iterable<string>;
    parentLabel?: string;
  },
): GraphData {
  const forceFoggy = options?.forceFoggy !== false;

  const knownIds = new Set<string>();
  for (const id of options?.extraKnownIds ?? []) {
    const normalized = normalizeId(id);
    if (normalized) knownIds.add(normalized);
  }

  const nodes: GraphNode[] = [];
  const seenNodeIds = new Set<string>();

  for (const node of data.nodes) {
    const id = normalizeId(node.id);
    if (!id || seenNodeIds.has(id)) continue;
    seenNodeIds.add(id);
    knownIds.add(id);

    const rawLabel =
      typeof node.label === "string" && node.label.trim().length > 0
        ? node.label.trim()
        : id;
    const label = sanitizeNodeLabel(rawLabel, options?.parentLabel);

    const status: NodeStatus = forceFoggy
      ? "foggy"
      : node.status === "mastered" || node.status === "active"
        ? node.status
        : "foggy";

    nodes.push({ id, label, status });
  }

  const links: GraphLink[] = [];
  const seenLinks = new Set<string>();

  for (const link of data.links) {
    const source = normalizeId(link.source);
    const target = normalizeId(link.target);
    if (!source || !target) continue;
    if (source === target) continue;
    if (!knownIds.has(source) || !knownIds.has(target)) continue;

    const key = linkKey(source, target);
    if (seenLinks.has(key)) continue;
    seenLinks.add(key);
    links.push({ source, target });
  }

  return { nodes, links };
}

/**
 * Verify + sanitize AI-generated graph JSON before merge / canvas render.
 *
 * - Parses string or object input without throwing
 * - Zod-validates `{ nodes, links }`
 * - Enforces Graph Integrity (valid endpoints, no self-loops, unique ids)
 * - Rewrites junk "Related to…" labels into concrete titles
 * - Forces child status to `foggy` by default
 * - On total failure with `parentNode`, returns one fallback foggy child
 * - On total failure without `parentNode`, returns `{ nodes: [], links: [] }`
 */
export function sanitizeAiGraphData(
  raw: unknown,
  options: SanitizeAiGraphOptions = {},
): GraphData {
  const { parentNode, forceFoggy = true } = options;
  const parsedJson = parseAiGraphJson(raw);

  if (parsedJson == null) {
    return parentNode
      ? buildAiGraphFallback(parentNode)
      : { nodes: [], links: [] };
  }

  const parsed = aiGraphDataSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return parentNode
      ? buildAiGraphFallback(parentNode)
      : { nodes: [], links: [] };
  }

  const candidate: GraphData = {
    nodes: parsed.data.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      status: (node.status ?? "foggy") as NodeStatus,
    })),
    links: parsed.data.links.map((link) => ({
      source: link.source,
      target: link.target,
    })),
  };

  const sanitized = enforceAiGraphIntegrity(candidate, {
    forceFoggy,
    extraKnownIds: parentNode ? [parentNode.id] : undefined,
    parentLabel: parentNode?.label,
  });

  if (sanitized.nodes.length === 0) {
    return parentNode
      ? buildAiGraphFallback(parentNode)
      : { nodes: [], links: [] };
  }

  // Ensure every AI child has at least one link from the parent when a parent is known.
  if (parentNode) {
    const parentId = normalizeId(parentNode.id);
    if (parentId) {
      const hasParentEdge = sanitized.links.some(
        (link) =>
          link.source === parentId &&
          sanitized.nodes.some((node) => node.id === link.target),
      );

      if (!hasParentEdge) {
        return {
          nodes: sanitized.nodes,
          links: [
            ...sanitized.links,
            ...sanitized.nodes.map((node) => ({
              source: parentId,
              target: node.id,
            })),
          ],
        };
      }
    }
  }

  return sanitized;
}

/**
 * Alias kept for call sites that want an explicit “verify” name.
 * Same behavior as {@link sanitizeAiGraphData}.
 */
export function verifyAiGraphJson(
  raw: unknown,
  options?: SanitizeAiGraphOptions,
): GraphData {
  return sanitizeAiGraphData(raw, options);
}
