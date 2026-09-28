/**
 * AI prompt re-exports — APP_CONFIG is the single source of truth.
 * Do not duplicate or fork prompt text here.
 *
 * - `socraticPrompt` → system message for POST `/api/mentor`
 *   (forbids direct answers; one probing question; [MASTERED] / [REVEALED]).
 * - `expansionPrompt` → JSON generation for POST `/api/expand`.
 */

import { APP_CONFIG } from "@/app.config";

export const socraticPrompt = APP_CONFIG.ai.socraticPrompt;
export const expansionPrompt = APP_CONFIG.ai.expansionPrompt;
