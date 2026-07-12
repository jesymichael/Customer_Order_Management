import type { Config } from "tailwindcss";

// hsl token with alpha support so `bg-success/10` etc. work.
const c = (v: string) => `hsl(var(${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      colors: {
        border: c("--border"),
        input: c("--input"),
        ring: c("--ring"),
        background: c("--background"),
        foreground: c("--foreground"),
        primary: { DEFAULT: c("--primary"), foreground: c("--primary-foreground") },
        muted: { DEFAULT: c("--muted"), foreground: c("--muted-foreground") },
        accent: { DEFAULT: c("--accent"), foreground: c("--accent-foreground") },
        destructive: { DEFAULT: c("--destructive"), foreground: c("--destructive-foreground") },
        success: { DEFAULT: c("--success"), foreground: c("--success-foreground") },
        warning: { DEFAULT: c("--warning"), foreground: c("--warning-foreground") },
        card: { DEFAULT: c("--card"), foreground: c("--card-foreground") },
        sidebar: {
          DEFAULT: c("--sidebar"),
          foreground: c("--sidebar-foreground"),
          muted: c("--sidebar-muted"),
          border: c("--sidebar-border"),
          accent: c("--sidebar-accent"),
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
