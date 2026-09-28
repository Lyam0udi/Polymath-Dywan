"use client";

import { useChat } from "ai/react";
import { useEffect, useRef, type FormEvent } from "react";
import { APP_CONFIG } from "@/app.config";

export interface MentorChatPanelProps {
  /** Currently selected graph node id, if any. */
  activeNodeId?: string | null;
  /** Display label for the active concept. */
  activeNodeLabel?: string | null;
}

/**
 * Socratic mentor chat sidebar.
 * Streams replies via Vercel AI SDK `useChat` → POST `/api/mentor`.
 * Captures user reasoning against the active graph node.
 */
export function MentorChatPanel({
  activeNodeId = null,
  activeNodeLabel = null,
}: MentorChatPanelProps) {
  const hasActiveNode =
    typeof activeNodeId === "string" &&
    activeNodeId.length > 0 &&
    typeof activeNodeLabel === "string" &&
    activeNodeLabel.length > 0;

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    status,
  } = useChat({
    api: "/api/mentor",
    // Remount conversation when the selected concept changes.
    id: activeNodeId ?? "no-node",
    body: hasActiveNode
      ? {
          activeNode: {
            id: activeNodeId,
            label: activeNodeLabel,
          },
        }
      : undefined,
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const isStreaming = status === "streaming" || isLoading;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (!hasActiveNode || isStreaming || !input.trim()) {
      event.preventDefault();
      return;
    }
    handleSubmit(event);
  }

  return (
    <aside
      className="flex h-full min-h-screen flex-col border-l border-border-subtle bg-surface-elevated text-text-high-contrast"
      style={{ width: APP_CONFIG.ui.sidebarWidth }}
      aria-label="Socratic mentor chat"
      data-active-node={activeNodeId ?? undefined}
    >
      <header className="shrink-0 border-b border-border-subtle px-4 py-3">
        <h2 className="text-sm font-medium tracking-wide text-text-high-contrast">
          Mentor
        </h2>
        <p className="mt-1 truncate text-xs text-text-muted">
          {activeNodeLabel ?? "Select a node to begin"}
        </p>
      </header>

      <div
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-busy={isStreaming}
      >
        {!hasActiveNode && (
          <p className="m-auto text-center text-sm text-text-muted">
            Select a concept in the universe to start a Socratic inquiry.
          </p>
        )}

        {hasActiveNode && messages.length === 0 && !isStreaming && (
          <p className="m-auto text-center text-sm text-text-muted">
            Share how you understand{" "}
            <span className="text-active">{activeNodeLabel}</span>. The mentor
            will probe your reasoning — one question at a time.
          </p>
        )}

        {messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <div
              key={message.id}
              className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
            >
              <span className="text-[10px] uppercase tracking-wider text-text-muted">
                {isUser ? "You" : "Mentor"}
              </span>
              <div
                className={`max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? "bg-accent-action/20 text-text-high-contrast"
                    : "border border-border-subtle bg-background text-text-high-contrast"
                }`}
              >
                {message.content}
              </div>
            </div>
          );
        })}

        {isStreaming &&
          messages.at(-1)?.role !== "assistant" && (
            <div className="flex flex-col gap-1 items-start">
              <span className="text-[10px] uppercase tracking-wider text-text-muted">
                Mentor
              </span>
              <div className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm text-text-muted">
                Thinking…
              </div>
            </div>
          )}

        {error && (
          <p className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm text-foggy" role="alert">
            {error.message || "Mentor stream failed. Try again."}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="shrink-0 border-t border-border-subtle p-4"
        aria-label="Send mentor reply"
      >
        <label htmlFor="mentor-input" className="sr-only">
          Your response
        </label>
        <div className="flex gap-2">
          <input
            id="mentor-input"
            name="message"
            type="text"
            value={input}
            onChange={handleInputChange}
            disabled={!hasActiveNode || isStreaming}
            placeholder={
              hasActiveNode
                ? "Explain your reasoning…"
                : "Select a node first"
            }
            autoComplete="off"
            className="min-w-0 flex-1 rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm text-text-high-contrast outline-none transition placeholder:text-text-muted focus:border-active focus:ring-2 focus:ring-active/40 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!hasActiveNode || isStreaming || !input.trim()}
            className="shrink-0 rounded-lg bg-accent-action px-3 py-2 text-sm font-semibold text-text-high-contrast transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-active disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </aside>
  );
}

export default MentorChatPanel;
