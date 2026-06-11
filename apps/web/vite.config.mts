/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import angular from '@analogjs/vite-plugin-angular';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

const resolveBuildCommit = (): string => {
  const explicitCommit =
    process.env['NG_APP_BUILD_COMMIT'] ??
    process.env['CF_PAGES_COMMIT_SHA'] ??
    process.env['GITHUB_SHA'] ??
    '';

  if (explicitCommit.trim()) {
    return explicitCommit.trim();
  }

  try {
    return execSync('git rev-parse HEAD', {
      cwd: resolve(__dirname, '../..'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
};

export default defineConfig(() => {
  const buildCommit = resolveBuildCommit();

  return {
    root: __dirname,
    cacheDir: '../../node_modules/.vite/apps/web',
    plugins: [angular(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [ nxViteTsPaths() ],
    // },
    test: {
      name: 'web',
      watch: false,
      globals: true,
      environment: 'jsdom',
      include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      setupFiles: ['src/test-setup.ts'],
      reporters: ['default'],
      coverage: {
        reportsDirectory: '../../coverage/apps/web',
        provider: 'v8' as const,
      },
    },
    define: {
      'import.meta.env.NG_APP_BUILD_COMMIT': JSON.stringify(buildCommit),
    },
  };
});
