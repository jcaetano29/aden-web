import { defineConfig } from 'vitest/config';

// Cada archivo de sala levanta su propio servidor Colyseus y el simulador de balance ocupa CPU:
// con un hilo por núcleo, las esperas de 1 s de los tests de campaña a veces no alcanzan.
export default defineConfig({
  test: {
    poolOptions: { threads: { maxThreads: 6, minThreads: 1 } },
  },
});
