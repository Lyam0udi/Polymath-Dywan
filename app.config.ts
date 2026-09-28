export const APP_CONFIG = {
  metadata: {
    title: "Polymath Dywan",
    version: "1.0.0",
    seedTopic: "Artificial Intelligence",
  },
  ui: {
    colors: {
      mastered: "#10B981", // Emerald-500
      foggy: "#475569", // Slate-600
      active: "#22D3EE", // Cyan-400
      background: "#020617", // Slate-950
    },
    sidebarWidth: "384px", // w-96
    breakpoints: {
      mobile: 768,
    },
  },
  graph: {
    nodeRelSize: 6,
    linkWidth: 1,
    particleSpeed: 0.01,
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
    expansionPrompt: `
      Generate 2-3 child nodes for concept "[CONCEPT]". 
      Return ONLY valid JSON: { "nodes": [...], "links": [...] }.
      Node status must be "foggy".
    `,
  },
  features: {
    ENABLE_SOCRATIC_GATING: true,
    ENABLE_INFINITE_EXPANSION: true,
    PERSISTENCE_STRATEGY: "localStorage" as const,
    SAFETY_VALVE_ATTEMPTS: 2,
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
