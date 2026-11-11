import legacySafari from "./postcss-legacy-safari.mjs";
const config = {
  plugins: [["@tailwindcss/postcss", {}], legacySafari],
};
export default config;
