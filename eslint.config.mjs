import { defineConfig, globalIgnores } from "eslint/config";
import babelParser from "@babel/eslint-parser";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

// Parse TypeScript syntax without replacing the application's TypeScript 7 compiler.
export default defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "node_modules/**",
    "next-env.d.ts",
    "test-results/**",
    "playwright-report/**",
  ]),
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          babelrc: false,
          configFile: false,
          plugins: [["@babel/plugin-syntax-typescript", { isTSX: true }]],
        },
      },
    },
    plugins: { "react-hooks": reactHooks, "jsx-a11y": jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "no-debugger": "error",
      "no-duplicate-imports": "error",
      "no-unreachable": "error",
      "no-constant-condition": "error",
    },
  },
  {
    files: ["components/project-form.tsx"],
    // Existing hydration and AI-progress effects are outside this visual refactor.
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
]);
