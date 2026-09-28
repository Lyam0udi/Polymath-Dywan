"use client";

import { useCallback, useRef, useState } from "react";
import { APP_CONFIG } from "@/app.config";
import {
  useUniverseStore,
  type GraphNode,
  type NodeStatus,
} from "@/components/UniverseProvider";
import {
  MASTERED_TOKEN,
  REVEALED_TOKEN,
  detectMentorStreamToken,
  type MentorStreamToken,
} from "@/lib/ai/stream-handler";

/** Re-export stream tokens for panel / page consumers. */
export { MASTERED_TOKEN, REVEALED_TOKEN };

export type SocraticToken = MentorStreamToken;

export interface SocraticLogicState {
  /** Failed user responses toward the safety valve. */
  failedAttempts: number;
  /** True once failedAttempts >= SAFETY_VALVE_ATTEMPTS or [REVEALED] arrives. */
  revealAvailable: boolean;
  /** Last detected mentor token, if any. */
  lastToken: SocraticToken | null;
  /** True after [REVEALED] was applied for the current node session. */
  wasRevealed: boolean;
}

export interface UseSocraticLogicResult extends SocraticLogicState {
  /** Scan mentor text for [MASTERED] / [REVEALED]. Prefer MASTERED when both appear. */
  detectToken: (text: string) => SocraticToken | null;
  /**
   * Parse accumulated mentor stream text.
   * [MASTERED] → node status `mastered` via useUniverseStore (localStorage path).
   * [REVEALED] → opens safety valve (revealAvailable).
   */
  processStream: (
    text: string,
    nodeId?: string | null,
  ) => SocraticToken | null;
  /** Increment failed-attempt counter; unlocks Reveal at SAFETY_VALVE_ATTEMPTS. */
  recordFailure: () => void;
  /** Reset attempt counter and last token (e.g. on node change). */
  reset: () => void;
  /** Mark a node mastered through the universe store (Graph Integrity preserved). */
  markMastered: (nodeId?: string | null) => void;
}

const INITIAL_STATE: SocraticLogicState = {
  failedAttempts: 0,
  revealAvailable: false,
  lastToken: null,
  wasRevealed: false,
};

/**
 * Socratic mentor token parser + safety valve.
 * Detects [MASTERED] / [REVEALED] in streamed mentor text and syncs node status
 * through `useUniverseStore` (PERSISTENCE_STRATEGY: localStorage).
 */
export function useSocraticLogic(): UseSocraticLogicResult {
  const { setGraphData, selectedNodeId } = useUniverseStore();
  const safetyValve = APP_CONFIG.features.SAFETY_VALVE_ATTEMPTS;

  const [state, setState] = useState<SocraticLogicState>(INITIAL_STATE);
  /** Prevents re-applying the same token while the stream keeps accumulating. */
  const appliedKeyRef = useRef<string | null>(null);

  const setNodeStatus = useCallback(
    (nodeId: string, status: NodeStatus) => {
      setGraphData((prev) => {
        const exists = prev.nodes.some((n) => n.id === nodeId);
        if (!exists) return prev;

        const nodes: GraphNode[] = prev.nodes.map((node) =>
          node.id === nodeId ? { ...node, status } : node,
        );

        // Graph Integrity: links unchanged; only status mutates.
        return { nodes, links: prev.links };
      });
    },
    [setGraphData],
  );

  const markMastered = useCallback(
    (nodeId?: string | null) => {
      const targetId = nodeId ?? selectedNodeId;
      if (!targetId) return;
      setNodeStatus(targetId, "mastered");
      setState((prev) => ({
        ...prev,
        lastToken: MASTERED_TOKEN,
      }));
    },
    [selectedNodeId, setNodeStatus],
  );

  const detectToken = useCallback((text: string): SocraticToken | null => {
    return detectMentorStreamToken(text);
  }, []);

  const processStream = useCallback(
    (text: string, nodeId?: string | null): SocraticToken | null => {
      const token = detectMentorStreamToken(text);
      if (!token) return null;

      const targetId = nodeId ?? selectedNodeId;
      const applyKey = `${targetId ?? "none"}:${token}`;

      // Idempotent while the same stream keeps growing past the token.
      if (appliedKeyRef.current === applyKey) {
        return token;
      }
      appliedKeyRef.current = applyKey;

      if (token === MASTERED_TOKEN) {
        if (targetId) {
          setNodeStatus(targetId, "mastered");
        }
        setState((prev) => ({
          ...prev,
          lastToken: MASTERED_TOKEN,
          // Mastery clears the failure path for this concept.
          failedAttempts: 0,
          revealAvailable: false,
          wasRevealed: false,
        }));
        return MASTERED_TOKEN;
      }

      // [REVEALED] — mentor gave the answer; open safety valve UX.
      setState((prev) => ({
        ...prev,
        lastToken: REVEALED_TOKEN,
        revealAvailable: true,
        wasRevealed: true,
        failedAttempts: Math.max(prev.failedAttempts, safetyValve),
      }));
      return REVEALED_TOKEN;
    },
    [safetyValve, selectedNodeId, setNodeStatus],
  );

  const recordFailure = useCallback(() => {
    setState((prev) => {
      const nextAttempts = Math.min(
        prev.failedAttempts + 1,
        safetyValve,
      );
      const revealAvailable =
        prev.revealAvailable || nextAttempts >= safetyValve;
      return {
        ...prev,
        failedAttempts: nextAttempts,
        revealAvailable,
      };
    });
  }, [safetyValve]);

  const reset = useCallback(() => {
    appliedKeyRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  return {
    failedAttempts: state.failedAttempts,
    revealAvailable: state.revealAvailable,
    lastToken: state.lastToken,
    wasRevealed: state.wasRevealed,
    detectToken,
    processStream,
    recordFailure,
    reset,
    markMastered,
  };
}
