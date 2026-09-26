# anti-slop provenance

- Source: https://github.com/dmmulroy/anti-slop
- Source commit: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b`
- Copied path: upstream `src/` to this directory, including rule tests and the nested ESLint Stylistic license and provenance. The root upstream MIT `LICENSE` is copied here too.
- Entry point: `tools/oxlint/anti-slop/index.ts`
- Intentional source changes: none. The local `package.json` marks this vendored directory as ESM because the Spendist root package is CommonJS.

The root `.oxlintrc.json` registers the generic plugin and its rules. The Effect plugin is not enabled because Spendist has no direct `effect` dependency. Update this directory from a reviewed upstream revision and keep `oxlint` and `@oxlint/plugins` pinned to the same exact version.
