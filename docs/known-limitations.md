# Known Limitations

Consolidated from the handoffs in `handoffs/` and from `review-findings.md` (task 3.2, with fixes in 3.3). Each item says what is wrong, why it matters for a demo or for the product, and where to look. Items are grouped by area. "Accepted" means a decision was made in an ADR or handoff not to fix it for the prototype.

Read this before you demo the app or change one of the flagged areas. Priority order for fixing is in `next-steps.md`.

---

## 1. Verification gaps (what has and has not been run)

| # | Area | What is not verified | Source |
|---|------|----------------------|--------|
| V1 | Mobile on real devices | Nothing has run on a physical phone or on an iOS/Android simulator. Only `expo export` (web, iOS) bundles were checked, and the mobile web preview was smoke-tested in 3.1. | 2.1, 2.2, 3.1 |
| V2 | Mobile UI flows | 3.1 covered backend calls for these, but not the screens: scanner camera and manual-code UI, create workshop form, venue map request, redeem screen, volunteer screens, report with attachment upload, feedback form, offline ticket. | 3.1 |
| V3 | Web mutation flows | Page loads and deep links were checked in the browser. Not clicked: approve request, add facility and slots, upload CSV, incident updates, suspend or flag via UI. Backend paths are covered by `npm run e2e` and emulator tests. | 3.1 |
| V4 | Web component tests | Vitest runs in the Node environment. Only pure logic is tested. There are no DOM or component tests, and no accessibility audit with a screen reader. | 2.2, 2.8, 2.9, 2.10 |
| V5 | Mobile component tests | Jest cannot import `react-native` in the mobile project. Only pure logic is tested. | 2.1 |
| V6 | Offline ticket | Cached ticket display is designed (ADR-019) and the cold-start fix (H2) is unit-tested, but it has not been run with a real network drop on a device. | 2.2, 3.3 |
| V7 | Storage uploads | Report attachment upload has not been run end to end with the Storage emulator through the mobile app. | 2.6 |
| V8 | Location | Location permission flows on device and on web (browser permission, HTTPS or localhost only) are untested. | 2.2, 2.4, 2.6 |
| V9 | NFR checks | The phase 3 NFR checks are open: scan under 3 s, search under 2 s on seed data, 44 px targets (checked in code only), offline ticket. | `checklists/phase3-quality.md` |
| V10 | OneMap | The OneMap provider has never been called live. CORS from the browser and token availability are unverified. The stub is the default. | 1.6, 2.8 |
| V11 | Emulator HTTP path | Emulator tests for the venues, workshops and users modules call the exported handler functions, not the deployed callables over HTTP. The e2e run does use HTTP for the core loop. | 1.5 |
| V12 | Seeded data after time passes | Seed data is relative to the run time. Seeded windows shift on each reseed; `senior-49-edge` becomes a senior instructor on 2027-06-30 on a reseed. | 0.5 |

---

## 2. Scope gaps (product and spec)

| # | Area | Limitation | Source |
|---|------|------------|--------|
| S1 | Singpass | **Singpass is mocked** (ADR-001). `AUTH_MODE=mock` is the only working mode. `AUTH_MODE=singpass` returns `SINGPASS_UNAVAILABLE`. The mock picker only exists in the emulator. Singpass logins are not audited. | 1.1, dev-guide |
| S2 | Map | The venue map is a **schematic pin plot** with no tiles (`react-native-maps` or WebView would be needed for OneMap tiles). The web venue form takes numeric coordinates. | 2.3, 2.8 |
| S3 | Learner location | "Selected location" by postal code (ADR-018) is not built. Only device location is used for "Nearest". | 2.2 |
| S4 | Date filter | The Discover date range is a text field (YYYY-MM-DD), not a date picker. No date-picker library is installed. | 2.2 |
| S5 | Feedback | Feedback (#2-4) is built on mobile with a fixed tag list. Its use case was marked "deferred" in the first `functions.md` draft, and that marking is now stale. | 2.6 |
| S6 | Reporter reply | A reporter cannot answer an AWAITING_INFO request (L7). The app shows the request but has no reply action. Spec gap #5-3. | review L7 |
| S7 | Curriculum review | Curriculum review is deferred (ADR-009). Only instructor profile review is built (#5-5). | ADR-009, 1.7 |
| S8 | Organisation onboarding | No use case for CP organisation onboarding (requirements-map gap; ADR-021). Partner and admin accounts are created by seed or the admin callable. | ADR-021 |
| S9 | Profile resubmission | Instructor profile resubmission is supported (REJECTED or REQUIRES_REVISION), but it is not in any use case. | ADR-021 |
| S10 | Use case #1-1 | The PDF text has no #1-1 use case; the count of use cases in the spec is therefore 24 described, plus diagram-only entries. | `checklists/use-case-coverage.md` |
| S11 | Mockup extras | The PDF mockups show elements that are **not** in the implemented scope: voice search and "Listen" text-to-speech, SkillsFuture and subsidy labels, a "FairPrice voucher goal" progress card, a live "Check-ins" feed, and "Save Offline Pass" export. The demo should not promise them. | PDF section 8 |
| S12 | Notifications | In-app notifications only (ADR-016). Notifications are fetched once on Profile mount, last 20 items, with no pull-to-refresh. | 2.6, ADR-016 |
| S13 | Ticket and voucher display | Vouchers are shown as large text only; there is no barcode library. Wallet tier selection is visual only. | 2.5 |
| S14 | Mode switching | A user with VOLUNTEER plus LEARNER only sees the Learner shell; the server never produces that combination. Text size is local only (not synced to `prefs.fontScale`). | 2.1 |
| S15 | Icons and copy | No icon set is installed; tab bars are text labels. Copy is English only, in `strings/` and `i18n/en/`. Task 2.11 covers polish. | 2.1, 2.11 |

---

## 3. Security and authorisation (from the review)

### 3.1 Deferred or accepted from `review-findings.md`

| # | Finding | Status | Impact |
|---|---------|--------|--------|
| SEC1 | **H1 hardening.** The roster no longer shows ticket codes (fixed). An instructor can still type a learner's code verbally and award points through the manual path. Ideas not done: points only for `method: 'QR'`, or cap MANUAL check-ins per workshop and flag them for admin review. | Partly fixed | An instructor can take points for a learner who is absent, if the learner gives the code. |
| SEC2 | **M2 rules window.** Firestore and Storage rules trust the `status` claim. A suspended user keeps rules-based reads (own bookings, wallet, notifications, report uploads) for up to 1 hour. Callables block them immediately. | Accepted (ADR-025) | Data-read exposure for up to 1 h after suspension. |
| SEC3 | **M1 residual.** The suspend and reactivate Auth step runs after the Firestore commit (cannot be in the transaction). A failure returns INTERNAL while `users.status` is already changed. A retry now re-runs only the Auth step (fixed), but an admin must know to retry. | Partly fixed | Auth state can lag the Firestore status until a retry succeeds. |
| SEC4 | **M3 server-side audit.** `recordStaffLogin` FAILURE and BLOCKED are client-reported and rate-limited (5 per minute per known id, 10 per minute for unknown ids, 60 overall). Server-side sign-in audit needs Identity Platform blocking functions, which need a real project. | Partly fixed | Failed real sign-ins are not logged server-side; audit entries for failures are client-reported. |
| SEC5 | **M5 storage CORS.** Attachments use `getBlob` through the storage rules (fixed). A real bucket needs CORS configured for the web origin. Not testable on the emulator. | Partly fixed | Attachments fail to load on a real deploy until CORS is set. |
| SEC6 | **L5 admin reasons reach learners.** Cancellation and status reasons are copied into learner notifications. `cancelReason` is readable by all browsing roles, and `flagReason` is readable by the user themselves. | Deferred | Internal text (incident references) can reach learners. Needs a `publicReason` field and a UI change. |
| SEC7 | **L6 attachment cap.** Any active user, including CP and admin roles, can upload unlimited 5 MB report attachments. Nothing is cleaned up. | Deferred | Storage growth and misuse. Fix: restrict the role in `storage.rules`, add a per-user cap, add a cleanup job. |
| SEC8 | **L8 static QR.** The QR payload has no nonce or expiry (ADR-017). A screenshot of a learner's QR can check that learner in once. | Accepted (ADR-017) | Proxy check-in once per screenshot. |
| SEC9 | **L9 ticket cache on shared devices.** `tickets:v1:<uid>` survives sign-out. | Deferred | Next user of the same phone can see the previous user's QR. Needs a product decision. |
| SEC10 | **L12 TOCTOU.** A suspension can race an in-flight call that started before the suspension commits. | Accepted | Negligible. |
| SEC11 | **Audit gaps.** Denied scans are not audited. Bookings have no audit action. The attendance audit action `ATTENDANCE_RECORD` was added in 1.3. | Accepted | Booking history is only visible from `bookings` documents. |

### 3.2 Fixed in 3.3 (for reference)

H1 (roster no longer returns ticket codes), H2 (offline claims fallback), M1 (idempotent Auth resync), M2 (claim status from the user doc at login), M3 (rate limiting), M4 (archive and reject state rules), M5 (`getBlob` attachments), L1 (no version bump on login), L2 (lowercase staff ids), L3 (late approval re-check), L4 (archive notifies learners), L10 (demo flag defaults to false and is honoured only in emulators).

---

## 4. Backend behaviour limitations

| # | Area | Limitation | Source |
|---|------|------------|--------|
| B1 | Booking | No audit entry for bookings. `AUDIT_ACTIONS` has no booking action. | 1.2 |
| B2 | Booking | Ticket code uniqueness within a workshop is probabilistic (40 bits, not enforced). Attendance uses a query that expects exactly one match. | 1.2, 1.3 |
| B3 | Booking | A CANCELLED booking still blocks rebooking (ALREADY_BOOKED). Learners cannot cancel their own bookings (ADR-013). | 1.2, 2.2 |
| B4 | Contention | Under very high contention a transaction can run out of attempts and return BUSY_TRY_AGAIN. Not seen with 20 parallel calls on the emulator. | 1.2 |
| B5 | Attendance | Ticket lookup runs before the staff check, so an unassigned staff member can tell TICKET_NOT_FOUND from NOT_AUTHORISED_FOR_WORKSHOP for a workshop id. Acceptable for the prototype. | 1.3 |
| B6 | Attendance | The workshop `version` is not bumped by attendance, so admin edits during a session do not hit STALE_VERSION. | 1.3 |
| B7 | Venues | `adminUpdateWorkshop` can raise capacity above the venue capacity on an OPEN workshop (L3 related, deferred). | review L3, 1.7 |
| B8 | Venues | Facility capacity edits do not re-validate existing requests or workshops. | 1.5 |
| B9 | Venues | Slot overlap query assumes slots are at most `MAX_SLOT_HOURS` long. | 1.5 |
| B10 | Admin edits | Title, description and category edits do not update copies in `bookings.workshopSnapshot`, `venueRequests.workshopSummary` or workshop-derived notifications. Bookings keep the title from booking time. | 1.7, 2.9 |
| B11 | Cancellation | Cancelling a workshop does not mark `volunteerAssignments` as WITHDRAWN, and it does not refund anything. | 1.7 |
| B12 | Incidents | `incidentId` on `adminSetStatus` is recorded in the audit only; its existence is not checked. `submitReport` does not check that `relatedWorkshopId` or `relatedUserId` exist. | 1.7 |
| B13 | Incidents | `updateIncident` accepts a text-only update on an open incident. `reporterRole` is the first of LEARNER, SENIOR_INSTRUCTOR, VOLUNTEER the caller holds. | 1.7 |
| B14 | Preferences | `updatePreferences` with a `lastMode` not held returns INVALID_INPUT (`fieldErrors.lastMode`), which the function catalogue does not list. | 1.7 |
| B15 | Vouchers | Tier ids are case-sensitive (`provider` is not uppercased). `listMyVouchers` returns every claimed voucher with no paging. | 1.4 |
| B16 | Vouchers | More than 400 rows: the handler returns UPLOAD_TOO_LARGE above `MAX_UPLOAD_ROWS` (fixed in 3.1). The web UI also caps at 400 rows. | 1.4, 3.1 |
| B17 | Venues | The web and mobile "suggest another slot" is not offered for a CONFLICTED request (the server only accepts decisions on PENDING requests). | 2.8 |
| B18 | Logging | `toHttpsError` logs unknown errors with the raw error object. Voucher code paths never put a code into an error; keep it that way. | 1.4 |
| B19 | Rules | `workshops` reads are restricted to OPEN, COMPLETED, CANCELLED, or the instructor's own. Community partners cannot read workshops at all. Learner and volunteer lists silently hide ARCHIVED and DRAFT workshops. | 1.1, 2.2, 2.6 |
| B20 | Layering | The rule that cross-feature imports go through `index.ts` is not lint-enforced (ESLint only blocks Firebase and UI imports in controllers and repos). | 0.3 |

---

## 5. Frontend behaviour limitations

| # | Area | Limitation | Source |
|---|------|------------|--------|
| F1 | Mobile scanner | Camera scanning is untested on a device. Web camera needs HTTPS or localhost. Volunteer rows have no `endAt`, so no check-in window badge (the server still enforces it). Roster does not auto-refresh after a scan. No sound feedback. | 2.4 |
| F2 | Mobile wallet | Offline detection uses Firestore cache metadata with a 3 s grace period; not exercised with a real offline device. | 2.5 |
| F3 | Mobile report | The form has no "related workshop or user" fields (optional in the API) and only one attachment (the API allows 3). Upload failure submits nothing (by design). | 2.6 |
| F4 | Mobile feedback | Preset tag list only. Feedback entry is on the Profile tab for learners only. | 2.6 |
| F5 | Mobile Assigned | Workshops unreadable by rules (for example ARCHIVED) are hidden. | 2.6 |
| F6 | Mobile My Bookings | The Ticket screen reloads the whole list to find one booking. Fine at this scale. | 2.2 |
| F7 | Mobile mode toggle | Only the mode toggle switches accounts. Expo `expo start` rewrites `apps/mobile/tsconfig.json`; run Prettier afterwards. | 2.1 |
| F8 | Mobile web | Cosmetic: a bottom-tab href with nested route params renders `?screen=Ticket&params=[object Object]` on mobile web only. | 3.1 |
| F9 | Mobile Metro | Metro once served a stale module during dev. Fix: `expo start -c`. | 2.1 |
| F10 | Web data loads | Data is loaded with one-shot reads and a Refresh button, not live listeners. New requests need a refresh. | 2.8 |
| F11 | Web Admin lists | Role and status filters are client-side over at most 200 users and 300 workshops. Name search is a prefix search on the lowercase display name. Incident list shows the latest 100 with no paging. The reporter is shown by uid. | 2.9, 2.10 |
| F12 | Web admin cancel preview | "Upcoming" in the cancel and archive preview uses the client clock; the backend is authoritative and its error triggers a refresh. | 2.9 |
| F13 | Web sessions | Sessions that expire mid-use are not detected globally. Each feature must handle UNAUTHENTICATED and ACCOUNT_SUSPENDED. | 2.2 |
| F14 | Web calendar | The slot "calendar" is a day-grouped list, not a month grid. `datetime-local` uses the browser time zone (assumed Singapore). | 2.8 |
| F15 | Web map | The web map has no tiles; coordinates are numeric fields. The web OneMap lookup is untested (V10). | 2.8 |
| F16 | Web bundle | Production bundle is about 820 kB (firebase and zod), with no code splitting. | 2.2 |
| F17 | Web hooks | `useLoad`, `formatTimestamp` and similar hooks are duplicated in several features (the venues version differs). | 2.8, 2.9, 3.1 |

---

## 6. Build and tooling

| # | Area | Limitation | Source |
|---|------|------------|--------|
| T1 | Shared enums | Fixed in `packages/shared/src/enums.ts` (const generics). The seed keeps two local literal unions as a workaround (`bookings.ts` status, `vouchers.ts` counts). | 0.5 |
| T2 | Dependencies | `npm audit` reports vulnerabilities in transitive dependencies. Not addressed. | 0.3 |
| T3 | Emulator tests | `npm run test:emulator` prints "did not exit one second after the test run" (open firebase-admin handles). Exit code is 0. | 1.3 |
| T4 | Emulator runs | Stray `java` processes from crashed runs keep the ports busy. Kill them before rerunning. | 1.5 |
| T5 | Functions emulator | The emulator warns "node 22 vs global 26". Harmless. | 1.1 |
| T6 | Expo rewrites | `expo start` rewrites `apps/mobile/tsconfig.json` (see F7). | 2.1 |
| T7 | Seed | The seed refuses to run outside the emulators; the staff passwords are emulator defaults and must not be reused. | 0.5 |
| T8 | Per-module READMEs | The phase 3 checklist asks for a README per module. Module READMEs exist, but their completeness was not audited in 3.4. | `checklists/phase3-quality.md` |
| T9 | Map module | The map provider's 10 fixtures differ from the ~20 in architecture.md. The seed keeps its own list. | 1.6 |
| T10 | Documentation drift | `docs/api/functions.md` per-row error columns (L11) are fixed in 3.4. The `UPLOAD_TOO_LARGE` row is correct now (3.1). | review L11, 3.1 |

---

## 7. Demo-specific reminders

- **Check-in window.** Attendance demos need `DEMO_IGNORE_CHECKIN_WINDOW=true` in `functions/.env.local` and an emulator restart. Without it the check-in fails with SESSION_NOT_ACTIVE, outside a 60-minute-before to 30-minutes-after window.
- **e2e is not repeatable on a dirty emulator.** Restart and reseed before `npm run e2e`.
- **Do not show the mockup extras (S11) as features.**
- **Ticket codes shown in the demo are fictional.** Real Singpass data never appears.
