import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/* eslint-config-next 16 ships flat config, so it is spread directly rather
   than wrapped in FlatCompat. */
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: ["node_modules/**", ".next/**", "temp/**", "out/**"],
  },
];

export default eslintConfig;
