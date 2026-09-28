import type { Config } from "tailwindcss";

/**
 * Tailwind theme SSOT for production purge + design tokens.
 * Values mirror APP_CONFIG.ui and the Deterministic Design System.
 * Content globs limit generated utilities to app/ + components/ only
 * (no unused overhead from hooks/, lib/, data/, etc.).
 *
 * Runtime CSS variables also live in app/globals.css `@theme` (Tailwind v4);
 * keep both in sync for Zero Drift.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        /* APP_CONFIG.ui.colors / Status-* */
        mastered: "#10b981", // Status-Mastered — Emerald-500
        foggy: "#475569", // Status-Foggy — Slate-600
        active: "#22d3ee", // Status-Active — Cyan-400
        background: "#020617", // Surface-Core alias — Slate-950

        /* Surfaces & chrome */
        "surface-core": "#020617", // Surface-Core — Slate-950
        "surface-elevated": "#0f172a", // Surface-Elevated — Slate-900
        "border-subtle": "#1e293b", // Border-Subtle — Slate-800

        /* Text */
        "text-high-contrast": "#f8fafc", // Text-High-Contrast — Slate-50
        "text-muted": "#94a3b8", // Text-Muted — Slate-400

        /* Accent */
        "accent-action": "#6366f1", // Accent-Action — Indigo-500
      },
      spacing: {
        /** Mentor panel / sidebar width (APP_CONFIG.ui.sidebarWidth) */
        sidebar: "384px",
      },
      width: {
        /** Alias for w-sidebar → 384px */
        sidebar: "384px",
      },
      minWidth: {
        sidebar: "384px",
      },
      maxWidth: {
        sidebar: "384px",
      },
      screens: {
        /** APP_CONFIG.ui.breakpoints.mobile */
        mobile: "768px",
      },
    },
  },
  plugins: [],
};

export default config;
