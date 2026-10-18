import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Plain apostrophes in interface text are fine in React; escaping them only makes the copy harder to read and edit.
    rules: { "react/no-unescaped-entities": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored React Bits source (copy-in components): kept as published, not linted.
    "components/reactbits/**",
  ]),
]);

export default eslintConfig;
