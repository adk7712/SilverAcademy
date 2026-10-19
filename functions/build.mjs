// Bundles src/index.ts -> lib/index.js so the Functions runtime can load code that imports @silveracademy/shared (TS source).
// Usage: node build.mjs [--watch]. firebase-admin / firebase-functions stay external (installed at deploy / hoisted locally).
import { build, context } from 'esbuild';

const options = {
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  logLevel: 'info',
  external: ['firebase-admin', 'firebase-admin/*', 'firebase-functions', 'firebase-functions/*'],
};

if (process.argv.includes('--watch')) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
