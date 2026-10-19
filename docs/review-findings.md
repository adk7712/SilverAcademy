# Review Findings (Task 3.2)

Read-only review of `functions/src/**`, `firebase/firestore.rules`, `firebase/storage.rules`, `packages/shared` and the client call sites in `apps/mobile` and `apps/web`. I verified every item by reading the code. I did not run the emulators. Line numbers are as of 2026-10-19.

Severity scale: **Critical** = data or money loss that any user can trigger; **High** = breaks a stated NFR or business rule in a realistic scenario; **Medium** = a real defect with limited reach or a workaround; **Low** = hardening, consistency or documentation.

No Critical findings.

---

## High

### H1. Instructors can mark absent learners as attended and collect points (the manual ticket code is shown on the roster)
- **Status: Fixed: `bookings-getRoster` and the roster UI no longer return or show `ticketCode`; learners read their code from their own ticket for manual check-in. Residual: an SI can still ask a learner for a code verbally, which is the intended manual flow (points-for-MANUAL cap deferred).**
- **Where:** `functions/src/bookings/controller/decideRoster.ts:51` (roster returns `ticketCode`), `apps/mobile/src/features/bookings/ui/RosterScreen.tsx:67` (SI roster displays it), `functions/src/attendance/handlers/recordAttendance.ts:36-39` and `functions/src/attendance/repo/attendanceRepo.ts:24-38` (manual path needs only `workshopId` + `ticketCode`).
- **Failure scenario:** An SI opens the class list for their own workshop. During the check-in window, they type each learner's ticket code into Manual Entry. Every booking becomes ATTENDED and the SI earns `POINTS_PER_ATTENDANCE` per learner (ADR-010). They can then redeem real vouchers (`vouchers-redeemVoucher`). Assigned volunteers see the same codes. The QR signature (ADR-017) does nothing to stop this, because the manual path never needs the QR.
- **Suggested fix:** Stop returning `ticketCode` from `bookings-getRoster`, so the learner must read their code from their own ticket screen (#1-4 Ex4). Also consider one of these:
  - award points only for `method: 'QR'`;
  - cap MANUAL check-ins per workshop (for example, at most N or a percentage) and flag them in the audit log for admin review.

  If you remove `ticketCode` from the schema, update `getRosterOutput` in `packages/shared/src/schemas/bookings.ts` and the roster UIs.

### H2. The offline ticket (NFR 4.5) does not open on a cold start once the cached ID token has expired
- **Status: Fixed: claims cached per user (`session:claims:v1:<uid>`); `loadSession` falls back to them when the token refresh fails offline (`claimsWithFallback`, unit-tested), the user-doc read has a timeout, and `hydrate` no longer swallows a rejection into a spinner.**
- **Where:** `apps/mobile/src/features/auth/repo/authRepo.ts:14-19` (`getIdTokenResult` has no catch), `apps/mobile/src/features/auth/controller/loadSession.ts:8-12` (`Promise.all` rejects), `apps/mobile/src/features/auth/controller/SessionProvider.tsx:25-29,41` (`void hydrate(...)`, rejection swallowed, state stays `loading`), `apps/mobile/src/navigation/RootNavigator.tsx:9-15`.
- **Failure scenario:** A learner books a workshop and closes the app. More than an hour later, they arrive at the venue with no signal and open the app. Firebase Auth restores the user from AsyncStorage. `getIdTokenResult(false)` then tries to refresh the expired token and fails with `auth/network-request-failed`. `loadSession` rejects, and the root navigator shows the loading spinner forever. The AsyncStorage ticket mirror (ADR-019) is never reached. This is the exact scenario NFR 4.5 targets.
- **Suggested fix:**
  - In `loadClaims`, catch the network error and fall back to the last known claims. You could persist them next to `tickets:v1:<uid>`, or use `user.getIdTokenResult(false)` errors to go into an "offline" session state.
  - In `hydrate`, catch any rejection and still move to `signedIn`, with an `offline` flag and roles from the cache.
  - Alternatively, render My Bookings and Ticket from the cache whenever `firebaseAuth.currentUser` exists, without waiting for claims.
  - Add a unit test for "claims refresh throws -> session still usable".

---

## Medium

### M1. Suspension can be left half-applied, and an admin retry cannot repair it
- **Status: Fixed: SUSPEND on SUSPENDED and REACTIVATE on ACTIVE are idempotent Auth resyncs (no version bump, no notice); a failed Auth step writes a FAILURE audit entry (`authSyncFailed`).**
- **Where:** `functions/src/users/repo/accountRepo.ts:28-63` (Firestore commit first, then `applyAccountAuthState`), `functions/src/users/repo/accountAuthRepo.ts:19-25`, `functions/src/users/controller/decideAccountAction.ts:66` (SUSPEND when already SUSPENDED is INVALID_TRANSITION).
- **Failure scenario:** The admin suspends a user. The transaction commits `status: SUSPENDED`, and then `auth.updateUser` or `setCustomUserClaims` fails (Auth emulator hiccup, quota). The admin gets INTERNAL. Firebase Auth still has `disabled: false` and the claims still say `status: ACTIVE`. Callables are blocked because `requireCaller` reads `users/{uid}`, but Firestore and Storage rules trust the claim (`firestore.rules:8`, `storage.rules:6`). The suspended user keeps reading their own data and can keep uploading report attachments. When the admin retries SUSPEND, they get INVALID_TRANSITION, so the Auth step can never be re-run. The only way out is REACTIVATE followed by SUSPEND.
- **Suggested fix:** Make the Auth step idempotent and retryable. Allow `SUSPEND` on an already-SUSPENDED user to re-apply only the Auth state (no version bump, no notify), or add an admin "resync auth" path. Alternatively, apply the Auth state first and roll it back if the transaction fails. Log the partial state in the audit entry.

### M2. A suspended user keeps rules-based read access for up to an hour, and a racing login can write ACTIVE claims back
- **Status: Fixed (claims race) / Deferred (rules window): login paths derive claim status from the Firestore user doc (`syncClaimsFromUserDoc`, re-read and converge) and refuse a suspended account. The up-to-1h rules read window is documented as a known limitation in ADR-025.**
- **Where:** `firebase/firestore.rules:8` and `firebase/storage.rules:6` (status is read from token claims), `functions/src/auth/handlers/exchangeSingpass.ts:20-22` and `functions/src/auth/repo/claimsRepo.ts:26-34` (claims hard-coded `status: 'ACTIVE'` after the login transaction), `functions/src/auth/handlers/recordStaffLogin.ts:42` (same).
- **Failure scenario:**
  1. Revoking refresh tokens does not invalidate an ID token that is already issued, and rules cannot check revocation. A suspended user (learner, SI, volunteer or CP) can therefore read their own bookings, wallet, notifications, venue requests and so on until that token expires (up to 1 h).
  2. A race makes this worse. The login transaction commits (still ACTIVE), the admin's SUSPEND commits and runs `setCustomUserClaims(SUSPENDED)`, and then `exchangeSingpass` runs `syncClaims(ACTIVE)` and overwrites it. The Auth user ends up `disabled` but with ACTIVE claims, which is inconsistent and stays that way until the next REACTIVATE.
- **Suggested fix:**
  - For sensitive reads, have rules also check `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.status == 'ACTIVE'`. This costs one extra read per request. Alternatively, accept the gap and document the ≤1 h window in `architecture.md` §3.2.
  - In `exchangeSingpass` and `recordStaffLogin`, re-read `users/{uid}.status` right before `syncClaims` and write that value, never a literal `'ACTIVE'`.

### M3. Unauthenticated callers can flood or forge the audit log
- **Status: Fixed: unauthenticated FAILURE/BLOCKED reports are rate-limited (5/min per known staff id, 10/min shared for unknown ids, 60/min overall), marked `clientReported`; `auditOnDeny` is capped at 10/min per uid. Server-side sign-in audit via blocking functions stays a post-emulator item.**
- **Where:** `functions/src/auth/handlers/recordStaffLogin.ts:19-28` (`FAILURE` and `BLOCKED` need no auth; any `userId` is accepted), and `functions/src/common/callable.ts:143-151` (`auditOnDeny`: any signed-in non-admin who calls an admin callable writes one audit document per call).
- **Failure scenario:**
  - A script calls `auth-recordStaffLogin {userId:'admin01', outcome:'BLOCKED'}` in a loop. The `auditLogs` collection fills with fake denied or failed logins attributed to real staff IDs. This hides genuine events (NFR 1.4) and costs writes.
  - The opposite also holds: a real brute-force attempt against Firebase Auth email/password never calls this function, so real failures are not logged. The audit trail is only as honest as the client.
- **Suggested fix:**
  - Rate-limit per IP/userId (App Check, plus a counter doc per `userId` per minute), and mark these entries `reported: true` (already in `details`) so the UI labels them "client-reported".
  - For server-side truth, use Identity Platform blocking functions (`beforeSignIn`) to audit sign-ins once the project leaves the emulator.
  - Throttle `auditOnDeny` writes per uid.

### M4. A CP rejection or SI withdrawal silently moves an ARCHIVED workshop back to DRAFT
- **Status: Fixed: REJECT/withdraw reset only a PENDING_VENUE workshop; archiving a DRAFT/PENDING_VENUE workshop withdraws the active request and unarchive restores DRAFT.**
- **Where:**
  - `functions/src/venues/controller/decideVenueDecision.ts:76-80`: REJECT sets `resetWorkshop: waiting`, with no status check. Compare line 112, where CONFLICTED does check `PENDING_VENUE`.
  - `functions/src/venues/repo/venueRequestRepo.ts:126-132`: withdraw resets whenever `activeVenueRequestId` matches.
  - `functions/src/workshops/controller/decideAdminStatus.ts:73-85` and `functions/src/workshops/repo/adminWorkshopRepo.ts:72-99`: ARCHIVE of a `PENDING_VENUE` workshop leaves the pending request and `activeVenueRequestId` in place. Only CANCELLED withdraws the request.
- **Failure scenario:** An admin archives a PENDING_VENUE workshop. Either the SI calls `venues-withdrawVenueRequest` or the CP rejects the still-PENDING request. The workshop is written `status: 'DRAFT'`, which un-archives it without admin action, and `statusBeforeArchive` goes stale. A second path ends in a stuck workshop:
  1. The CP clicks Approve and gets SLOT_CONFLICT. The request is now CONFLICTED, but the workshop is not reset because it is not PENDING_VENUE.
  2. The admin later unarchives, which restores `PENDING_VENUE` with a dead `activeVenueRequestId`.
  3. The SI is now stuck: `requestVenue` returns VENUE_REQUEST_EXISTS, `withdraw` returns REQUEST_NOT_PENDING, and `updateWorkshop` returns WORKSHOP_NOT_EDITABLE.
- **Suggested fix:** When archiving a DRAFT or PENDING_VENUE workshop, withdraw the active request and null `activeVenueRequestId` (reuse the cancel branch). In REJECT and withdraw, reset only when `workshop.status === 'PENDING_VENUE'`.

### M5. Report attachments are shared as bearer download URLs
- **Status: Fixed: attachments are read with `getBlob` through storage rules (admin token) and shown via object URLs revoked on close; no `getDownloadURL`. Real buckets need CORS for the web origin (not testable on the emulator).**
- **Where:** `apps/web/src/features/reports/repo/incidentRepo.ts:77` (`getDownloadURL`).
- **Failure scenario:** `getDownloadURL` returns a URL with a long-lived token that bypasses `storage.rules`. When an admin opens an attachment, the URL may contain sensitive evidence such as photos or IDs. Anyone who gets the URL (copied link, browser history, a forwarded email) can read it with no auth. The URL keeps working after the admin is removed and after the incident is closed.
- **Suggested fix:** Fetch with `getBlob` or `getBytes`, which go through the rules, and show the file with an object URL. Alternatively, serve short-lived signed URLs from an admin callable.

---

## Low

### L1. Logging in bumps `users.version`, which causes spurious STALE_VERSION for admins
- **Status: Fixed: login no longer bumps `users.version`.**
- **Where:** `functions/src/auth/repo/usersRepo.ts:49-55`.
- **Scenario:** An admin opens an account and the user logs in on mobile. The admin's Flag or Suspend then fails with STALE_VERSION even though nothing the admin edits has changed.
- **Fix:** Do not bump `version` on login. Reserve it for admin-editable fields, as `updatePreferences` already does.

### L2. Staff user IDs are case-sensitive in one place and case-insensitive in another
- **Status: Fixed: staff ids are lowercased in the shared schemas (create and recordStaffLogin), the web login and the server compare.**
- **Where:** `apps/web/src/features/auth/controller/guards.ts:9-10` (email lowercased), `apps/web/src/features/auth/controller/staffLogin.ts:45,56` (`userId` sent as typed), `functions/src/auth/controller/staffLogin.ts:27` (exact `staffUserId === userId`), `packages/shared/src/schemas/users.ts:66-71` (`createStaffAccount` allows uppercase).
- **Scenario:** The account is `Alice`, the person types `alice`, and Firebase sign-in succeeds. `recordStaffLogin` returns NOT_STAFF_ACCOUNT, the web app signs them out with "Invalid credentials", and the attempt is audited as DENIED.
- **Fix:** Lowercase `userId` on create, in the login callable and on the server compare.

### L3. Approving a venue request does not re-check that the slot is still in the future or still fits the workshop
- **Status: Fixed (APPROVE re-check): a late approval with a past slot or too-small venue takes the CONFLICTED path. Deferred: `adminUpdateWorkshop` raising capacity above venue capacity.**
- **Where:** `functions/src/venues/controller/decideVenueDecision.ts:107-108`.
- **Scenario:** The CP approves days later, after `slot.startAt` has passed. The workshop becomes OPEN in the past and can never be booked (WORKSHOP_STARTED).
- **Fix:** Re-apply the `SLOT_IN_PAST` and `VENUE_TOO_SMALL` checks from `decideRequestVenue` on APPROVE, and return CONFLICTED or a specific error.
- **Related:** `adminUpdateWorkshop` can raise capacity above the venue's capacity on an OPEN workshop (`decideAdminEdit.ts:42-50`).

### L4. Archiving an OPEN workshop with bookings sends no notification, and learners then cannot check in
- **Status: Fixed: archiving an upcoming OPEN workshop with bookings notifies the booked learners.**
- **Where:** `functions/src/workshops/repo/adminWorkshopRepo.ts:72-99` (only CANCELLED notifies), `functions/src/attendance/controller/decideAttendance.ts:17` (ARCHIVED is not an active status).
- **Scenario:** The admin confirms impact and archives the workshop. Learners still hold CONFIRMED tickets, show up, and are rejected with SESSION_NOT_ACTIVE.
- **Fix:** Notify learners on ARCHIVE of an upcoming OPEN workshop, or block that transition in favour of CANCELLED.

### L5. Admin free-text reasons reach learners
- **Status: Deferred: needs a separate learner-facing reason field and a UI change; admin reasons are audited and copied into learner notices as before.**
- **Where:** `functions/src/workshops/controller/cancellationNotices.ts:16` (reason in every learner and volunteer notification), `firebase/firestore.rules:28` (`cancelReason` on a CANCELLED workshop is readable by every browsing role). `users/{uid}.flagReason` is also self-readable (`firestore.rules:19`).
- **Scenario:** An admin cancels "per incident SA-…: instructor X reported for …". All learners receive that text.
- **Fix:** Use a separate `publicReason` (or a fixed category) for learner-facing copy, and keep the admin reason in audit only. Strip `flagReason` from the self-readable doc, or move it to an admin-only subcollection.

### L6. Any active user can upload unlimited report attachments
- **Status: Deferred: storage rule role restriction and cleanup job are post-prototype hardening.**
- **Where:** `firebase/storage.rules:10-15`.
- **Scenario:** Any active user, including CP and admin roles, can create unlimited 5 MB objects under their own prefix, and they are never cleaned up.
- **Fix:**
  - Limit the role in the rule to `LEARNER`, `SENIOR_INSTRUCTOR` or `VOLUNTEER`.
  - Add a per-user object cap or an upload callable.
  - Add a cleanup job for paths not referenced by an incident.

### L7. Reporters cannot answer an AWAITING_INFO request (spec gap, #5-3)
- **Status: Deferred: reporter reply to AWAITING_INFO is a spec gap that needs a new callable plus mobile UI.**
- **Where:** Only `submitReport` and `updateIncident` exist (`functions/src/reports/index.ts`). The mobile app shows `infoRequest` (`apps/mobile/src/features/reports/repo/reportRepo.ts:37`) but has no reply action.
- **Fix:** Add `reports-respondToIncident` (reporter-only, AWAITING_INFO → UNDER_REVIEW), or document it as out of scope.

### L8. The QR is a static bearer credential
- **Status: Deferred: static QR is acceptable for the prototype (documented in ADR-017).**
- **Where:** `functions/src/common/qrSigner.ts:21` (no nonce or expiry).
- **Scenario:** A screenshot of a learner's QR checks that learner in, so proxy attendance is possible. The once-only rule limits this to one check-in.
- **Fix:** Acceptable for the prototype; document it. For the future, use a time-windowed payload that the device signs with a per-booking key while online.

### L9. Ticket cache survives sign-out on shared devices
- **Status: Deferred: clearing the ticket cache on logout conflicts with the offline ticket goal on a user's own device; shared-device handling needs a product decision.**
- **Where:** `apps/mobile/src/features/auth/controller/SessionProvider.tsx:59-61` (`signOut` does not clear `tickets:v1:<uid>`).
- **Scenario:** A family member signs in on the same phone. The previous user's QR payloads stay in AsyncStorage.
- **Fix:** Call `removeStored(ticketCacheKey(uid))` on explicit logout.

### L10. Demo check-in bypass is on by default in the env template
- **Status: Fixed: both env examples default to `false`; `ignoreCheckInWindow` is honoured only in emulators.**
- **Where:** `.env.example:6` (`DEMO_IGNORE_CHECKIN_WINDOW=true`).
- **Scenario:** If this file is copied into a real deploy, attendance can be recorded at any time.
- **Fix:** Default it to `false` and have `config.ts` refuse it outside the emulators (as `authMode` does for mock).

### L11. Documentation drift in `docs/api/functions.md`
- **Status: Fixed (3.4): per-row error codes added to `functions.md` for `users-submitInstructorProfile`, `workshops-submitFeedback` and `workshops-withdrawVolunteer`.**
- **Details:**
  - `users-submitInstructorProfile` also throws `INVALID_TRANSITION` when the profile is already PENDING (`functions/src/users/controller/decideInstructorSubmit.ts:12-14`).
  - `workshops-submitFeedback` and `workshops-withdrawVolunteer` also throw `NOT_FOUND`.
  - All thrown codes do exist in the code list (checked by diffing `AppError('…')` call sites against §0), so this affects only the per-row columns.
- **Fix:** Add the codes to the rows.

### L12. A suspension can race an in-flight call (minor TOCTOU)
- **Status: Deferred (accepted): negligible TOCTOU, as the review suggested.**
- **Where:** `functions/src/common/requireCaller.ts:63`, which reads `users/{uid}` outside the business transaction.
- **Scenario:** One call that started just before a suspension commits can still complete.
- **Fix:** Acceptable. Optionally, re-read the caller's status inside the money-moving transactions (redeem, attendance).

---

## Verified OK

- **Capacity and duplicate booking:** One transaction reads the workshop and the deterministic `bookings/{workshopId}_{uid}`, then does `tx.create` plus a `seatsTaken` update. All bookings for a workshop contend on the same document, so capacity cannot be exceeded and duplicates fail on create (`functions/src/bookings/repo/bookingRepo.ts`). Admin cancel and booking also serialise on the workshop document.
- **Single attendance:** `tx.create(attendance/{bookingId})` plus a deterministic `earn_<bookingId>` ledger document mean concurrent scans award points exactly once. Wallet and ledger stay consistent (`functions/src/attendance/repo/attendanceRepo.ts`, `functions/src/common/ledger.ts`).
- **Voucher redeem:** Profile, tier, wallet and the oldest AVAILABLE candidate are read in one transaction. The voucher is marked CLAIMED, the wallet debited, and tier counts and audit updated together. A failure leaves nothing written. The code is never put in the audit log (`functions/src/vouchers/repo/redeemRepo.ts`).
- **Voucher upload:** The sha256 doc id with `tx.create` dedupes across concurrent uploads. Unknown and inactive tiers are rejected. The write budget is checked before commit (`functions/src/vouchers/controller/decideUpload.ts`).
- **Voucher isolation:** `voucherInventory` is `allow read, write: if false`. Admin listing returns masked codes, and `listMyVouchers` filters on `claimedBy == caller` (NFR 6.3, ADR-012).
- **Venue approval:** Slot lock (BOOKED), workshop OPEN, and competing open requests set to CONFLICTED with their workshops reset all happen in one transaction. The losing approver gets SLOT_CONFLICT. Slot overlap and BOOKED locks are enforced in transactions (`functions/src/venues/repo/decisionRepo.ts`, `functions/src/venues/repo/slotRepo.ts`).
- **QR forgery:** The HMAC-SHA256 signature is compared with `timingSafeEqual`. The key exists only in functions env (no `EXPO_PUBLIC_`/`VITE_` exposure), the payload format is strictly validated, `WRONG_WORKSHOP` is enforced, and the roster never returns `qrPayload`.
- **Privilege escalation:** Clients cannot write any Firestore path. Claims are set only by server code. `registerAs` is an enum of `LEARNER`/`VOLUNTEER` and is ignored for existing users. `SENIOR_INSTRUCTOR` is derived from Singpass DOB. The mock verifier refuses to run outside the emulators. Admins cannot target admins or themselves.
- **Ownership checks:** These are present on workshop edit, venue request, respond and withdraw, facility and slot edits, venue decisions, roster access, notification read, and attachment paths (`reportUploads/{uid}/` with no traversal, plus server-side metadata checks).
- **Input validation:** Every callable input is zod-parsed with length and range caps. The conditional REASON_REQUIRED rules are enforced in `decide*` as ADR-024 states. The cancel transaction stays under 500 writes (capacity ≤ 50, volunteers ≤ 5).
- **Error codes:** Every `AppError` code thrown in `functions/src` appears in `functions.md` §0 and the shared enum.
- **Layering:**
  - In `apps/*`, only `repo/` and `services/` import `firebase/*`. UI imports from `services/` are limited to formatting, error-message and file-picker helpers.
  - Cross-feature imports go through feature `index.ts`.
  - Functions controllers import only types from `common/refs` and `common/callable` (no runtime Firebase).
- **Accessibility (44 px):** Mobile tokens use `minTouchTarget` 44, `controlHeight` 56, `iconButton` 48 and map pins 48. Tab items use `minTouchTarget`. Web uses `--touch-min: 44px` on controls, tables and layout. The QR screen uses pure black on white.
- **Offline ticket data path:** Once a session is established, a failed or stalled bookings read falls back to the AsyncStorage mirror and shows a "last updated" banner. The gap is only the cold-start auth path in H2.
