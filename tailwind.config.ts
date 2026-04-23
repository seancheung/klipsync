import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    // 对齐原型 prototype/styles.css 断点：sm=600（auth 卡片）/ md=900（主工作台切列）
    screens: {
      sm: "600px",
      md: "900px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        // Crisp Canvas 令牌 —— 详见 src/app/globals.css :root
        bg: "var(--c-bg)",
        "bg-raise": "var(--c-bg-raise)",
        "bg-sunk": "var(--c-bg-sunk)",
        line: "var(--c-line)",
        "line-strong": "var(--c-line-strong)",
        text: "var(--c-text)",
        "text-mute": "var(--c-text-mute)",
        "text-dim": "var(--c-text-dim)",
        accent: {
          DEFAULT: "var(--c-accent)",
          soft: "var(--c-accent-soft)",
          strong: "var(--c-accent-strong)",
        },
        success: {
          DEFAULT: "var(--c-success)",
          soft: "var(--c-success-soft)",
        },
        warn: {
          DEFAULT: "var(--c-warn)",
          soft: "var(--c-warn-soft)",
        },
        danger: {
          DEFAULT: "var(--c-danger)",
          soft: "var(--c-danger-soft)",
        },
        info: {
          DEFAULT: "var(--c-info)",
          soft: "var(--c-info-soft)",
        },
        peach: {
          DEFAULT: "var(--c-peach)",
          soft: "var(--c-peach-soft)",
        },
        // shadcn 语义别名 —— 映射到 Crisp Canvas，保持组件可用
        background: "var(--c-bg)",
        foreground: "var(--c-text)",
        card: {
          DEFAULT: "var(--c-bg-raise)",
          foreground: "var(--c-text)",
        },
        popover: {
          DEFAULT: "var(--c-bg-raise)",
          foreground: "var(--c-text)",
        },
        primary: {
          DEFAULT: "var(--c-accent)",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "var(--c-bg-raise)",
          foreground: "var(--c-text)",
        },
        muted: {
          DEFAULT: "var(--c-bg-sunk)",
          foreground: "var(--c-text-mute)",
        },
        destructive: {
          DEFAULT: "var(--c-danger)",
          foreground: "#FFFFFF",
        },
        border: "var(--c-line-strong)",
        input: "var(--c-line-strong)",
        ring: "var(--c-accent)",
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        pill: "var(--r-pill)",
      },
      spacing: {
        "s-1": "var(--s-1)",
        "s-2": "var(--s-2)",
        "s-3": "var(--s-3)",
        "s-4": "var(--s-4)",
        "s-6": "var(--s-6)",
        "s-8": "var(--s-8)",
        "s-12": "var(--s-12)",
        "s-16": "var(--s-16)",
      },
      fontFamily: {
        head: "var(--f-head)",
        body: "var(--f-body)",
        mono: "var(--f-mono)",
        sans: "var(--f-body)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
      },
      transitionTimingFunction: {
        crisp: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        "accordion-up": "accordion-up 200ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [animate],
};

export default config;
