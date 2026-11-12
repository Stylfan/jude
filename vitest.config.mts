import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

try {
  process.loadEnvFile(".env");
} catch {}

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    // The tests set the modes they need themselves; a developer's local .env must not.
    env: { JUDE_DEMO: "", JUDE_SIGNUP: "", JUDE_FAKE_AI: "", JUDE_VOICES: "", MISTRAL_API_KEY: "" },
    include: ["tests/**/*.test.ts"],
    // One shared test database (see tests/db.ts), emptied before each test,
    // so the files run one after another.
    globalSetup: ["tests/global-setup.ts"],
    fileParallelism: false,
  },
});
