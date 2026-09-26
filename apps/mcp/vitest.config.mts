import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/mcp',
  plugins: [nxViteTsPaths()],
  test: {
    name: 'mcp',
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    coverage: { provider: 'v8', reportsDirectory: '../../coverage/apps/mcp' },
  },
});
