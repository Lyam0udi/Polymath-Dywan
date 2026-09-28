import type { Config } from "tailwindcss";

/**
 * Content scan paths for App Router + shared UI.
 * Theme tokens also live in app/globals.css (@theme) for Tailwind v4;
 * this file remains the SSOT for content globs and Inter typography.
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
        mastered: "#10B981",
        foggy: "#475569",
        active: "#22D3EE",
        background: "#020617",
      },
      width: {
        sidebar: "384px",
      },
      screens: {
        mobile: "768px",
      },
    },
  },
  plugins: [],
};

export default config;
