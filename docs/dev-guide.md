# Developer Guide

Everything a new developer needs to run SilverAcademy locally, walk through the two PDF mockup flows, and avoid the common traps. Start with the root `README.md` for the one-page overview, then come back here.

Status of the prototype and what is not verified yet: `progress.md`, `checklists/use-case-coverage.md`, `known-limitations.md`.

---

## 1. Prerequisites

- **Node.js 22 or newer.** `functions/package.json` declares `engines.node = 22` (the Firebase CLI rejects `>=20`). The team develops on Node 26; the emulator prints a harmless "node 22 vs global 26" warning.
- **npm 10 or newer** (npm workspaces).
- **Java**, on your `PATH`. The Firestore and Storage emulators need it. The team ran the emulators with Java 25.
- **Mobile:** Expo Go on a phone, or an iOS Simulator / Android Emulator. Web preview also works in a browser (`expo start --web`).
- **Web:** any modern desktop browser.
- Ports must be free: Auth 9099, Firestore 8080, Functions 5001, Storage 9199, Emulator UI 4000. The emulator tests also need these ports, so **the emulators and `npm run test:emulator` cannot run at the same time.**

---

## 2. First-time setup

1. From the repo root:
   ```sh
   npm install
   ```
   This installs every workspace (`apps/mobile`, `apps/web`, `packages/shared`, `functions`, `firebase/*` scripts).
2. Environment files. Copy values from `.env.example` into the three local files below. Dev defaults are fine.
   - `functions/.env.local` (read by the Functions emulator). A template also exists at `functions/.env.local.example`. Required keys:
     ```
     AUTH_MODE=mock
     QR_HMAC_SECRET=dev-only-change-me
     DEMO_IGNORE_CHECKIN_WINDOW=true   # set for demos and npm run e2e; see section 9
     MAP_PROVIDER=stub
     ```
   - `apps/mobile/.env.local` (Expo; `EXPO_PUBLIC_*` values are bundled into the app). This file already exists in the repo checkout. Required keys: `EXPO_PUBLIC_USE_EMULATORS=true`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID=demo-silveracademy`, `EXPO_PUBLIC_EMULATOR_HOST=localhost`.
   - `apps/web/.env.local` (Vite). Optional: the web app already defaults to the emulators. If you want it explicit, add `VITE_USE_EMULATORS=true`, `VITE_FIREBASE_PROJECT_ID=demo-silveracademy`, `VITE_EMULATOR_HOST=localhost`.
   - All `.env.local` files are git-ignored. Never commit real secrets; this prototype has none.

---

## 3. Start the emulators and seed the data

The app runs entirely on the Firebase Local Emulator Suite (ADR-002). Nothing talks to real Firebase.

1. **Terminal 1.** Start the emulators and leave them running:
   ```sh
   npm run emulators
   ```
   This rebuilds the Functions bundle (`functions/lib/index.js`) first, then starts the emulators with project `demo-silveracademy`. The Emulator UI is at http://localhost:4000.
2. **Terminal 2.** Seed Auth and Firestore:
   ```sh
   FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 npm run seed
   ```
   - The seed refuses to run unless both emulator variables are set and the project id starts with `demo-`.
   - It is safe to rerun. Every document has a fixed id and is overwritten; Auth users are updated in place.
   - Dates are relative to the run time (Singapore calendar), so a rerun shifts "upcoming" and "past" windows forward. Ids and content stay the same.
   - Optional overrides (emulator only): `SEED_ADMIN_PASSWORD`, `SEED_PARTNER_PASSWORD` (min 8 characters), `QR_HMAC_SECRET` (must match `functions/.env.local` so seeded QR tickets verify). Defaults live in `firebase/seed/guard.ts` and `.env.example`.
   - Seed code: `firebase/seed/` (`seed.ts` entry, `plan.ts` assembles the plan, `fixtures/*` holds the data, `apply.ts` writes it).
3. **Functions live edits (optional).** The Functions emulator runs the esbuild bundle. After editing `functions/src` or `packages/shared`, either restart `npm run emulators`, or run `npm run build:watch -w @silveracademy/functions` in a third terminal (the emulator reloads the bundle).

Restart the emulators whenever you change `functions/.env.local`. The Functions emulator reads it at startup.

---

## 4. Run the apps

- **Mobile (Expo):** `npm run dev:mobile`. Scan the QR code with Expo Go, or press `i` / `a` for a simulator, or `w` for the web preview.
  - Web preview: `npm run dev:mobile` then `w`, or `npx expo start --web` from `apps/mobile`. Camera scanning on web needs HTTPS or `localhost`.
  - Android emulator: set `EXPO_PUBLIC_EMULATOR_HOST=10.0.2.2` in `apps/mobile/.env.local`.
  - Physical phone: set `EXPO_PUBLIC_EMULATOR_HOST` to your laptop's LAN IP. The emulator ports must listen on `0.0.0.0`.
- **Web (Vite):** `npm run dev:web`, then open the URL Vite prints (default http://localhost:5173). Staff sign in at `/login`.

Mobile and web are independent. The Learner, Instructor and Volunteer experience is mobile; Admin and Community Partner are web (ADR-008 and CLAUDE.md).

---

## 5. Demo accounts (emulator only)

Every account below exists only in the emulator.

### Singpass users (mobile)

Singpass is **mocked** (ADR-001). On the mobile login screen pick a profile from the mock picker. Under the hood the assertion is `mock:<profileId>`.

| Profile id (mock picker) | Name | Role(s) | Seeded data |
|---|---|---|---|
| `learner-35` | Tan Wei Ming, age 35 | LEARNER | Booked `ws-01` (Smartphone Basics, open) |
| `senior-49-edge` | Lim Hui Ling, age 49 | LEARNER | Booked `ws-02` (nearly full) and attended `ws-04` (completed, feedback given) |
| `senior-50` | Ong Siew Hoon, age 50 | LEARNER + SENIOR_INSTRUCTOR | Instructor profile PENDING (review queue) |
| `senior-62` | Ahmad bin Yusof, age 62 | LEARNER + SENIOR_INSTRUCTOR | Profile APPROVED; teaches `ws-01`, `ws-04`, `ws-05`, `ws-07`; wallet 11 points after one redemption |
| `senior-72` | Mary Goh Bee Lian, age 72 | LEARNER + SENIOR_INSTRUCTOR | Profile APPROVED; teaches `ws-02`, `ws-03`, `ws-06`, `ws-08`; wallet 30 points |
| `volunteer-28` | Priya Nair, age 28 | VOLUNTEER | Assigned to `ws-03` (Chair Tai Chi, needs volunteers) |

Notes:
- `senior-49-edge` turns 50 on 2027-06-30. A reseed after that date gives this learner the SENIOR_INSTRUCTOR role too.
- A user holding both LEARNER and SENIOR_INSTRUCTOR gets a mode toggle above the tabs.

### Staff accounts (web)

Staff sign in on the web app with their staff user id and password. Staff are not offered the mobile mock picker (the mobile app says "use the web app").

| Login (staff user id) | Email | Role | Notes |
|---|---|---|---|
| `admin01` | `admin01@staff.silveracademy.test` | ADMIN | Accounts, workshops, voucher inventory, incident queue, instructor review |
| `partner01` | `partner01@staff.silveracademy.test` | COMMUNITY_PARTNER | Owns 3 facilities (`Demo Hall Toa Payoh`, `Demo Room Bedok`, `Demo Studio Ang Mo Kio`) and their slots; `ws-07` has a pending venue request |

Staff passwords are the seed defaults in `firebase/seed/guard.ts`, or the `SEED_*` overrides you set. They are not secrets, but do not reuse them outside the emulator. Staff user ids are case-insensitive (lowercase on the server).

### Other seeded data

- 8 workshops: `ws-01` to `ws-08`, with statuses OPEN (`ws-01`, `ws-02`, `ws-03`, `ws-05`), COMPLETED (`ws-04`), CANCELLED (`ws-06`), PENDING_VENUE (`ws-07`) and DRAFT (`ws-08`).
- 3 facilities and 11 slots (AVAILABLE, BOOKED, UNAVAILABLE, MAINTENANCE), and 6 venue requests.
- 3 voucher tiers `DEMOVP_5`, `DEMOVP_10`, `DEMOVP_20`, with 20 fictional codes such as `DEMOVP-05-0001`. The inventory is server-only; admins see masked codes.
- Demo ticket codes for the manual-entry fallback: `K7Q2M9XA` (ws-01, booked by `learner-35`), `R4T8NH3V` (ws-02), `WB5D6JZP` (ws-04, already attended).

---

## 6. Demo script

The two mockup flows in the PDF (spec section 8, "UI Mockup") are **Learner Booking Journey** and **Senior Instructor Check-In Flow**. The Partner approval and Admin voucher upload demos follow them.

Before you start: emulators running, freshly seeded, and `functions/.env.local` has `DEMO_IGNORE_CHECKIN_WINDOW=true` followed by an emulator restart. The check-in window is otherwise closed unless the workshop is running now (it opens 60 minutes before start and closes 30 minutes after end, `packages/shared/src/constants.ts`).

### Flow A: Learner Booking Journey (mobile)

1. Launch the mobile app (`npm run dev:mobile`). On the login screen, choose `learner-35` (Tan Wei Ming) from the mock picker.
2. **Discover** lists OPEN workshops. Use the search box, the category select and the date filter. Sort by "Soonest" or "Nearest" (nearest needs location permission; without it the note explains why).
3. Open **Smartphone Basics** (`ws-01`) or **Conversational Mandarin Over Tea** (`ws-05`). `learner-35` already holds `ws-01`, so for a clean booking use **`ws-05`**.
4. Tap **Book Workshop**, then confirm. A success card shows the 8-character ticket code.
5. Open **My Bookings**, then the booking, to see the **Ticket**: the black-on-white QR, the `XXXX-XXXX` code for manual check-in, the venue, the time and the instructor.
6. Try to book `ws-05` again. The app shows "already booked" with a **View my ticket** link (server `ALREADY_BOOKED`).
7. Optional offline check: stop the emulators (or enable airplane mode on a device), reopen the Ticket. The cached copy shows with a "last updated" banner (ADR-019). **Not verified on a real device yet**; see `known-limitations.md`.

What this proves: the booking transaction (capacity and duplicate protection), the signed QR payload and the offline mirror.

### Flow B: Senior Instructor Check-In Flow (mobile, instructor mode)

1. Log in as `senior-62` (Ahmad bin Yusof). Toggle to **Instructor** mode. The **Dashboard** lists his workshops, including `ws-05`, which `learner-35` just booked.
2. Tap **Scan Attendance** (or open the workshop's roster first, then the scanner). Pick **`ws-05`** (OPEN, check-in window open because of `DEMO_IGNORE_CHECKIN_WINDOW`).
3. Check in the learner. The camera needs a physical device or a second screen showing the learner's QR. In the simulator or the web preview, use **Enter ticket code manually** and type the learner's `XXXX-XXXX` code from step 5 of Flow A.
   - Success banner: learner name, workshop, "+1 point" (points always go to the instructor who owns the workshop, ADR-010).
4. Scan the same code again. The result is **ALREADY_ATTENDED** with the learner's name and the time of check-in (once-only rule).
5. Learner accounts have no scanner screen. If you call the attendance function directly as a learner, the server refuses it (PERMISSION_DENIED); the e2e run checks this.
6. Open the **Roster** for `ws-05`. The learner now shows as Attended and the attended count goes up.
7. Open **Wallet**. Balance was 11 points for `senior-62` before the scan, so it should now be 12. The points history lists the new entry.
8. **Redeem a voucher**: tap Redeem, pick an affordable tier, confirm. The voucher code is shown once and then appears under **My vouchers**. An unaffordable tier returns INSUFFICIENT_POINTS with the required and current balance.

What this proves: the attendance transaction (single attendance, points only once, scanner authorisation), the points ledger and voucher redemption.

Volunteer variant (optional): `volunteer-28` is assigned to `ws-03`, which needs volunteers. Log in as this volunteer to see Assigned workshops and the class list, and to scan with the same screen.

### Partner approval (web, `partner01`)

1. Start the web app (`npm run dev:web`) and log in as `partner01` at `/login`.
2. **Venue Requests** (`/partner/requests`) shows the pending request for `ws-07` (Balcony Herb Gardening). Open it and **Approve** (confirm).
   - Result: the request is APPROVED, the slot is BOOKED, and the workshop moves to OPEN.
   - If the slot has since passed or was taken, the server returns SLOT_CONFLICT and the request becomes CONFLICTED. The UI then says to free up or add a slot.
3. Optional: **Reject** or **Request more info** (message required). Reject and Request info can suggest another available slot.
4. **Venue Availability** (`/partner/availability`) lists the three facilities. Add or edit a facility, then manage its slots. Booked slots are locked.

Status: the backend path (request, approve, slot lock) is verified by `npm run e2e`. Clicking through the web approval UI was **not** run in task 3.1; see `known-limitations.md`.

### Admin voucher upload (web, `admin01`)

1. Log in as `admin01` and open **Voucher Inventory** (`/admin/vouchers`).
2. **Summary** shows tier counts. **Inventory** shows masked codes (`****1234`) and filters by tier and status.
3. **Upload**: paste or pick a CSV with the header `provider,denomination,code`. Use the provider `DEMOVP` and denominations 5, 10 or 20, with fictional codes such as `DEMOVP-05-0101`.
   - Include a duplicate row and an unknown denomination on purpose. The result lists accepted rows and rejected rows with reasons (`DUPLICATE_IN_FILE`, `DUPLICATE_EXISTING`, `UNKNOWN_TIER`, `INVALID_FORMAT`).
   - Upload the same file again. Every row is rejected as `DUPLICATE_EXISTING` (dedupe by hashed code).
4. Optionally mark one AVAILABLE voucher INVALID (a reason is required). Redeem and upload logic checks status on the server.

Admin can also show **Accounts** (suspend and reactivate need a reason), **Workshops**, **Instructor Review** (`senior-50` is PENDING, so Approve or Reject him) and the **Incident Queue**.

---

## 7. Automated checks

| Command | What it does | Needs emulators? |
|---|---|---|
| `npm run lint` | ESLint over the repo, including layering rules (UI never imports Firebase or repo code) | No |
| `npm run typecheck` | `tsc` for every workspace, seed, rules tests and e2e | No |
| `npm run format:check` / `npm run format` | Prettier check / write | No |
| `npm test` | Jest (shared, functions unit tests, mobile logic tests) and the web Vitest suite | No |
| `npm run test:emulator` | Rules tests and backend emulator integration tests. Starts and stops its own emulators. **Stop `npm run emulators` first** (same ports). | Starts its own |
| `npm run e2e` | End-to-end run of the core loop against already-running, freshly seeded emulators (`firebase/e2e/run.ts`). Real callable HTTP with Auth emulator tokens, plus rules checks. About 63 checks. | Yes, see section 9 |

Last recorded results (task 3.3, 2026-10-19): typecheck, lint, format check, `npm test` (373 Jest + 113 web), `npm run test:emulator` (137) and `npm run e2e` (63 checks) all passed.

---

## 8. Repo layout

```
apps/mobile      Expo app (Learner, Instructor, Volunteer)
apps/web         React + Vite app (Admin, Community Partner)
packages/shared  types, enums, zod schemas, constants, MapProvider (OneMap and stub)
functions/       Cloud Functions (transactional rules), bundled by esbuild to functions/lib
firebase/        emulator config, firestore.rules, storage.rules, indexes, seed, rules tests, e2e
docs/            coordination and documentation hub
```

Feature modules (mobile and web and functions): `auth`, `workshops`, `bookings`, `attendance`, `vouchers`, `users`, plus `venues` and `reports`. Each feature follows `ui/ -> controller/ -> repo/`. Business-critical rules (capacity, duplicate booking, single attendance, voucher redeem) run in Cloud Function transactions, not in clients (ADR-005). See `architecture.md` for layering and transaction designs.

---

## 9. Known gotchas

1. **`npm run e2e` needs freshly started and freshly seeded emulators.** It writes data (books, scans, redeems) and is not idempotent. A rerun on a dirty emulator fails in `redeemVoucher`. Before each run:
   ```sh
   # Terminal 1: stop npm run emulators (Ctrl+C), then start again
   npm run emulators
   # Terminal 2
   FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 npm run seed
   npm run e2e
   ```
2. **`functions/.env.local` needs `DEMO_IGNORE_CHECKIN_WINDOW=true`** for the e2e run and for the check-in demo. Without it, attendance outside the window fails with SESSION_NOT_ACTIVE. The flag is honoured only in emulators (`functions/src/common/config.ts`), so it has no effect in a real deploy. The shipped examples default to `false`. Restart the emulators after changing the file.
3. **Clear the Expo cache when Metro serves stale code.** After edits, if the app shows old behaviour, run `npm run dev:mobile -- -c` (equivalent to `expo start -c`). This happened during 2.1.
4. **`expo start` rewrites `apps/mobile/tsconfig.json`.** Run Prettier afterwards: `npx prettier --write apps/mobile/tsconfig.json`, or `npm run format` to fix everything.
5. **No real Singpass.** `AUTH_MODE=mock` is the only working mode. `AUTH_MODE=singpass` returns SINGPASS_UNAVAILABLE. The mock refuses to run outside the emulators. Do not try to connect a real Singpass account.
6. **Ports are shared.** The emulators, `npm run test:emulator` and `npm run e2e` all need ports 8080, 9099, 9199 and 4000/5001. If a run says "port taken", find the holder with `lsof -i :8080` and stop it. Kill stray `java` processes left by crashed emulator runs.
7. **Camera scanning is untested on devices.** It needs a physical phone, or HTTPS/localhost on web. Use the manual ticket-code entry in simulators.
8. **Offline ticket on cold start.** Cached claims let the ticket open when the ID token has expired and the device is offline (review H2 fix). Not verified on a device yet.
9. **The rules trust the `status` claim for up to 1 hour.** A suspended user can still read their own data through Firestore/Storage rules until the token expires, but callables block them immediately (ADR-025). Do not treat suspension as instant for data reads in a demo.
10. **Seed data is relative to the clock.** If upcoming workshops look past, reseed.
11. **Enum-based types and seed unions.** `packages/shared/src/enums.ts` is fixed. The seed still uses two local literal unions (`bookings.ts` status, `vouchers.ts` counts) as a workaround. They can be removed later.
12. **Staff login is case-insensitive** for the user id (server lowercases), but the email is also lowercased. If sign-in fails with "Invalid Credentials", check the spelling of the staff id first.
13. **Web and mobile both have "2.x" tasks.** Progress IDs 2.1 to 2.6 are mobile; 2.7 to 2.10 are web. Handoff file names reuse "2.2" for the mobile Learner and the web foundation. See `progress.md`.

---

## 10. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `npm run seed` exits with a refusal message | One of the two `*_EMULATOR_HOST` variables is missing, or the project id does not start with `demo-`. Use the exact command in section 3. |
| `npm run emulators` fails with "port taken" | Another emulator run is still going. Stop it, or kill the holder of the port. |
| Login says "Invalid Credentials" for staff | Wrong staff id or password, or the emulators were reseeded with new `SEED_*` values. Reseed with the same values. |
| Login says "Account suspended" | The account was suspended in a test. Log in as `admin01`, open Accounts, and reactivate it. |
| Callable returns `INTERNAL` after an admin suspend or reactivate | The Auth step failed after the Firestore commit. Retry the same action: SUSPEND on a suspended user and REACTIVATE on an active one now re-apply only the Auth state (review M1 fix). Check the audit entry with `authSyncFailed`. |
| Mobile shows an old screen after edits | Metro cache. `npm run dev:mobile -- -c`. |
| Mobile "could not be found" on a workshop | Rules hide non-OPEN workshops from learners and volunteers. Expected for DRAFT or ARCHIVED ones. |
| Functions change not visible | Restart `npm run emulators` (rebuilds the bundle), or keep `npm run build:watch -w @silveracademy/functions` running. |
| Check-in says SESSION_NOT_ACTIVE | Workshop outside its check-in window, or the flag is not set. See gotcha 2. |
| Web upload preview disagrees with server | The preview mirrors the shared rules; the server result is authoritative. |

---

## 11. Onboarding a new developer

1. Read the root `README.md`, then this guide, sections 2 to 6.
2. Read `CLAUDE.md` (project rules), `docs/README.md` (index), `docs/progress.md` and the latest files in `docs/handoffs/`.
3. Read `docs/architecture.md` (layers, data model, transactions) and `docs/decisions.md` (ADR log).
4. Run the demo: Flow A, then Flow B. This takes about 20 minutes once the emulators are up.
5. Read `docs/known-limitations.md` before you change anything in a flagged area, and `docs/next-steps.md` for the priority list.
6. Each feature folder has a `README.md`. For a backend change, follow the recipe in `docs/handoffs/1.1-auth-infra.md`.
7. Rule for agents and humans: a task is done only when its handoff is written and `progress.md` and the checklists are updated. Never commit or push without the owner's approval.
