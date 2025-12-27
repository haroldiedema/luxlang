import { defineConfig } from 'tsup';

export default defineConfig([
    // 1. Universal / Node Build
    {
        entry: ['src/index.ts'],
        format: ['cjs', 'esm'],
        dts: true,
        clean: true,
        sourcemap: true,
        target: 'es2020',
        platform: 'node',
        external: ['readline'],
    },

    // Browser Build (Excludes Debugger)
    {
        entry: { 'browser': 'src/browser.ts' },
        format: ['esm'],
        dts: true,
        sourcemap: true,
        minify: true,
        target: 'es2020',
        platform: 'browser',
        noExternal: [/(.*)/],
    }
]);
