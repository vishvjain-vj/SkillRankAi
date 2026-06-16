/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg:      "#060912",
        surface: "rgba(255,255,255,0.03)",
        border:  "rgba(255,255,255,0.07)",
        gold:    "#ffd700",
        mint:    "#00ffb4",
        purple:  "#7b61ff",
      },
      fontFamily: {
        orbitron: ["Orbitron", "monospace"],
        mono:     ["Space Mono", "monospace"],
        body:     ["Rajdhani", "sans-serif"],
      },
      keyframes: {
        pulse_gold: {
          "0%,100%": { boxShadow: "0 0 20px rgba(255,215,0,0.3)" },
          "50%":     { boxShadow: "0 0 50px rgba(255,215,0,0.7)" },
        },
        blink: {
          "0%,100%": { opacity: 1 },
          "50%":     { opacity: 0.1 },
        },
      },
      animation: {
        pulse_gold: "pulse_gold 2.5s ease-in-out infinite",
        blink:      "blink 1.2s step-end infinite",
      },
    },
  },
  plugins: [],
};