import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // ควบคุมด้วย class="dark" บน <html> ผ่าน next-themes (ไม่ใช่ prefers-color-scheme เฉยๆ)
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ["Noto Sans Thai", "Prompt", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeInUp: "fadeInUp 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
