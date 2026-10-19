# firebase

Emulator config (`firebase.json`), security rules (`firestore.rules`, `storage.rules`), indexes (`firestore.indexes.json` from architecture 2.5), `rules-tests/` and `seed/` (emulator demo data, see docs/dev-guide.md). Project id: `demo-silveracademy`.

- Rules are read-only gates: every client write is denied; mutations go through callables (ADR-005). Workshops are readable only by queries that constrain `status` to `OPEN/COMPLETED/CANCELLED` (or `instructorId == uid`); admins may list unconstrained.
- Rules tests: `npm run test:emulator` (starts auth/firestore/storage emulators, runs `rules-tests/*.rules.test.ts` and `functions/src/**/*.emu.test.ts`, shuts down).
- The functions emulator loads the esbuild bundle `functions/lib/index.js`; `firebase.json` predeploy runs the build, and `npm run emulators` builds first.
