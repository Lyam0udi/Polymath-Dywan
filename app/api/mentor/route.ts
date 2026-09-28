import { openai } from "@ai-sdk/openai";
import { streamText, type Message } from "ai";
import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/app.config";
import { socraticPrompt } from "@/lib/ai/prompts";
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

  const model =
    process.env.DEFAULT_MODEL?.trim() || APP_CONFIG.env.DEFAULT_MODEL;

  const system = `${socraticPrompt.trim()}

Active concept under discussion: "${activeNode.label}" (id: ${activeNode.id}).
Focus all Socratic inquiry on this concept.`;

  const result = streamText({
    model: openai(model),
    system,
    messages,
  });

  return createMentorStreamResponse(result);
}
