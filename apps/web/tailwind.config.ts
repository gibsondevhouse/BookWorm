import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    colors: {
      white: "#ffffff",
      primary: "#945f2d",
      primaryDark: "#7f4f24",
      paper: "#f3efe6",
      paperLight: "#f8f4ea",
      text: "#1f1a17",
      textMuted: "#6f655d",
      border: "rgba(31, 26, 23, 0.12)",
      subtle: "rgba(148, 95, 45, 0.08)",
      sidebarBg: "rgb(228, 220, 206)",
    },
    fontFamily: {
      serif: ["Georgia", "Times New Roman", "serif"],
      sans: ["system-ui", "sans-serif"],
    },
    extend: {},
  },
  plugins: [],
};

export default config;
