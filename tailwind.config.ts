import type { Config } from "tailwindcss";
import { APP_CONFIG } from "./app.config";

/**
 * Tailwind theme SSOT for production scan + design tokens.
 *
 * Production purge (Tailwind v4 automatic content detection / JIT):
 * - `content` globs below restrict class discovery to App Router + UI components.
 * - hooks/, lib/, data/, and tests are intentionally excluded so unused utilities
 *   never ship in the production CSS bundle.
 * - Runtime CSS variables also live in `app/globals.css` `@theme` — keep hex
 *   values identical (Zero Drift). Prefer importing APP_CONFIG here for status
 *   / layout tokens rather than re-typing them.
 *
 * Design layer (Deterministic Design System) → utility map:
 *   Status-Mastered / Foggy / Active / Surface-Core → mastered, foggy, active, background
 *   Surface-Elevated, Border-Subtle, Text-*, Accent-Action → matching kebab keys
 *   sidebarWidth 384px → spacing/width sidebar; breakpoints.mobile → screens.mobile
 */
const { colors, sidebarWidth, breakpoints } = APP_CONFIG.ui;

/** Design-system tokens not mirrored on APP_CONFIG.ui.colors (chrome / type / accent). */
const DESIGN_LAYER = {
  surfaceElevated: "#0f172a", // Surface-Elevated — Slate-900
  borderSubtle: "#1e293b", // Border-Subtle — Slate-800
  textHighContrast: "#f8fafc", // Text-High-Contrast — Slate-50
  textMuted: "#94a3b8", // Text-Muted — Slate-400
  accentAction: "#6366f1", // Accent-Action — Indigo-500
} as const;

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        /** Design layer: Primary Typeface — Inter */
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        /* APP_CONFIG.ui.colors / Status-* + Surface-Core (Zero Drift) */
        mastered: colors.mastered,
        foggy: colors.foggy,
        active: colors.active,
        background: colors.background,
        "surface-core": colors.background,

        /* Remaining Deterministic Design System tokens */
        "surface-elevated": DESIGN_LAYER.surfaceElevated,
        "border-subtle": DESIGN_LAYER.borderSubtle,
        "text-high-contrast": DESIGN_LAYER.textHighContrast,
        "text-muted": DESIGN_LAYER.textMuted,
        "accent-action": DESIGN_LAYER.accentAction,
      },
      spacing: {
        /** Mentor panel / sidebar width (APP_CONFIG.ui.sidebarWidth) */
        sidebar: sidebarWidth,
      },
      width: {
        sidebar: sidebarWidth,
      },
      minWidth: {
        sidebar: sidebarWidth,
      },
      maxWidth: {
        sidebar: sidebarWidth,
      },
      screens: {
        /** APP_CONFIG.ui.breakpoints.mobile */
        mobile: `${breakpoints.mobile}px`,
      },
    },
  },
  plugins: [],
};

export default config;
