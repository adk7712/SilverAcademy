# Handoff: H hosted demo (Vercel + Firebase)

## Task
Make both apps reachable from a link and working against a real backend, without changing the emulator-first development flow.

## Agent / model
Sonnet 5.5, with the project owner approving the Firebase project, billing, IAM grant and Vercel settings.

## What was built
- Two Vercel projects: `silver-academy-web` (root `vercel.json`) and `silver-academy-mobile` (`apps/mobile/vercel.json`). Links: https://silver-academy-web-adk7712.vercel.app and https://silver-academy-mobile-adk7712.vercel.app.
- Real Firebase project `silveracademy-demo-adk` (Blaze, `asia-southeast1`): Auth email/password, Firestore with rules and indexes, Storage, 33 callables, seeded demo data.
- Opt-in mock auth outside emulators (`ALLOW_MOCK_AUTH`), cloud seed opt-in (`SEED_CLOUD_PROJECT`), staged functions deploy (`firebase.deploy.json`, `firebase/prepare-functions-deploy.mjs`).
- Bug fix found on the hosted staff login: `ensureApp()` in `functions/src/common/firebase.ts` now checks the default Admin app, because `firebase-functions` registers a named app first in the cloud. Before the fix, `auth-recordStaffLogin` crashed and the UI showed "Invalid Credentials".
- Docs: `docs/hosted-demo.md`, ADR-026, ADR-027, known limitations section 8, next steps 27 to 29, and hosted notes in the READMEs and `.env.example`.

## Files touched
`vercel.json`, `apps/mobile/vercel.json`, `firebase.deploy.json`, `firebase/prepare-functions-deploy.mjs`, `firebase/seed/guard.ts`, `functions/src/common/config.ts` (+ test), `functions/src/common/firebase.ts`, `functions/src/auth/singpassVerifier.ts`, `.gitignore`, and the docs listed above.

## Interfaces exposed
Env vars: `ALLOW_MOCK_AUTH`, `SEED_CLOUD_PROJECT`, `VITE_USE_EMULATORS`, `VITE_FIREBASE_*`, `EXPO_PUBLIC_USE_EMULATORS`, `EXPO_PUBLIC_FIREBASE_*`. No new callables.

## Open issues
- PRs #10 (README URL) and #11 (everything else) are open and not merged. #10 overlaps the README Deployment section rewritten here, so expect a trivial conflict.
- Hosted staff sign-in after the `ensureApp` fix has not been confirmed end to end by a person yet.
- Camera, location, offline ticket and upload are unverified on the hosted apps (limitation H5).
- Functions, rules and seed deploy by hand (limitation H6).
- Mock login is open to anyone with the URL (limitation H1); staff passwords are short demo values (H2).

## Notes for next agent
Read `docs/hosted-demo.md` first. Never write the hosted staff passwords into the repo; they live in the owner's git-ignored `.cloud-demo-credentials` and in Firebase Auth. Mock login needs `roles/iam.serviceAccountTokenCreator` on the functions service account (already granted).
