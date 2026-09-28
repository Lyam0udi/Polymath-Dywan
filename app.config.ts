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
      /** Mastered nodes — Emerald-500 */
      mastered: "#10B981",
      /** Locked / unexplored nodes — Slate-600 */
      foggy: "#475569",
      /** Currently selected node — Cyan-400 */
      active: "#22D3EE",
      /** WebGL canvas clear color + universe backdrop — Slate-950 */
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
    /** Used by POST `/api/expand` with EXPANSION_MODEL; `[CONCEPT]` is substituted at request time. */
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
