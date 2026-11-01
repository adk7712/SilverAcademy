// Stages the bundled functions (functions/lib) with a minimal package.json for `firebase deploy` (hosted demo).
// Cloud Build cannot install the @silveracademy/shared workspace package; esbuild already inlines it into lib/.
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';

const OUT = '.deploy/functions';
const src = JSON.parse(readFileSync('functions/package.json', 'utf8'));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync('functions/lib', `${OUT}/lib`, { recursive: true });
for (const name of readdirSync('functions')) {
  if (name.startsWith('.env.') && name !== '.env.local')
    cpSync(`functions/${name}`, `${OUT}/${name}`);
}
const { 'firebase-admin': admin, 'firebase-functions': fns } = src.dependencies;
writeFileSync(
  `${OUT}/package.json`,
  JSON.stringify(
    {
      name: 'silveracademy-functions-deploy',
      private: true,
      main: 'lib/index.js',
      engines: src.engines,
      dependencies: { 'firebase-admin': admin, 'firebase-functions': fns },
    },
    null,
    2,
  ) + '\n',
);
