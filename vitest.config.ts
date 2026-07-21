import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // Specifying `include` reports every matched file, not just ones
      // touched by tests (there is no separate `all` option in vitest 4).
      include: ["src/core/**/*.ts"],
      // Floor set to current coverage (99.42% stmts / 96.05% branches /
      // 100% funcs / 99.4% lines) so a future change can't silently drop
      // below what's already achieved.
      thresholds: {
        statements: 99.4,
        branches: 96,
        functions: 100,
        lines: 99.4,
      },
      exclude: [
        "node_modules/",
        "dist/",
        "coverage/",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/*.test-d.ts",
        "vitest.config.ts",
        "eslint.config.js",
      ],
    },
  },
});
