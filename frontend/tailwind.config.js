/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg:      "#131314", 
        surface: "rgba(255,255,255,0.03)",
        border:  "rgba(255,255,255,0.08)",
        gold:    "#ffd700",
        cyberRed:"#ff1e3c", /* Your new primary accent color */
        purple:  "#7b61ff",
      },
      fontFamily: {
        // Sets Google Sans as the absolute default for the app
        sans:     ["var(--font-google-sans)", "sans-serif"], 
        // Swaps out 'Rajdhani' so your existing 'font-body' classes instantly use Google Sans
        body:     ["var(--font-google-sans)", "sans-serif"], 
        orbitron: ["Orbitron", "monospace"],
        mono:     ["Space Mono", "monospace"],
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