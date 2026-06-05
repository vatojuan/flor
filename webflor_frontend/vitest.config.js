import { defineConfig } from "vitest/config";

// Harness minimo: por ahora solo testeamos helpers puros (lib/), sin render de
// componentes, asi que alcanza con el entorno 'node' (no hace falta jsdom).
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.js"],
  },
});
