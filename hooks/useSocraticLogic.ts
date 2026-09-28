"use client";

import { APP_CONFIG } from "@/app.config";

/** Tokens emitted by the Socratic mentor stream. */
export const MASTERED_TOKEN = "[MASTERED]" as const;
export const REVEALED_TOKEN = "[REVEALED]" as const;

export type SocraticToken = typeof MASTERED_TOKEN | typeof REVEALED_TOKEN;

export interface SocraticLogicState {
  /** Failed user responses toward the safety valve. */
  failedAttempts: number;
  /** True once failedAttempts >= SAFETY_VALVE_ATTEMPTS. */
  revealAvailable: boolean;
  /** Last detected mentor token, if any. */
  lastToken: SocraticToken | null;
}

export interface UseSocraticLogicResult extends SocraticLogicState {
  /** Scan mentor text for [MASTERED] / [REVEALED]. */
  detectToken: (text: string) => SocraticToken | null;
  /** Increment failed-attempt counter (capped by safety valve). */
  recordFailure: () => void;
  /** Reset attempt counter and last token (e.g. on node change). */
  reset: () => void;
}

const INITIAL_STATE: SocraticLogicState = {
  failedAttempts: 0,
  revealAvailable: false,
  lastToken: null,
};

/**
 * Scaffold hook for Socratic token detection and reveal gating.
 * Full wire-up (useChat + expand) lands in a later step.
 */
export function useSocraticLogic(): UseSocraticLogicResult {
  // Scaffold: stateful implementation deferred — return stable defaults.
  const safetyValve = APP_CONFIG.features.SAFETY_VALVE_ATTEMPTS;

  function detectToken(text: string): SocraticToken | null {
    if (text.includes(MASTERED_TOKEN)) return MASTERED_TOKEN;
    if (text.includes(REVEALED_TOKEN)) return REVEALED_TOKEN;
    return null;
  }

  function recordFailure(): void {
    // no-op scaffold
    void safetyValve;
  }

  function reset(): void {
    // no-op scaffold
  }

  return {
    ...INITIAL_STATE,
    detectToken,
    recordFailure,
    reset,
  };
}
