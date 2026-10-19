# Decision Log (ADR)

Format: context, decision, consequences. Append new entries at the bottom.

## ADR-001: Mock Singpass behind AuthProvider
- Context: Real Singpass requires government onboarding.
- Decision: Implement a fake Singpass login with test profiles (including age) behind an `AuthProvider` interface.
- Consequences: Prototype runs without credentials; real Singpass is a one-file swap.

## ADR-002: Firebase Local Emulator Suite
- Context: No cloud account or billing should be needed to run the demo.
- Decision: Develop and demo against emulators (Auth, Firestore, Functions, Storage); real project wired later via env config.
- Consequences: Reproducible local setup; seed script required.

## ADR-003: OneMap behind MapProvider
- Context: OneMap needs an API token and may be unavailable; spec requires a list-view fallback.
- Decision: Access maps/geocoding only via a `MapProvider` interface with a OneMap implementation and a fixture-based stub.
- Consequences: Works offline; satisfies NFR 6.2.

## ADR-004: Monorepo with feature modules
- Context: NFR 6.1 requires modular separation; web, mobile and functions share types.
- Decision: Single monorepo; feature modules (auth, workshops, bookings, attendance, vouchers, users, venues, reports) layered ui -> controller -> repo -> types; shared package for entities and zod schemas.
- Consequences: Code maps 1:1 to the PDF's boundary/control/entity design; parallel agents can own disjoint folders.

## ADR-005: Clients are read-only; all writes go through callable functions
- Context: Capacity, once-only attendance, voucher atomicity and RBAC must hold even against a modified client (NFR 1.2, 4.x).
- Decision: Firestore rules deny every client write. Each mutation is a callable function (`<feature>-<name>`) that re-checks the caller against `users/{uid}`. Only Storage report attachments are uploaded directly.
- Consequences: One place per rule, rules are simple read gates, every rule is unit-testable as a pure `decide*` function. Slightly more functions to write.

## ADR-006: Authentication mechanics
- Context: Singpass is mocked (ADR-001); spec #0-2 says User ID + password while FR 6.1 says "enterprise credentials" (ambiguity 11).
- Decision: Mobile: `AuthProvider.authenticate()` → `auth-exchangeSingpass` (server verifies assertion, derives age, returns a Firebase custom token with claims `{ roles, status }`). Web: local credentials via Firebase email/password (`<userId>@staff.silveracademy.test`); Firebase hashes passwords (NFR 1.3). Enterprise SSO deferred. Suspension sets Auth `disabled`, updates claims and revokes tokens.
- Consequences: Real Singpass only replaces the mobile provider and the server `SingpassVerifier`. Login attempts audited via `auth-recordStaffLogin`.

## ADR-007: Use case numbering and duplicates
- Context: Ambiguities 1-6: 24 UCs (not 26), #1-6 self-reference, #4-2 description/preconditions copied, two "ScanAttendance" UCs, stray includes.
- Decision: Use the 24 IDs as-is. Treat #1-6 as extending #1-5. #4-2 preconditions = "a PENDING or AWAITING_INFO request exists for a facility owned by the CP". #1-4 and #3-4 share one function (`attendance-recordAttendance`) and one scanner screen; the Volunteer precondition is assignment, not the opt-in include.
- Consequences: File header comments cite both IDs where shared (e.g. `// UC #1-4, #3-4 ScanAttendance`).

## ADR-008: Roles vs mode; Volunteers use Singpass
- Context: FR 1.1 includes Volunteers in Singpass login, NFR 1.1 omits them (ambiguity 12); FR 1.3 needs a role toggle without logout.
- Decision: Volunteers also log in with Singpass. First login asks "Join as Learner or Volunteer" (`registerAs`). LEARNER registration gets `SENIOR_INSTRUCTOR` too when age >= 50. Authorization is by role set; the Learner/SI toggle is a UI-only `mode` (persisted as `prefs.lastMode`), never checked by rules.
- Consequences: Toggling mode needs no token refresh. A 50+ user can book others' workshops but not their own.

## ADR-009: Workshop lifecycle; instructor approval gates, curriculum review deferred
- Context: Statuses not enumerated (ambiguity 20); unclear whether curriculum approval must precede workshops (ambiguity 16); "appropriate registration status" undefined.
- Decision: `DRAFT → PENDING_VENUE → OPEN → COMPLETED`, plus `CANCELLED` and `ARCHIVED` (admin). Workshop creation needs an APPROVED instructor profile only. A workshop becomes OPEN (published) when its venue request is approved, since date/time/location come from the slot. Curriculum review is deferred: no gate. "Active session" = `startAt - 60 min .. endAt + 30 min` (`DEMO_IGNORE_CHECKIN_WINDOW` env for demos). "Session" == workshop (one occurrence each). COMPLETED is set by admin only; UIs treat `endAt < now` as concluded.
- Consequences: No scheduled jobs. Adding curriculum review later = a `curriculumStatus` field checked in `venues-requestVenue`.

## ADR-010: Points award and terminology
- Context: #1-4 postcondition always awards a point, step 8 only when the SI scans (ambiguity 7); points/credits/milestones mixed (ambiguity 8).
- Decision: Every verified attendance awards `POINTS_PER_ATTENDANCE = 1` to the workshop's instructor, whoever scans. Volunteers earn nothing. UI uses "points" everywhere; wallet = balance + ledger.
- Consequences: Volunteer assistant mode does not penalise the SI; the wallet equals the count of verified scans minus redemptions (matches #1-5 assumption).

## ADR-011: Voucher tiers, eligibility and formats
- Context: Ambiguities 8, 9, 10, 27 (no denomination mapping, "Unclaimed" vs "Available", undefined milestone, undefined code/file format).
- Decision: `voucherTiers` (`provider_denomination`) each carry `pointsCost` (seed default = SGD x `POINTS_PER_SGD` (2)). Eligible = account ACTIVE + profile APPROVED + `balance >= pointsCost`; no separate milestone. Status name `AVAILABLE` (= "Unclaimed"). Code = `/^[A-Z0-9-]{8,32}$/` after trim+uppercase; upload = CSV `provider,denomination,code` parsed in the web app, max 400 rows per call. Invalid/duplicate rows are rejected and reported; valid rows commit atomically.
- Consequences: Tiers must exist before upload (`UNKNOWN_TIER`).

## ADR-012: Isolated voucher store
- Context: NFR 6.3 requires voucher inventory isolated from user data; FR 6.29 notes avoid exposing codes.
- Decision: Codes live only in `voucherInventory` (doc id = sha256 of code, which also enforces dedupe). Rules deny all client access. Codes leave only via `vouchers-redeemVoucher` and `vouchers-listMyVouchers`; ledger, audit logs and admin listings carry masked codes or ids.
- Consequences: Admin inventory browsing is a callable; counts come from `voucherTiers.counts`.

## ADR-013: Booking identity, no learner cancellation
- Context: FR 3.8 duplicate prevention; no FR for learner cancellation; free admission (ambiguity 19).
- Decision: Booking id = `${workshopId}_${learnerId}`; the booking doc is the digital ticket. No learner cancellation in the prototype; bookings become CANCELLED only when an admin cancels the workshop. No payment concept.
- Consequences: Duplicate check is one `tx.get`; adding cancellation later must decrement `seatsTaken` in a transaction and decide on rebooking.

## ADR-014: Volunteer opt-in auto-assigns
- Context: Opt-in (#3-2) vs required assignment (#3-3, #3-4); no assign/approve UC; no withdrawal (ambiguities 5, 13).
- Decision: Opt-in immediately creates an `ASSIGNED` record while `volunteersAssigned < volunteerSlots` (set by the SI at creation). Volunteers may withdraw before start. No SI/admin approval step.
- Consequences: "Assigned" and "opted in" are the same state; roster and scanning check `status == 'ASSIGNED'`.

## ADR-015: Venue request states and slot locking
- Context: #4-2 adds Awaiting Info and Conflicted (ambiguity 4); "Add Facility" and recurring availability unspecified (ambiguity 17, #4-1 note).
- Decision: Request states `PENDING, AWAITING_INFO, APPROVED, REJECTED, CONFLICTED, WITHDRAWN`. Requests do not hold slots; approval locks the slot (`BOOKED`) in the same transaction and marks competing requests CONFLICTED. A CONFLICTED/REJECTED request returns the workshop to DRAFT so the SI can re-request. CP may attach `suggestedSlotId`. Facilities are created by CPs (`venues-upsertFacility`); CP organisations are pre-approved via seed. Recurring availability and admin escalation are deferred.
- Consequences: One active request per workshop (`workshops.activeVenueRequestId`).

## ADR-016: In-app notifications only
- Context: FR 5.9, 6.21 and BookWorkshops notes require notifications; SLA undefined (ambiguities 17, 26).
- Decision: Functions write `notifications/{id}` in the same transaction as the triggering change; apps show an inbox. No push or email; no SLA.
- Consequences: Push can later be a Firestore trigger on `notifications`.

## ADR-017: Signed QR payload plus short ticket code
- Context: QR must be tamper resistant; manual booking-ID fallback (#1-4 Ex4) is not in the FRs (ambiguity 23) and must be typeable by seniors.
- Decision: QR = `SA1.<bookingId>.<HMAC-SHA256 truncated to 22 base64url chars>`, key only in functions. Manual fallback uses an 8-char Crockford base32 `ticketCode` scoped to the selected workshop. Both paths go through the same attendance transaction.
- Consequences: Learner app renders the QR from the stored payload offline; key rotation via the version prefix.

## ADR-018: Search and recommendations computed client-side
- Context: FR 3.2-3.5 need keyword + multi-filter + distance sort + recommendations (ambiguities 21, 22); Firestore cannot combine these in one query.
- Decision: Query OPEN upcoming workshops (limit 200), then filter/sort/recommend with pure shared functions. Category taxonomy is a fixed enum in shared constants (admins edit a workshop's category, not the taxonomy). "Selected location" = device location or a geocoded postal code.
- Consequences: Meets NFR 3.4 for the project dataset; replace with a search index if data grows.

## ADR-019: Offline digital ticket via local cache
- Context: NFR 4.5; the Firebase JS SDK has no persistent cache on React Native.
- Decision: The bookings repo mirrors the learner's bookings (incl. `qrPayload`, `ticketCode`, snapshot) to AsyncStorage key `tickets:v1:<uid>` on every successful read; the ticket screen falls back to it when offline.
- Consequences: Ticket shows "last updated" time when served from cache.

## ADR-020: Reports and incident workflow (thin)
- Context: Who can report (ambiguity 14), cancellation/rescheduling (15), severity/SLA placeholders (26).
- Decision: Learners, SIs and Volunteers can submit reports. Statuses `SUBMITTED, UNDER_REVIEW, AWAITING_INFO, RESOLVED, CLOSED` with fixed transitions. Admins may cancel a workshop from Manage Workshops or from an incident (reason required, impact confirmation when bookings exist). Rescheduling, severity levels and response targets are deferred. Reference number = `SA-YYMMDD-XXXXX`.
- Consequences: The incident doc id is the reference number, so lookups need no index.

## ADR-021: Admin account scope and missing onboarding use cases
- Context: Ambiguities 17, 25, 26.
- Decision: Admins can flag/suspend/reactivate any non-admin account (Learner, SI, Volunteer, CP); admin accounts and self are excluded; no secondary approval. SI profile submission is added (`users-submitInstructorProfile`). CP/Admin accounts are pre-created by seed; optional `users-createStaffAccount` for onboarding. Learner/Volunteer registration happens at first Singpass login.
- Consequences: All admin status changes and denials are audited.

## ADR-022: Feedback window and aggregation
- Context: Ambiguity 18; #2-4 is deferred to a stub in the prototype.
- Decision: Feedback allowed only with an attendance record, once per booking, within 7 days after `endAt`. Ratings aggregated as `ratingSum/ratingCount` on the workshop and instructor profile in the same transaction.
- Consequences: Function is specified; UI may remain a stub.

## ADR-023: Module list extends NFR 6.1
- Context: NFR 6.1 lists six modules; venues and reports have no home (ambiguity 24).
- Decision: Eight feature modules: auth, users, workshops (incl. volunteer opt-in and feedback), bookings (incl. roster), attendance, vouchers (incl. wallet/ledger), venues, reports.
- Consequences: Matches folder layout in `architecture.md` §1.2.

## ADR-024: Functions bundling and 1.1 deviations
- Context: `@silveracademy/shared` is consumed as TS source, which the Functions runtime cannot load; architecture.md left several auth details open.
- Decision: esbuild (`functions/build.mjs`) bundles `functions/src/index.ts` + shared + zod into `functions/lib/index.js` (CJS, `firebase-admin`/`firebase-functions` external); `engines.node` is `22`. Callables are declared only through `defineCallable` (common/callable.ts). `INTERNAL` is returned as HttpsError `internal` (not `failed-precondition`); clients still read `details.code`. `auth-recordStaffLogin` stores `BLOCKED` as audit outcome `DENIED` (details `reported`), and syncs claims `{roles,status}` on SUCCESS (the seed only writes `roles`). Zod schemas no longer encode REASON_REQUIRED-style rules (reason/message/infoRequest/resolution), so the documented code wins; handlers must check them. `setVoucherStatus.reason` is optional in the schema for the same reason. QR booking ids may contain `-` (seed ids like `ws-01_...`).
- Consequences: Handlers must validate those conditional fields in `decide*`. Rules tests and the functions emulator run on separate Jest config (`jest.emulator.config.js`).


## ADR-025: Review 3.2 fixes and accepted limitations
- Context: independent review (`docs/review-findings.md`) found two High and five Medium issues.
- Decision: The roster never carries `ticketCode` (H1). Mobile caches `{roles,status}` claims per uid and falls back to them when the token refresh fails offline (H2). SUSPEND/REACTIVATE re-run only the Auth step when the state already matches (M1). Login paths take claim status from `users/{uid}.status`, never a literal ACTIVE (M2). Unauthenticated `recordStaffLogin` reports and `auditOnDeny` entries are rate-limited through `rateLimits/{key}` fixed windows (M3). Archiving DRAFT/PENDING_VENUE withdraws the venue request, and reject/withdraw reset only PENDING_VENUE workshops (M4). Web attachments use `getBlob` (M5).
- Known limitation: Firestore and Storage rules trust the `status` token claim. Revoking refresh tokens cannot invalidate an ID token already issued, so a suspended user keeps rules-based read access (own bookings, wallet, notifications, report uploads) for up to 1 hour. Callables are blocked immediately (they read `users/{uid}`). Accepted for the prototype; the fix is an extra `get()` of the user doc in rules or short token lifetimes.
- Consequences: staff user ids are lowercase everywhere (L2); login no longer bumps `users.version` (L1).
