import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "release/**", "artifacts/**", "node_modules/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/essential"],
  {
    files: ["**/*.{ts,vue}"],
    languageOptions: {
      globals: {
        __PROJECTD_VERSION__: "readonly",
        FrameRequestCallback: "readonly"
      },
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".vue"]
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "no-control-regex": "off",
      "no-useless-assignment": "off",
      "prefer-const": "off",
      "preserve-caught-error": "off",
      "vue/multi-word-component-names": "off"
    }
  },
  {
    files: ["src/renderer/**/*.{ts,vue}", "src/settings/**/*.vue", "src/env.d.ts"],
    languageOptions: { globals: globals.browser }
  },
  {
    files: ["src/main/**/*.ts", "src/preload/**/*.ts", "src/shared/**/*.ts", "server/**/*.ts"],
    languageOptions: { globals: globals.node }
  },
  {
    files: ["scripts/**/*.cjs", "tests/**/*.cjs"],
    languageOptions: { globals: globals.node },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-useless-assignment": "off",
      "no-useless-escape": "off"
    }
  },
  {
    files: ["tests/**/*.ts"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }
  },
  {
    files: ["vite.config.ts", "vitest.config.ts", "playwright.config.ts"],
    languageOptions: { globals: globals.node }
  }
);
