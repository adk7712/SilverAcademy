# firebase

Emulator config (`firebase.json`), security rules (`firestore.rules`, `storage.rules`), indexes (`firestore.indexes.json` from architecture 2.5), `rules-tests/` and `seed/` (emulator demo data, see docs/dev-guide.md). Emulator project id: `demo-silveracademy`. The hosted demo uses the real project `silveracademy-demo-adk` (see `docs/hosted-demo.md`).

- Rules are read-only gates: every client write is denied; mutations go through callables (ADR-005). Workshops are readable only by queries that constrain `status` to `OPEN/COMPLETED/CANCELLED` (or `instructorId == uid`); admins may list unconstrained.
- Rules tests: `npm run test:emulator` (starts auth/firestore/storage emulators, runs `rules-tests/*.rules.test.ts` and `functions/src/**/*.emu.test.ts`, shuts down).
- The functions emulator loads the esbuild bundle `functions/lib/index.js`; `firebase.json` predeploy runs the build, and `npm run emulators` builds first.
- Hosted deploy: the root `firebase.deploy.json` points at this folder's rules and indexes and at the staged functions bundle in `.deploy/functions` (built by `prepare-functions-deploy.mjs`, git-ignored). Commands: `docs/hosted-demo.md` section 5.
- Cloud seed: `npm run seed` writes to a real project only with `SEED_CLOUD_PROJECT` equal to `GCLOUD_PROJECT`, no emulator hosts, and explicit `SEED_ADMIN_PASSWORD`, `SEED_PARTNER_PASSWORD` and `QR_HMAC_SECRET` (`seed/guard.ts`, ADR-028).
