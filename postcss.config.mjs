import path from "node:path";

const legacySafariPlugin = path.resolve(process.cwd(), "postcss-legacy-safari.cjs");
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    [legacySafariPlugin]: {},
  },
};
export default config;
