import { fileURLToPath, URL } from "node:url";
import { readFileSync } from "node:fs";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

const packageVersion = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version as string;

export default defineConfig({
  plugins: [vue()],
  define: {
    __PROJECTD_VERSION__: JSON.stringify(packageVersion)
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src/renderer", import.meta.url)),
      "@settings": fileURLToPath(new URL("./src/settings", import.meta.url)),
      "@shared": fileURLToPath(new URL("./src/shared", import.meta.url))
    }
  },
  test: {
    environment: "happy-dom",
    include: ["tests/component/**/*.test.ts"],
    clearMocks: true
  }
});
