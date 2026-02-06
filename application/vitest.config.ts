
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Pas de setupFiles car le dossier src/test n'existe pas dans cette structure
  },
});
