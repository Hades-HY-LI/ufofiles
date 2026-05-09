import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        archive: {
          void: "#050812",
          navy: "#08111f",
          panel: "#0c1626",
          line: "#1d314a",
          cyan: "#46d9ff",
          violet: "#9c7cff",
          mint: "#70e8c5"
        }
      },
      boxShadow: {
        glow: "0 0 32px rgba(70, 217, 255, 0.14)",
        panel: "0 24px 80px rgba(0, 0, 0, 0.32)"
      },
      backgroundImage: {
        "star-field":
          "radial-gradient(circle at 12% 16%, rgba(70,217,255,0.13), transparent 20rem), radial-gradient(circle at 84% 4%, rgba(156,124,255,0.16), transparent 22rem), linear-gradient(180deg, #050812 0%, #08111f 52%, #050812 100%)"
      }
    }
  },
  plugins: []
};

export default config;
