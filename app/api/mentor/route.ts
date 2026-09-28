import { streamText, type Message } from "ai";
import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/app.config";
import { socraticPrompt } from "@/lib/ai/prompts";
import {
  missingProviderKeyError,
  resolveLanguageModel,
} from "@/lib/ai/provider";
import { createMentorStreamResponse } from "@/lib/ai/stream-handler";

/** Active graph node context for the Socratic loop. */
interface MentorActiveNode {
  id: string;
  label: string;
  status?: string;
}

interface MentorRequestBody {
  messages: Array<Omit<Message, "id"> & { id?: string }>;
  activeNode: MentorActiveNode;
}

/**
 * POST /api/mentor — stream Socratic mentor replies via Vercel AI SDK.
 * Contract: `{ messages, activeNode }` → data stream for `useChat`.
 * System message is always `socraticPrompt` from `lib/ai/prompts.ts` (APP_CONFIG SSOT).
 * Provider is inferred from `DEFAULT_MODEL` (Gemini → Google, otherwise OpenAI).
 */
export async function POST(request: Request) {
  const model =
    process.env.DEFAULT_MODEL?.trim() || APP_CONFIG.env.DEFAULT_MODEL;

  const keyError = missingProviderKeyError(model);
  if (keyError) {
    return NextResponse.json({ error: keyError }, { status: 503 });
  }

  let body: MentorRequestBody;
  try {
    body = (await request.json()) as MentorRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages, activeNode } = body;

  if (!Array.isArray(messages)) {
    return NextResponse.json(
      { error: "messages must be an array" },
      { status: 400 },
    );
  }

  if (
    !activeNode ||
    typeof activeNode.id !== "string" ||
    typeof activeNode.label !== "string" ||
    !activeNode.id.trim() ||
    !activeNode.label.trim()
  ) {
    return NextResponse.json(
      { error: "activeNode with id and label is required" },
      { status: 400 },
    );
  }

  // Sole system message: APP_CONFIG.ai.socraticPrompt via prompts re-export.
  // Includes "Never give direct answers" and mastery/reveal tokens.
  // Strip any client-sent system roles so the Socratic contract cannot be overridden.
  const system = `${socraticPrompt.trim()}

Active concept under discussion: "${activeNode.label}" (id: ${activeNode.id}).
Focus all Socratic inquiry on this concept.`;

  const conversation = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map(({ role, content }) => ({ role, content }));

  const result = streamText({
    model: resolveLanguageModel(model),
    system,
    messages: conversation,
  });

  return createMentorStreamResponse(result);
}
