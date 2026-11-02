# functions

Cloud Functions (v2 callables, region `asia-southeast1`). Pattern: `handlers/` (defineCallable) -> `repo/` (`runTx`, reads then `controller` `decide*` then writes) -> `controller/` (pure rules). See docs/architecture.md section 1 and `docs/handoffs/1.1-auth-infra.md` ("How to add a handler").

- `src/common/` shared backend layer (callable wrapper, requireCaller, runTx, audit, notify, ledger, qrSigner, refs/converters, clock, config, errors). Import it as `../../common`.
- `src/<feature>/` one folder per feature, `index.ts` exports the callables.
- Build: `npm run build -w @silveracademy/functions` (esbuild bundles `src/index.ts` and `@silveracademy/shared` into `lib/index.js`; `firebase-admin` / `firebase-functions` stay external). `npm run emulators` builds first. After editing functions code while emulators run: `npm run build:watch -w @silveracademy/functions` in a second terminal.
- Env: `functions/.env.local` (copy `.env.local.example`): `AUTH_MODE`, `QR_HMAC_SECRET`, `DEMO_IGNORE_CHECKIN_WINDOW`, `MAP_PROVIDER`. Outside the emulators `AUTH_MODE=mock` also needs `ALLOW_MOCK_AUTH=true` (ADR-027). The hosted project reads `functions/.env.silveracademy-demo-adk` (git-ignored; template in `docs/hosted-demo.md` section 4).
- Hosted deploy: `npx firebase deploy --only functions --config firebase.deploy.json --project silveracademy-demo-adk` (stages the bundle with a minimal `package.json`, see `docs/hosted-demo.md` section 5).
- Tests: unit `*.test.ts` (`npm test`); emulator `*.emu.test.ts` (`npm run test:emulator`).
