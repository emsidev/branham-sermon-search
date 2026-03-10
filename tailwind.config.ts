import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const colorVar = (token: string) => `oklch(var(${token}) / <alpha-value>)`;

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        bg: colorVar("--bg"),
        "bg-subtle": colorVar("--bg-subtle"),
        "bg-muted": colorVar("--bg-muted"),
        "bg-elevated": colorVar("--bg-elevated"),
        fg: colorVar("--fg"),
        "fg-muted": colorVar("--fg-muted"),
        "fg-subtle": colorVar("--fg-subtle"),
        border: colorVar("--border"),
        "border-subtle": colorVar("--border-subtle"),
        "border-hover": colorVar("--border-hover"),
        input: colorVar("--input"),
        ring: colorVar("--ring"),
        background: colorVar("--background"),
        foreground: colorVar("--foreground"),
        link: colorVar("--link"),
        "hover-row": colorVar("--hover-row"),
        "filter-badge": {
          DEFAULT: colorVar("--filter-badge"),
          foreground: colorVar("--filter-badge-foreground"),
        },
        primary: {
          DEFAULT: colorVar("--primary"),
          foreground: colorVar("--primary-foreground"),
        },
        secondary: {
          DEFAULT: colorVar("--secondary"),
          foreground: colorVar("--secondary-foreground"),
        },
        destructive: {
          DEFAULT: colorVar("--destructive"),
          foreground: colorVar("--destructive-foreground"),
        },
        muted: {
          DEFAULT: colorVar("--muted"),
          foreground: colorVar("--muted-foreground"),
        },
        accent: {
          DEFAULT: colorVar("--accent"),
          foreground: colorVar("--accent-foreground"),
        },
        popover: {
          DEFAULT: colorVar("--popover"),
          foreground: colorVar("--popover-foreground"),
        },
        card: {
          DEFAULT: colorVar("--card"),
          foreground: colorVar("--card-foreground"),
        },
        sidebar: {
          DEFAULT: colorVar("--sidebar-background"),
          foreground: colorVar("--sidebar-foreground"),
          primary: colorVar("--sidebar-primary"),
          "primary-foreground": colorVar("--sidebar-primary-foreground"),
          accent: colorVar("--sidebar-accent"),
          "accent-foreground": colorVar("--sidebar-accent-foreground"),
          border: colorVar("--sidebar-border"),
          ring: colorVar("--sidebar-ring"),
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
