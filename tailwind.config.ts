import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#2563EB",
          "blue-light": "#EFF6FF",
          green: "#16A34A",
          "green-light": "#F0FDF4",
          red: "#DC2626",
          "red-light": "#FEF2F2",
          amber: "#D97706",
          "amber-light": "#FFFBEB",
          gray: "#6B7280",
        },
      },
    },
  },
  plugins: [],
};

export default config;
