/**
 * Shared application configuration — single source of truth for UI,
 * 3D graph engine, feature toggles, env defaults, and AI prompts.
 */

export interface AppConfigMetadata {
  title: string;
  version: string;
  seedTopic: string;
}

export interface AppConfigUiColors {
  mastered: string;
  foggy: string;
  active: string;
  background: string;
}

export interface AppConfigUi {
  colors: AppConfigUiColors;
  sidebarWidth: string;
  breakpoints: {
    mobile: number;
  };
}

export interface AppConfigGraph {
  nodeRelSize: number;
  linkWidth: number;
  particleSpeed: number;
  initialDistance: number;
}

export interface AppConfigAi {
  socraticPrompt: string;
  expansionPrompt: string;
}

export interface AppConfigFeatures {
  ENABLE_SOCRATIC_GATING: boolean;
  ENABLE_INFINITE_EXPANSION: boolean;
  PERSISTENCE_STRATEGY: "localStorage";
  SAFETY_VALVE_ATTEMPTS: number;
}

/** Documented env contract defaults (values resolved at runtime from process.env). */
export interface AppConfigEnvDefaults {
  OPENAI_API_KEY: string;
  NEXT_PUBLIC_APP_URL: string;
  DEFAULT_MODEL: string;
  EXPANSION_MODEL: string;
}

export interface AppConfig {
  metadata: AppConfigMetadata;
  ui: AppConfigUi;
  graph: AppConfigGraph;
  ai: AppConfigAi;
  features: AppConfigFeatures;
  env: AppConfigEnvDefaults;
}

export const APP_CONFIG: AppConfig = {
  metadata: {
    title: "Polymath Dywan",
    version: "1.0.0",
    seedTopic: "Artificial Intelligence",
  },
  ui: {
    colors: {
      /**
       * Status-Mastered — Emerald-500.
       * When a node status becomes `mastered`, its resolved color property is this token.
       */
      mastered: "#10b981",
      /**
       * Status-Foggy — Slate-600.
       * Expansion children from `/api/expand` initialize with status `foggy` → this color.
       */
      foggy: "#475569",
      /** Status-Active — Cyan-400 (currently selected node). */
      active: "#22d3ee",
      /** Surface-Core — Slate-950 (WebGL clear + universe backdrop). */
      background: "#020617",
    },
    sidebarWidth: "384px", // w-96
    breakpoints: {
      mobile: 768,
    },
  },
  graph: {
    /** Relative node sphere radius for react-force-graph-3d */
    nodeRelSize: 6,
    /** Edge stroke width in the 3D graph */
    linkWidth: 1,
    /** Directional particle travel speed along links */
    particleSpeed: 0.01,
    /** Initial camera Z distance after canvas mount */
    initialDistance: 100,
  },
  ai: {
    socraticPrompt: `
      You are a Socratic mentor. 
      Rules:
      1. Never give direct answers.
      2. Ask one probing question at a time.
      3. Validate logic and output [MASTERED] only upon conceptual clarity.
      4. If user fails twice, use the [REVEALED] token and provide the answer.
    `,
    /**
     * Used by POST `/api/expand` with EXPANSION_MODEL; `[CONCEPT]` is substituted at request time.
     * Mastery (`[MASTERED]` → status `mastered` / Status-Mastered) auto-triggers this flow
     * when `features.ENABLE_INFINITE_EXPANSION` is true.
     */
    expansionPrompt: `
      Generate 2-3 child nodes for concept "[CONCEPT]".
      Return ONLY valid JSON: { "nodes": [...], "links": [...] }.
      Each node must be { "id": string, "label": string, "status": "foggy" }.
      Each link must be { "source": parentConceptId, "target": childNodeId }.
      Node status must be "foggy".
    `,
  },
  features: {
    ENABLE_SOCRATIC_GATING: true,
    /** Mastered nodes without children → automatic fetch to `/api/expand`. */
    ENABLE_INFINITE_EXPANSION: true,
    PERSISTENCE_STRATEGY: "localStorage",
    SAFETY_VALVE_ATTEMPTS: 2,
  },
  env: {
    // Placeholder only — real key must live in .env.local (never commit).
    OPENAI_API_KEY: "",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    DEFAULT_MODEL: "gpt-4o-mini",
    EXPANSION_MODEL: "gpt-4o",
  },
};

/**
 * Design-system status color tokens (Zero Drift).
 * Canvas / panel resolve node color from status via these APP_CONFIG values.
 */
export const STATUS_COLOR_TOKENS = {
  /** Status-Mastered (#10b981) — mastered node color property. */
  mastered: APP_CONFIG.ui.colors.mastered,
  /** Status-Foggy (#475569) — locked / newly expanded children. */
  foggy: APP_CONFIG.ui.colors.foggy,
  /** Status-Active (#22d3ee) — selection highlight. */
  active: APP_CONFIG.ui.colors.active,
} as const;

/** Semantic expansion endpoint triggered on mastery when infinite expansion is enabled. */
export const GRAPH_EXPAND_ENDPOINT = "/api/expand" as const;

/** Node lifecycle statuses that map to Status-* color tokens. */
export type StatusColorKey = "foggy" | "mastered" | "active";

/**
 * Resolve the Zero Drift color property for a node status.
 * - `mastered` → Status-Mastered (#10b981)
 * - `foggy` → Status-Foggy (#475569)
 * - `active` → Status-Active (#22d3ee)
 */
export function resolveStatusColor(status: StatusColorKey): string {
  if (status === "mastered") {
    return STATUS_COLOR_TOKENS.mastered;
  }
  if (status === "active") {
    return STATUS_COLOR_TOKENS.active;
  }
  return STATUS_COLOR_TOKENS.foggy;
}

/**
 * True when mastery should auto-trigger POST `/api/expand`
 * (`APP_CONFIG.features.ENABLE_INFINITE_EXPANSION`).
 */
export function shouldTriggerExpansionOnMastery(): boolean {
  return APP_CONFIG.features.ENABLE_INFINITE_EXPANSION === true;
}

/** Query param used when the Landing View hands the seed topic to `/universe`. */
export const UNIVERSE_SEED_QUERY_PARAM = "seed" as const;

/**
 * Builds the `/universe` href with the user's seed topic in the query string.
 * Falls back to `APP_CONFIG.metadata.seedTopic` when the input is blank.
 */
export function buildUniverseHref(seedTopic: string): string {
  const topic = seedTopic.trim() || APP_CONFIG.metadata.seedTopic;
  const params = new URLSearchParams({
    [UNIVERSE_SEED_QUERY_PARAM]: topic,
  });
  return `/universe?${params.toString()}`;
}
