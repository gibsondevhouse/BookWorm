import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f3efe6",
        surface: "rgba(255, 252, 245, 0.92)",
        ink: "#1f1a17",
        muted: "#6f655d",
        accent: "#945f2d",
        border: "rgba(31, 26, 23, 0.12)",
        subtle: "rgba(148, 95, 45, 0.08)",
      },
      fontFamily: {
        serif: ["Georgia", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
