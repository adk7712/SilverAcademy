# SilverAcademy

SilverAcademy connects Senior Instructors (age 50+) with Learners, Volunteers, Community Partners (venue owners) and Admins. This repository is a demo-able prototype of the core loop:

login -> create workshop -> venue request and approval -> learner books -> QR ticket -> scan attendance -> points -> wallet -> redeem voucher.

It is built for the SC2006 SCSB project. Source requirements are in `SC2006_SCSB_SilverAcademy.pdf`; the use case mapping is in `docs/requirements-map.md`.

Status: all planned build tasks are done and the two PDF mockup flows run on the Firebase emulators. A hosted demo is also online (see **Hosted demo** below). Singpass is mocked, the venue map is schematic, and some areas have not been run on real devices. See `docs/known-limitations.md`.

## What it is made of

- **Mobile app** (Expo, React Native) for Learner, Senior Instructor and Volunteer.
- **Web app** (React, Vite) for Admin and Community Partner.
- **Cloud Functions** (TypeScript) hold the business-critical rules as transactions: capacity, duplicate booking, single attendance, voucher redeem.
- **Firebase** (Auth, Firestore, Storage) running on the **Local Emulator Suite** for development. The hosted demo uses a real Firebase project (`silveracademy-demo-adk`); local runs never touch it.
- **Shared package** with types, enums, zod schemas and the map provider (OneMap or a stub).

## Quick start

Requirements: Node 22 or newer, npm 10 or newer, and Java (for the Firebase emulators).

```sh
# 1. install all workspaces
npm install

# 2. start the emulators (terminal 1; leave running)
npm run emulators

# 3. seed demo data (terminal 2)
FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 npm run seed

# 4. run the apps
npm run dev:mobile   # Expo: scan with Expo Go, press i or a, or w for web
npm run dev:web      # Vite: open the URL it prints (default http://localhost:5173)
```

Copy the values from `.env.example` into `functions/.env.local` and `apps/mobile/.env.local` first. The defaults are fine for local work. For demos, also set `DEMO_IGNORE_CHECKIN_WINDOW=true` in `functions/.env.local` and restart the emulators. The full setup, the environment files and the gotchas are in `docs/dev-guide.md`.

## Demo accounts

Mobile users sign in through a fake Singpass screen: tap **Log in with Singpass**, then a demo account (for example `learner-35`, `senior-62`, `volunteer-28`). Staff sign in on the web app (`admin01`, `partner01`). The same profiles exist on the hosted demo (see above). The full table of profiles, seeded data and the demo script for the two PDF flows (Learner Booking Journey and Senior Instructor Check-In Flow), Partner approval and Admin voucher upload are in `docs/dev-guide.md`, sections 5 and 6.

## Tests

```sh
npm run lint              # ESLint, including layering rules
npm run typecheck         # all workspaces, seed, rules tests and e2e
npm run format:check      # Prettier
npm test                  # Jest (shared, functions, mobile logic) and web Vitest
npm run test:emulator     # rules and backend integration tests; stop `npm run emulators` first
```

## End-to-end backend run

With the emulators freshly started and freshly seeded:

```sh
npm run e2e
```

This runs the core loop against the real callable endpoints (with Auth emulator tokens) and checks the Firestore rules. It writes data and is not idempotent, so restart the emulators and reseed before each run. See `docs/dev-guide.md`, section 9.

## Repository layout

```
apps/mobile      Expo app (Learner, Instructor, Volunteer)
apps/web         React app (Admin, Community Partner)
packages/shared  types, enums, zod schemas, constants, map provider
functions/       Cloud Functions (transactional rules)
firebase/        emulator config, firestore and storage rules, indexes, seed, rules tests, e2e
docs/            coordination and documentation hub
```

## Hosted demo

Try it without installing anything. Singpass is mocked and the data is seeded demo data, so do not enter real personal details.

| App                                                           | URL                                              |
| ------------------------------------------------------------- | ------------------------------------------------ |
| Staff web app (Admin, Community Partner), sign in at `/login` | https://silver-academy-web-adk7712.vercel.app    |
| Mobile web app (Learner, Instructor, Volunteer)               | https://silver-academy-mobile-adk7712.vercel.app |

- Mobile web: pick a profile in the mock Singpass picker (for example `learner-35`).
- Staff web: user id `admin01` or `partner01`. Password: `<ask the project owner>` (not stored in the repo).
- Backend: Firebase project `silveracademy-demo-adk` (Auth, Firestore, Storage, Cloud Functions in `asia-southeast1`).
- Camera QR scanning, location and the offline ticket are not verified on the hosted apps. Use the manual ticket-code entry.

Setup, environment variables, redeploy and reseed steps: `docs/hosted-demo.md`.

## Deployment

Both apps are hosted on Vercel Hobby, as two projects of one repository:

| Vercel project          | Root directory | Config                    | Production URL                                   |
| ----------------------- | -------------- | ------------------------- | ------------------------------------------------ |
| `silver-academy-web`    | `./`           | `vercel.json`             | https://silver-academy-web-adk7712.vercel.app    |
| `silver-academy-mobile` | `apps/mobile`  | `apps/mobile/vercel.json` | https://silver-academy-mobile-adk7712.vercel.app |

- Every pull request gets preview URLs automatically, posted as a comment on the PR by the Vercel bot. Previews share the hosted Firebase project with production.
- Pushes to `master` (the default branch) deploy to production.
- Client settings are Vercel environment variables (`VITE_*` for web, `EXPO_PUBLIC_*` for mobile). Without them the apps fall back to the local emulators. See `docs/hosted-demo.md`.
- Cloud Functions, rules and the seed are deployed from a developer machine with the Firebase CLI, not by Vercel. Steps are in `docs/hosted-demo.md`.

## Documentation

Start with **[docs/README.md](docs/README.md)**, the documentation index. Then:

- `docs/dev-guide.md`: setup, demo script, troubleshooting and onboarding
- `docs/hosted-demo.md`: hosted demo links, environment, redeploy and reseed
- `docs/progress.md`: task status board
- `docs/known-limitations.md`: open issues and unverified areas
- `docs/next-steps.md`: prioritised work for the next developer
- `docs/architecture.md` and `docs/decisions.md`: design and ADR log

## Working rules

- The project guide for agents and developers is `CLAUDE.md`.
- A task is done only when its handoff in `docs/handoffs/` is written and `docs/progress.md` and the checklists are updated.
- Never commit or push without the owner's approval.
- Demo credentials are for the emulator and the hosted demo only. Do not reuse the seed passwords anywhere else, and never commit the hosted staff passwords (they live in the git-ignored `.cloud-demo-credentials`).
