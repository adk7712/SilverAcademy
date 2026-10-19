# functions

Cloud Functions (v2 callables, region `asia-southeast1`). Pattern: `handlers/` (defineCallable) -> `repo/` (`runTx`, reads then `controller` `decide*` then writes) -> `controller/` (pure rules). See docs/architecture.md section 1 and `docs/handoffs/1.1-auth-infra.md` ("How to add a handler").

- `src/common/` shared backend layer (callable wrapper, requireCaller, runTx, audit, notify, ledger, qrSigner, refs/converters, clock, config, errors). Import it as `../../common`.
- `src/<feature>/` one folder per feature, `index.ts` exports the callables.
- Build: `npm run build -w @silveracademy/functions` (esbuild bundles `src/index.ts` and `@silveracademy/shared` into `lib/index.js`; `firebase-admin` / `firebase-functions` stay external). `npm run emulators` builds first. After editing functions code while emulators run: `npm run build:watch -w @silveracademy/functions` in a second terminal.
- Env: `functions/.env.local` (copy `.env.local.example`): `AUTH_MODE`, `QR_HMAC_SECRET`, `DEMO_IGNORE_CHECKIN_WINDOW`, `MAP_PROVIDER`.
- Tests: unit `*.test.ts` (`npm test`); emulator `*.emu.test.ts` (`npm run test:emulator`).
