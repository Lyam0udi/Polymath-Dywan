"use client";

/**
 * Socratic mentor chat sidebar — scaffold.
 * Wire-up: Vercel AI SDK useChat → POST /api/mentor; mastery → /api/expand.
 */

export interface MentorChatPanelProps {
  /** Currently selected graph node id, if any. */
  activeNodeId?: string | null;
  /** Display label for the active concept. */
  activeNodeLabel?: string | null;
}

export function MentorChatPanel({
  activeNodeId = null,
  activeNodeLabel = null,
}: MentorChatPanelProps) {
  return (
    <aside
      className="flex h-full flex-col border-l border-slate-800 bg-slate-950 text-slate-200"
      aria-label="Socratic mentor chat"
      data-active-node={activeNodeId ?? undefined}
    >
      <header className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-medium tracking-wide text-slate-100">
          Mentor
        </h2>
        <p className="mt-1 truncate text-xs text-slate-500">
          {activeNodeLabel ?? "Select a node to begin"}
        </p>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-slate-600">
        Chat scaffold — awaiting mentor stream
      </div>
    </aside>
  );
}

export default MentorChatPanel;
