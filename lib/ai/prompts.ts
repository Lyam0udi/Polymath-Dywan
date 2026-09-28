/**
 * AI prompt re-exports — APP_CONFIG is the single source of truth.
 * Do not duplicate or fork prompt text here.
 */

import { APP_CONFIG } from "@/app.config";

export const socraticPrompt = APP_CONFIG.ai.socraticPrompt;
export const expansionPrompt = APP_CONFIG.ai.expansionPrompt;
