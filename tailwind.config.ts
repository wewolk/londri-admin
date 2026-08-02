import type { Config } from "tailwindcss";

/* Refined Glass — token source: Stitch DESIGN.md (stitch_full_prd_implementation/refined_glass)
 *
 * Two deliberate deviations from that file, both documented at the point of use:
 *   1. primary-container            #0ea5e9 -> #d3ecfb
 *   2. success / warning            darkened to clear WCAG AA at 12px
 * See the comments inline. Everything else is verbatim from DESIGN.md.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        /* ── primary · hue 198 ───────────────────────────────────── */
        primary: "#006591",
        "on-primary": "#ffffff",
        /* DESIGN.md ships #0ea5e9 here — that is Tailwind sky-500, the one
           value in the whole palette that is not derived from #006591. Used
           as a "container" (a tonal surface behind on-primary-container text)
           it fails contrast and reads brighter than `primary` itself, which
           inverts hierarchy wherever the two sit side by side. Corrected to
           the real hue-198 container tint. */
        "primary-container": "#d3ecfb",
        "on-primary-container": "#003751",
        "inverse-primary": "#89ceff",
        "surface-tint": "#006591",
        "primary-fixed": "#c9e6ff",
        "primary-fixed-dim": "#89ceff",
        "on-primary-fixed": "#001e2f",
        "on-primary-fixed-variant": "#004c6e",

        /* ── secondary ───────────────────────────────────────────── */
        secondary: "#505f76",
        "on-secondary": "#ffffff",
        "secondary-container": "#d0e1fb",
        "on-secondary-container": "#54647a",
        "secondary-fixed": "#d3e4fe",
        "secondary-fixed-dim": "#b7c8e1",
        "on-secondary-fixed": "#0b1c30",
        "on-secondary-fixed-variant": "#38485d",

        /* ── tertiary ────────────────────────────────────────────── */
        tertiary: "#5c5f61",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#999c9e",
        "on-tertiary-container": "#303436",
        "tertiary-fixed": "#e0e3e5",
        "tertiary-fixed-dim": "#c4c7c9",
        "on-tertiary-fixed": "#191c1e",
        "on-tertiary-fixed-variant": "#444749",

        /* ── status ──────────────────────────────────────────────────
           DESIGN.md: success #059669 (3.77:1) · warning #d97706 (3.19:1).
           Both fail WCAG AA 4.5:1 on white, and this app renders them at
           12px (label-md) on status chips — exactly where legibility
           matters most. Darkened one step: 5.48:1 and 5.02:1. */
        success: "#047857",
        "success-container": "#d1fae5",
        "on-success-container": "#064e3b",
        warning: "#b45309",
        "warning-container": "#fef3c7",
        "on-warning-container": "#78350f",
        error: "#dc2626",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",

        /* ── surfaces ────────────────────────────────────────────── */
        surface: "#faf8ff",
        "surface-dim": "#d4d9ef",
        "surface-bright": "#faf8ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2f3ff",
        "surface-container": "#eaedff",
        "surface-container-high": "#e2e7fd",
        "surface-container-highest": "#dde2f8",
        "surface-variant": "#dde2f8",
        "on-surface": "#151b2b",
        "on-surface-variant": "#3e4850",
        "inverse-surface": "#2a3040",
        "inverse-on-surface": "#eef0ff",
        "on-background": "#151b2b",

        outline: "#6e7881",
        "outline-variant": "#bec8d2",
        "border-subtle": "#e2e8f0",
      },

      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-jakarta)", "system-ui", "sans-serif"],
        "headline-lg": ["var(--font-display)", "system-ui", "sans-serif"],
        "headline-md": ["var(--font-display)", "system-ui", "sans-serif"],
        "data-tabular": ["var(--font-display)", "system-ui", "sans-serif"],
        "body-lg": ["var(--font-jakarta)", "system-ui", "sans-serif"],
        "body-md": ["var(--font-jakarta)", "system-ui", "sans-serif"],
        "label-md": ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },

      fontSize: {
        display: ["32px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["24px", { lineHeight: "32px", fontWeight: "700" }],
        "headline-md": ["18px", { lineHeight: "24px", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.01em", fontWeight: "500" }],
        "data-tabular": ["14px", { lineHeight: "20px", fontWeight: "500" }],
      },

      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
        full: "9999px",
      },

      spacing: {
        base: "4px",
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        gutter: "16px",
        "max-mobile-width": "448px",
      },

      maxWidth: {
        "max-mobile-width": "448px",
      },

      /* Level 1 elevation from DESIGN.md — "avoid heavy shadows". */
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.04)",
        "card-hover": "0 2px 8px rgba(0,0,0,0.06)",
        fab: "0 6px 16px rgba(0, 101, 145, 0.28)",
      },
    },
  },
  plugins: [],
};
export default config;
