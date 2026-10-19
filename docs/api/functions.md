# Callable Function Catalogue

Source of truth for every Cloud Function (NFR 6.4). Design rationale: `../architecture.md` §4. Names, input and output types are mirrored in `packages/shared/src/callables.ts` and zod schemas in `packages/shared/src/schemas/<feature>.ts`.

Conventions
- All functions are `onCall` (v2), region `asia-southeast1`, deployed name `<feature>-<name>`.
- "Roles" = caller must be signed in, `users/{uid}.status == 'ACTIVE'`, and hold one of the roles (checked by `requireCaller`, which reads `users/{uid}`). `public` = no auth required.
- Every function can also throw `UNAUTHENTICATED`, `ACCOUNT_SUSPENDED`, `PERMISSION_DENIED`, `INVALID_INPUT` (with `details.fieldErrors`), `BUSY_TRY_AGAIN`, `INTERNAL`; these are not repeated below.
- Times are ISO-8601 strings in inputs/outputs. "Audit" = writes an `auditLogs` entry. "Notify" = writes `notifications`.
- Admin functions use `auditOnDeny: true` (a denied call is audited as `PERMISSION_DENIED`).

## 0. AppErrorCode list

```
Generic:     UNAUTHENTICATED PERMISSION_DENIED ACCOUNT_SUSPENDED INVALID_INPUT NOT_FOUND STALE_VERSION
             INVALID_TRANSITION REASON_REQUIRED BUSY_TRY_AGAIN INTERNAL
Auth:        SINGPASS_AUTH_FAILED SINGPASS_UNAVAILABLE PROFILE_UNAVAILABLE REGISTRATION_REQUIRED NOT_STAFF_ACCOUNT
Users:       NOT_SENIOR_ELIGIBLE PROFILE_NOT_APPROVED PROFILE_ALREADY_APPROVED NOT_PENDING CANNOT_TARGET_ADMIN USER_ID_TAKEN
Workshops:   WORKSHOP_NOT_EDITABLE CAPACITY_BELOW_BOOKINGS ACTIVE_BOOKINGS_CONFIRM_REQUIRED WORKSHOP_LOCKED_FIELDS
Bookings:    WORKSHOP_NOT_OPEN WORKSHOP_STARTED WORKSHOP_FULL ALREADY_BOOKED CANNOT_BOOK_OWN_WORKSHOP
Attendance:  INVALID_QR TICKET_NOT_FOUND WRONG_WORKSHOP NO_BOOKING ALREADY_ATTENDED NOT_AUTHORISED_FOR_WORKSHOP SESSION_NOT_ACTIVE
Volunteers:  NOT_ACCEPTING_VOLUNTEERS VOLUNTEERS_FULL ALREADY_OPTED_IN NOT_ASSIGNED
Feedback:    NOT_ATTENDED FEEDBACK_WINDOW_CLOSED ALREADY_SUBMITTED
Venues:      SLOT_UNAVAILABLE SLOT_CONFLICT SLOT_BOOKED_LOCKED SLOT_OVERLAP INVALID_TIME_RANGE SLOT_IN_PAST
             VENUE_REQUEST_EXISTS VENUE_TOO_SMALL REQUEST_NOT_PENDING NOT_FACILITY_OWNER LOCATION_OUT_OF_BOUNDS MAP_UNAVAILABLE
Vouchers:    TIER_NOT_FOUND INSUFFICIENT_POINTS OUT_OF_STOCK UPLOAD_TOO_LARGE VOUCHER_NOT_AVAILABLE
Reports:     ATTACHMENT_INVALID INCIDENT_CLOSED
```
HttpsError code mapping: `architecture.md` §6. `MAP_UNAVAILABLE` is client-only (MapProvider).

## 1. auth

| Function | Roles | Input | Output | Errors | Notes |
|---|---|---|---|---|---|
| `auth-exchangeSingpass` (#0-1) | public | `{ assertion: string, nonce?: string, registerAs?: 'LEARNER'\|'VOLUNTEER' }` | `{ customToken, uid, roles: Role[], seniorEligible, isNewUser }` | SINGPASS_AUTH_FAILED, SINGPASS_UNAVAILABLE, PROFILE_UNAVAILABLE, REGISTRATION_REQUIRED (new user, no `registerAs`), ACCOUNT_SUSPENDED | Creates/updates `users`, sets claims. See arch §5.1. |
| `auth-recordStaffLogin` (#0-2) | public | `{ userId: string, outcome: 'SUCCESS'\|'FAILURE'\|'BLOCKED' }` | `{ roles: Role[] }` (SUCCESS) or `{}` | NOT_STAFF_ACCOUNT (SUCCESS caller lacks ADMIN/CP, or `userId` != caller's `staffUserId`) | Audit `STAFF_LOGIN` with outcome. SUCCESS requires auth; FAILURE/BLOCKED callable unauthenticated. Web signs out on NOT_STAFF_ACCOUNT. `userId` is lowercased (case-insensitive). FAILURE/BLOCKED are client-reported (`details.clientReported`) and rate-limited (5/min per known staff id, 10/min for unknown ids, 60/min overall): over the cap the call returns `{}` without writing. Claims status comes from `users/{uid}.status`. |

## 2. users

| Function | Roles | Input | Output | Errors | Notes |
|---|---|---|---|---|---|
| `users-updatePreferences` | any | `{ fontScale?: 1\|1.25\|1.5, lastMode?: AppMode }` | `{ prefs }` | - | `lastMode` must be a held role. |
| `users-submitInstructorProfile` (gap #17) | SENIOR_INSTRUCTOR | `{ bio, expertise: WorkshopCategory[], experienceYears }` | `{ status: 'PENDING' }` | NOT_SENIOR_ELIGIBLE, PROFILE_ALREADY_APPROVED, INVALID_TRANSITION (already PENDING) | Allowed when none, REJECTED or REQUIRES_REVISION. |
| `users-reviewInstructorProfile` (#5-5) | ADMIN | `{ uid, decision: 'APPROVE'\|'REJECT'\|'REQUEST_REVISION', reason?, expectedVersion }` | `{ status, version }` | NOT_FOUND, NOT_PENDING, REASON_REQUIRED (REJECT, REQUEST_REVISION), STALE_VERSION | Audit `INSTRUCTOR_REVIEW`; notify SI `PROFILE_REVIEWED`. |
| `users-setAccountStatus` (#5-1) | ADMIN | `{ uid, action: 'FLAG'\|'UNFLAG'\|'SUSPEND'\|'REACTIVATE', reason?, expectedVersion }` | `{ status, flagged, version }` | NOT_FOUND, STALE_VERSION, CANNOT_TARGET_ADMIN (target holds ADMIN or is self), INVALID_TRANSITION (FLAG when flagged, UNFLAG when not flagged, REACTIVATE on a non-SUSPENDED/non-ACTIVE state), REASON_REQUIRED (FLAG, SUSPEND) | SUSPEND/REACTIVATE also toggle Auth `disabled`, update claims, revoke tokens. Audit `ACCOUNT_*`; notify target. SUSPEND on SUSPENDED / REACTIVATE on ACTIVE is an idempotent Auth resync (no version bump, no notify, audit `details.resync`), so a retry after a failed Auth step repairs state; a failed Auth step writes a FAILURE audit with `authSyncFailed`. |
| `users-createStaffAccount` (gap #17, optional) | ADMIN | `{ userId, displayName, role: 'COMMUNITY_PARTNER'\|'ADMIN', orgName?, initialPassword }` | `{ uid }` | USER_ID_TAKEN, INVALID_INPUT (orgName required for CP) | `userId` is lowercased. Creates Auth user `st_<userId>`, claims, `users` doc. Audit `STAFF_ACCOUNT_CREATE`. Seed covers the demo without this. |
| `users-markNotificationRead` | any | `{ notificationId }` | `{}` | NOT_FOUND (also when not own) | |

Admin account search (#5-1 step 2-4) is a direct Firestore read: `users where displayNameLower >= q and < q + ''` (admin-only rule).

## 3. workshops

| Function | Roles | Input | Output | Errors | Notes |
|---|---|---|---|---|---|
| `workshops-createWorkshop` (#1-2) | SENIOR_INSTRUCTOR | `{ title, description, category, capacity, materials, needsVolunteers, volunteerSlots }` | `{ workshopId, status: 'DRAFT' }` | PROFILE_NOT_APPROVED | `volunteerSlots` 0 when `!needsVolunteers`. |
| `workshops-updateWorkshop` | SENIOR_INSTRUCTOR (owner) | `{ workshopId, patch: Partial<create input> }` | `{ workshopId }` | NOT_FOUND, PERMISSION_DENIED (not owner), WORKSHOP_NOT_EDITABLE (status != DRAFT) | |
| `workshops-adminUpdateWorkshop` (#5-2) | ADMIN | `{ workshopId, patch: { title?, description?, category?, materials?, capacity? }, expectedVersion }` | `{ version }` | NOT_FOUND, STALE_VERSION, CAPACITY_BELOW_BOOKINGS, WORKSHOP_LOCKED_FIELDS (`capacity` once `startAt <= now` or status COMPLETED/CANCELLED) | Audit `WORKSHOP_ADMIN_EDIT` with changed field names. |
| `workshops-adminSetStatus` (#5-2, #5-3 FR 6.20) | ADMIN | `{ workshopId, status: 'ARCHIVED'\|'UNARCHIVE'\|'COMPLETED'\|'CANCELLED', reason?, confirmImpact?: boolean, incidentId?, expectedVersion }` | `{ status, version, affectedBookings }` | NOT_FOUND, STALE_VERSION, INVALID_TRANSITION, REASON_REQUIRED (CANCELLED), ACTIVE_BOOKINGS_CONFIRM_REQUIRED (CANCELLED or ARCHIVED with `seatsTaken > 0`, upcoming, and `!confirmImpact`; details `{ seatsTaken }`) | Transitions: OPEN→COMPLETED\|CANCELLED\|ARCHIVED; DRAFT/PENDING_VENUE→CANCELLED\|ARCHIVED; COMPLETED/CANCELLED→ARCHIVED; ARCHIVED→UNARCHIVE restores `statusBeforeArchive`. CANCELLED: arch §4.7. Archive keeps bookings/attendance. Audit `WORKSHOP_STATUS_CHANGE`. |
| `workshops-optInVolunteer` (#3-2) | VOLUNTEER | `{ workshopId }` | `{ assignmentId, status: 'ASSIGNED' }` | NOT_FOUND, NOT_ACCEPTING_VOLUNTEERS, VOLUNTEERS_FULL, ALREADY_OPTED_IN (details `{ status }`) | arch §4.7. |
| `workshops-withdrawVolunteer` | VOLUNTEER | `{ workshopId }` | `{ status: 'WITHDRAWN' }` | NOT_FOUND, NOT_ASSIGNED, WORKSHOP_STARTED | |
| `workshops-submitFeedback` (#2-4) | LEARNER | `{ workshopId, rating: 1..5, comment?: string (<=1000), tags?: string[] (<=5) }` | `{ feedbackId }` | NOT_FOUND, NOT_ATTENDED, FEEDBACK_WINDOW_CLOSED (`now > endAt + FEEDBACK_WINDOW_DAYS`), ALREADY_SUBMITTED | Feedback id equals booking id (`${workshopId}_${learnerId}`). Updates rating aggregates on workshop and instructor profile. Mobile feedback screen built in 2.6. |

## 4. bookings

| Function | Roles | Input | Output | Errors | Notes |
|---|---|---|---|---|---|
| `bookings-bookWorkshop` (#2-2) | LEARNER | `{ workshopId }` | `{ bookingId, ticketCode, qrPayload, workshopSnapshot, seatsRemaining }` | NOT_FOUND, CANNOT_BOOK_OWN_WORKSHOP, WORKSHOP_NOT_OPEN, WORKSHOP_STARTED, ALREADY_BOOKED (details `{ bookingId }`), WORKSHOP_FULL | Transaction arch §4.1. Notify learner `BOOKING_CONFIRMED`. |
| `bookings-getRoster` (#3-3, SI class list) | SENIOR_INSTRUCTOR (owner), VOLUNTEER (ASSIGNED), ADMIN | `{ workshopId }` | `{ workshop: { id, title, startAt, endAt, venue, capacity, seatsTaken, attendedCount }, learners: { bookingId, learnerName, status, attendedAt? }[], volunteers: { volunteerId, volunteerName }[] }` | NOT_FOUND, NOT_ASSIGNED (volunteer not assigned, #3-3 Ex1), PERMISSION_DENIED (SI not owner) | Never returns `qrPayload` or `ticketCode` (review H1: a learner reads their own code from their ticket for manual check-in). Only CONFIRMED/ATTENDED bookings. |

My Bookings / Digital Ticket (#2-3) are direct reads of `bookings where learnerId == uid`, cached to AsyncStorage for offline display (ADR-019).

## 5. attendance

| Function | Roles | Input | Output | Errors | Notes |
|---|---|---|---|---|---|
| `attendance-recordAttendance` (#1-4, #3-4) | SENIOR_INSTRUCTOR, VOLUNTEER | `{ workshopId, qrPayload: string }` or `{ workshopId, ticketCode: string }` | `{ bookingId, learnerName, workshopTitle, attendedAt, method: 'QR'\|'MANUAL', pointsAwarded }` | INVALID_QR, TICKET_NOT_FOUND, NOT_FOUND, NOT_AUTHORISED_FOR_WORKSHOP, SESSION_NOT_ACTIVE, NO_BOOKING, WRONG_WORKSHOP, ALREADY_ATTENDED (details `{ learnerName, attendedAt }`) | Transaction arch §4.3. Target < 3 s (NFR 3.2): one query max + one tx. |

## 6. venues

| Function | Roles | Input | Output | Errors | Notes |
|---|---|---|---|---|---|
| `venues-upsertFacility` (#4-1 alt "Add Facility") | COMMUNITY_PARTNER | `{ facilityId?, name, address, postalCode (6 digits), lat, lng, capacity, amenities: string[] }` | `{ facilityId }` | NOT_FACILITY_OWNER (update of other's), LOCATION_OUT_OF_BOUNDS | `orgName`, `partnerId` from caller. |
| `venues-upsertSlot` (#4-1) | COMMUNITY_PARTNER (owner) | `{ facilityId, slotId?, startAt, endAt, status: 'AVAILABLE'\|'UNAVAILABLE'\|'MAINTENANCE' }` | `{ slotId, conflictedRequestIds: string[] }` | NOT_FOUND, NOT_FACILITY_OWNER, SLOT_BOOKED_LOCKED, INVALID_TIME_RANGE, SLOT_IN_PAST, SLOT_OVERLAP | arch §4.6 (pending requests conflicted when slot leaves AVAILABLE). |
| `venues-deleteSlot` (#4-1) | COMMUNITY_PARTNER (owner) | `{ facilityId, slotId }` | `{ conflictedRequestIds: string[] }` | NOT_FOUND, NOT_FACILITY_OWNER, SLOT_BOOKED_LOCKED | |
| `venues-requestVenue` (#1-3) | SENIOR_INSTRUCTOR (owner of workshop) | `{ workshopId, facilityId, slotId }` | `{ requestId, status: 'PENDING' }` | PROFILE_NOT_APPROVED, NOT_FOUND, PERMISSION_DENIED, WORKSHOP_NOT_EDITABLE, VENUE_REQUEST_EXISTS, SLOT_UNAVAILABLE, SLOT_IN_PAST, VENUE_TOO_SMALL | Notify CP `VENUE_REQUEST_NEW`. |
| `venues-decideVenueRequest` (#4-2) | COMMUNITY_PARTNER (owner) | `{ requestId, decision: 'APPROVE'\|'REJECT'\|'REQUEST_INFO', reason?, message?, suggestedSlotId? }` | `{ status, workshopId, conflictedRequestIds: string[] }` | NOT_FOUND, NOT_FACILITY_OWNER, REQUEST_NOT_PENDING, REASON_REQUIRED (REQUEST_INFO without message), SLOT_CONFLICT (thrown **after** committing request as CONFLICTED; details `{ requestId }`) | Transaction arch §4.6. Notify SI. |
| `venues-respondToInfoRequest` (#4-2 alt) | SENIOR_INSTRUCTOR (owner) | `{ requestId, message }` | `{ status: 'PENDING' }` | NOT_FOUND, PERMISSION_DENIED, REQUEST_NOT_PENDING (status != AWAITING_INFO) | Notify CP. |
| `venues-withdrawVenueRequest` | SENIOR_INSTRUCTOR (owner) | `{ requestId }` | `{ status: 'WITHDRAWN' }` | NOT_FOUND, PERMISSION_DENIED, REQUEST_NOT_PENDING | Workshop back to DRAFT. |

Venue browse (#1-3 steps 2-4) and CP lists are direct reads (`facilities`, collection group `slots where status == 'AVAILABLE' and startAt >= now`, `venueRequests where partnerId == uid`).

## 7. vouchers

| Function | Roles | Input | Output | Errors | Notes |
|---|---|---|---|---|---|
| `vouchers-redeemVoucher` (#1-7) | SENIOR_INSTRUCTOR | `{ tierId }` | `{ voucherId, code, provider, denomination, pointsSpent, balanceAfter, claimedAt }` | PROFILE_NOT_APPROVED, TIER_NOT_FOUND, INSUFFICIENT_POINTS (details `{ required, balance }`), OUT_OF_STOCK | Transaction arch §4.4. Audit `VOUCHER_REDEEM`. Target < 5 s. |
| `vouchers-listMyVouchers` | SENIOR_INSTRUCTOR | `{}` | `{ vouchers: { voucherId, provider, denomination, code, claimedAt }[] }` | - | Only way (besides redeem) a code leaves the isolated store. |
| `vouchers-upsertTier` | ADMIN | `{ provider, providerName, denomination, pointsCost, active }` | `{ tierId }` | - | Id `${provider}_${denomination}`; counts initialised to 0 on create. Audit. |
| `vouchers-uploadVouchers` (#5-4) | ADMIN | `{ rows: { provider, denomination, code }[] }` (1..400) | `{ batchId, acceptedCount, rejected: { row, codeMasked, reason }[] }` | UPLOAD_TOO_LARGE | Transaction arch §4.5. Row reasons: INVALID_FORMAT, DUPLICATE_IN_FILE, DUPLICATE_EXISTING, UNKNOWN_TIER. Audit `VOUCHER_UPLOAD`. |
| `vouchers-setVoucherStatus` (#5-4 alt) | ADMIN | `{ voucherId, status: 'INVALID'\|'REMOVED', reason }` | `{ status }` | NOT_FOUND, VOUCHER_NOT_AVAILABLE (status != AVAILABLE), REASON_REQUIRED | Updates tier counts. Audit `VOUCHER_STATUS_CHANGE`. |
| `vouchers-listInventory` (#5-4, FR 6.27) | ADMIN | `{ tierId?, status?, limit?: number (<=100), startAfterId? }` | `{ items: { voucherId, tierId, provider, denomination, codeMasked, status, uploadedAt, claimedBy?, claimedAt? }[], nextStartAfterId? }` | - | Codes masked (`****1234`). Grouped counts come from `voucherTiers` (direct read). |

Wallet and points history (#1-5, #1-6) are direct reads of `wallets/{uid}` and `wallets/{uid}/ledger orderBy createdAt desc`.

## 8. reports

| Function | Roles | Input | Output | Errors | Notes |
|---|---|---|---|---|---|
| `reports-submitReport` (#2-5) | LEARNER, SENIOR_INSTRUCTOR, VOLUNTEER | `{ category, description, relatedWorkshopId?, relatedUserId?, attachmentPaths?: string[] (<=3) }` | `{ referenceNo }` | ATTACHMENT_INVALID (path not under `reportUploads/{uid}/`, missing, wrong type, or > 5 MB) | Client uploads to Storage first. Single `tx.create` of `incidents/{refNo}` (retry new refNo on collision) so no partial record (Ex3). |
| `reports-updateIncident` (#5-3) | ADMIN | `{ incidentId, status?: IncidentStatus, resolution?, infoRequest?, expectedVersion }` | `{ status, version }` | NOT_FOUND, STALE_VERSION, INCIDENT_CLOSED (status RESOLVED/CLOSED, except RESOLVED→CLOSED), INVALID_TRANSITION, REASON_REQUIRED (AWAITING_INFO without `infoRequest`, RESOLVED without `resolution`) | Transitions: SUBMITTED→UNDER_REVIEW\|CLOSED; UNDER_REVIEW→AWAITING_INFO\|RESOLVED\|CLOSED; AWAITING_INFO→UNDER_REVIEW\|CLOSED; RESOLVED→CLOSED. Audit `INCIDENT_UPDATE`; notify reporter. Disciplinary actions reuse `users-setAccountStatus` / `workshops-adminSetStatus` with `incidentId`. |

Admin incident queue and "my reports" are direct reads. Attachment viewing: admin reads Storage directly (storage rule allows ADMIN).
