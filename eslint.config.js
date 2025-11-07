import globals from "globals";
import tseslint from "typescript-eslint";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "node_modules/**",
      "package-lock.json",
      "benchmarks/local/**",
    ],
  },
  {
    files: ["**/*.ts"],
    plugins: { "@typescript-eslint": typescriptEslint },
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.js"],
          defaultProject: "./tsconfig.json",
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/restrict-plus-operands": "error",
      "@typescript-eslint/unbound-method": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
    },
  },
  {
    files: ["**/*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.md"],
    plugins: { markdown },
    language: "markdown/gfm",
    extends: ["markdown/recommended"],
  },
]);
