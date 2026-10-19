# Architecture

Owner: task 0.2 (Opus). This document is binding for Phase 1 and 2 agents. If you need to deviate, add an ADR in `decisions.md` first.
Companion docs: `api/functions.md` (callable catalogue), `decisions.md` (ADR-005 to ADR-023 explain the choices made here).

Contents: 1 Layers and modules · 2 Data model · 3 Security rules · 4 Transaction designs · 5 External service interfaces · 6 Error handling · 7 Constants

---

## 1. Layers and module structure

### 1.1 Layering (maps to the spec's boundary / control / entity classes)

| Layer | Spec class type | Apps (mobile, web) | Functions | May import |
|---|---|---|---|---|
| `ui/` | Boundary (LoginUI, LearnerUI, ...) | Screens and components. Render state, call controller hooks. | `handlers/`: callable entry points (auth check, zod parse, error mapping). | controller, shared, design system |
| `controller/` | Control (LearnerController, AdminController, ...) | Use-case hooks/functions: validation (zod), view state, orchestration. No Firebase imports. | Pure `decide*` functions: take plain entity snapshots + `now`, return a decision or throw `AppError`. No Firebase imports. | repo (apps only), shared |
| `repo/` | Entity access | Firestore reads (`onSnapshot`/`getDocs`) and typed callable invocations. No business rules. | Admin SDK reads/writes and transactions. Calls controller `decide*` inside the transaction. | shared, firebase SDK |
| `types.ts` / `packages/shared` | Entity | Re-exports shared entity types plus local view models. | Same. | nothing app-specific |

Rules (enforced by ESLint `no-restricted-imports` in task 0.3):
- `ui` never imports `firebase/*` or `repo/`. `controller` never imports `firebase/*`, `firebase-admin`, `react-native`. `repo` never imports React.
- Cross-feature imports only through a feature's `index.ts` (public API). Shared logic used by 2+ features goes to `packages/shared`.
- Functions pattern for every write: **handler → repo.runTransaction(tx => { reads; controller.decide(snapshot, now); writes })**. This keeps every business rule unit-testable without the emulator.

Spec control classes are per role; ours are per feature. Mapping: LearnerController = `workshops` (browse, feedback), `bookings`, `reports`; SeniorInstructorController = `workshops` (create), `venues` (request), `attendance`, `vouchers` (wallet/redeem), `users` (profile submit); VolunteerController = `workshops` (volunteer opt-in), `bookings` (roster), `attendance`; CommunityPartnerController = `venues`; AdminController = `users`, `workshops` (admin), `reports` (admin), `vouchers` (admin). MainUI = app shell (`app/`). OneMap Gateway = `MapProvider`; Singpass Gateway = `AuthProvider`; Email Gateway = in-app `notifications` (ADR-016).

### 1.2 Where each feature lives

| Feature | apps/mobile `src/features/` | apps/web `src/features/` | functions `src/` | packages/shared `src/` |
|---|---|---|---|---|
| auth | Singpass login, registration choice, mode toggle | Staff login, route guards | `auth/` exchangeSingpass, recordStaffLogin; `SingpassVerifier` | Role, AccountStatus, mock Singpass profile fixtures, `AuthProvider` types |
| users | Instructor profile submit, preferences (font scale) | Manage Accounts, Instructor Review | `users/` | User, InstructorProfile types/enums |
| workshops | Create workshop, directory/search, details, volunteer opportunities/assist, feedback | Manage Workshops | `workshops/` (CRUD, admin status, volunteers, feedback) | Workshop types, categories, `filterWorkshops`, `recommendWorkshops`, `isCheckInWindowOpen` |
| bookings | Book, My Bookings, Digital Ticket (offline cache), roster view | (reads only for admin) | `bookings/` bookWorkshop, getRoster | Booking types, ticket code normaliser |
| attendance | Scanner + manual ticket code entry (SI and Volunteer) | none | `attendance/` recordAttendance | Attendance types, QR payload parser (format only) |
| vouchers | Wallet, points history, redeem, my vouchers | Voucher Inventory, upload | `vouchers/` | Wallet, LedgerEntry, VoucherTier types, code normaliser/validator |
| venues | Venue map/list, slot picker, request status | Facilities, availability, venue requests | `venues/` | Facility, TimeSlot, VenueRequest types, `MapProvider` interface + OneMap/stub implementations, `haversineKm` |
| reports | Report an Issue | Incident Queue | `reports/` | Incident types, categories |
| (cross-cutting) | `app/` shell, `services/firebase.ts`, `services/callables.ts`, `design/` | `app/`, `services/`, `design/` | `common/`: `requireCaller`, `appError`, `writeAudit`, `notify`, `qrSigner`, `clock`, `refs` | `enums.ts`, `constants.ts`, `errors.ts`, `callables.ts` (names + I/O types), `schemas/` (zod) |

### 1.3 Folder templates

```
apps/mobile/src/
  app/                 navigation, MainShell, ModeToggle, AuthGate, providers
  design/              theme (type scale x font multiplier), Button(min 44px), Screen, ...
  services/            firebase.ts (init + emulator connect), callables.ts (typed wrapper), auth/MockSingpassProvider.ts
  features/<feature>/  ui/  controller/  repo/  types.ts  index.ts  README.md
apps/web/src/          same shape (features: auth, users, workshops, venues, vouchers, reports)
functions/src/
  index.ts             export * as auth from './auth'; export * as bookings from './bookings'; ...
  common/              requireCaller.ts, errors.ts, audit.ts, notify.ts, qrSigner.ts, clock.ts, refs.ts
  <feature>/           index.ts (exports callables) handlers/ controller/ repo/
packages/shared/src/
  enums.ts constants.ts errors.ts callables.ts entities/<entity>.ts schemas/<feature>.ts logic/<fn>.ts services/{AuthProvider.ts, map/}
firebase/              firebase.json, firestore.rules, firestore.indexes.json, storage.rules, seed/
```

Callable naming: deployed name is `<feature>-<name>` (from `export * as <feature>`), e.g. `bookings-bookWorkshop`. Region constant `FUNCTIONS_REGION = 'asia-southeast1'`. Names and I/O types live in `packages/shared/src/callables.ts`; apps call only through `services/callables.ts` → `call<Name>(input): Promise<Output>`.

---

## 2. Data model (Firestore)

Conventions:
- Timestamps stored as Firestore `Timestamp`; shared types use `TimestampLike = { seconds: number; nanoseconds: number; toDate(): Date }` (fits both client and admin SDKs). Callable inputs/outputs use ISO-8601 strings.
- All enums are string unions (UPPER_SNAKE) in `packages/shared/src/enums.ts`.
- Docs that admins edit carry `version: number` (incremented on every write) for stale-edit detection (#5-1 Ex1).
- Every doc has `createdAt`, `updatedAt` (server timestamps) unless noted.
- **Deterministic ids** are used wherever uniqueness is a business rule (they make duplicate checks a single `tx.get`).

### 2.1 Enums

```ts
type Role = 'LEARNER' | 'SENIOR_INSTRUCTOR' | 'VOLUNTEER' | 'COMMUNITY_PARTNER' | 'ADMIN';
type AppMode = 'LEARNER' | 'SENIOR_INSTRUCTOR' | 'VOLUNTEER' | 'COMMUNITY_PARTNER' | 'ADMIN'; // UI-only active mode
type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
type AuthType = 'SINGPASS' | 'STAFF';
type InstructorProfileStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REQUIRES_REVISION';
type WorkshopStatus = 'DRAFT' | 'PENDING_VENUE' | 'OPEN' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
type WorkshopCategory = 'ARTS_CRAFTS' | 'COOKING' | 'DIGITAL_SKILLS' | 'FITNESS_WELLNESS' | 'GARDENING' | 'LANGUAGES' | 'MUSIC' | 'OTHER';
type SlotStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'MAINTENANCE' | 'BOOKED';
type VenueRequestStatus = 'PENDING' | 'AWAITING_INFO' | 'APPROVED' | 'REJECTED' | 'CONFLICTED' | 'WITHDRAWN';
type BookingStatus = 'CONFIRMED' | 'ATTENDED' | 'CANCELLED';          // CONFIRMED == spec "Registered"
type AttendanceMethod = 'QR' | 'MANUAL';
type VolunteerAssignmentStatus = 'ASSIGNED' | 'WITHDRAWN';
type LedgerEntryType = 'EARN_ATTENDANCE' | 'REDEEM_VOUCHER' | 'ADJUSTMENT';
type VoucherStatus = 'AVAILABLE' | 'CLAIMED' | 'INVALID' | 'REMOVED'; // AVAILABLE == spec "Unclaimed"
type IncidentCategory = 'WORKSHOP' | 'USER_BEHAVIOUR' | 'VENUE_SAFETY' | 'SOFTWARE';
type IncidentStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'AWAITING_INFO' | 'RESOLVED' | 'CLOSED';
type NotificationType = 'VENUE_REQUEST_DECIDED' | 'VENUE_REQUEST_INFO' | 'VENUE_REQUEST_CONFLICTED' | 'VENUE_REQUEST_NEW'
  | 'BOOKING_CONFIRMED' | 'WORKSHOP_CANCELLED' | 'PROFILE_REVIEWED' | 'INCIDENT_UPDATED' | 'ACCOUNT_STATUS_CHANGED';
type AuditOutcome = 'SUCCESS' | 'FAILURE' | 'DENIED';
type AuditAction = 'STAFF_LOGIN' | 'ACCOUNT_FLAG' | 'ACCOUNT_UNFLAG' | 'ACCOUNT_SUSPEND' | 'ACCOUNT_REACTIVATE'
  | 'STAFF_ACCOUNT_CREATE' | 'INSTRUCTOR_REVIEW' | 'WORKSHOP_ADMIN_EDIT' | 'WORKSHOP_STATUS_CHANGE'
  | 'INCIDENT_UPDATE' | 'ATTENDANCE_RECORD' | 'VOUCHER_UPLOAD' | 'VOUCHER_STATUS_CHANGE' | 'VOUCHER_REDEEM' | 'VOUCHER_TIER_UPSERT'
  | 'PERMISSION_DENIED';
```

### 2.2 Collections

| Path | Id | Purpose |
|---|---|---|
| `users/{uid}` | `sp_<sha256(singpassSub)[0..20]>` (Singpass) or `st_<staffUserId>` (staff) | Account, roles, status, preferences |
| `instructorProfiles/{uid}` | = user uid | SI profile + approval state + rating aggregate |
| `workshops/{workshopId}` | auto | Workshop incl. denormalised seats, venue snapshot |
| `facilities/{facilityId}` | auto | CP facility (venue) |
| `facilities/{facilityId}/slots/{slotId}` | auto | Bookable time slot |
| `venueRequests/{requestId}` | auto | SI request for a slot |
| `bookings/{bookingId}` | `${workshopId}_${learnerId}` | Booking == digital ticket |
| `attendance/{bookingId}` | = bookingId | One attendance record per booking (once-only) |
| `volunteerAssignments/{id}` | `${workshopId}_${volunteerId}` | Volunteer opt-in/assignment |
| `feedback/{bookingId}` | = bookingId | Learner feedback (deferred UI) |
| `wallets/{uid}` | = SI uid | Points balance (denormalised) |
| `wallets/{uid}/ledger/{entryId}` | `earn_${bookingId}` / `redeem_${voucherId}` / auto (ADJUSTMENT) | Immutable points ledger |
| `voucherTiers/{tierId}` | `${provider}_${denomination}` e.g. `NTUC_10` | Public tier catalogue + inventory counts |
| `voucherInventory/{voucherId}` | `sha256(normalisedCode)` hex | **Isolated** code store; server-only |
| `voucherUploads/{batchId}` | auto | Upload batch summary (no codes) |
| `incidents/{refNo}` | `SA-YYMMDD-XXXXX` (Crockford base32) | Report / incident |
| `notifications/{id}` | auto | In-app notifications |
| `auditLogs/{id}` | auto | Admin/security audit log, append-only |

### 2.3 Document shapes

```ts
interface User {
  uid: string; authType: AuthType;
  displayName: string; displayNameLower: string;          // for admin prefix search
  roles: Role[];                                          // mirrored into custom claim `roles`
  status: AccountStatus; flagged: boolean; flagReason?: string;
  seniorEligible: boolean;                                // age >= 50 at Singpass verification (no DOB stored)
  ageVerifiedAt?: Timestamp;
  staffUserId?: string;                                   // STAFF only: login id (email = `${staffUserId}@staff.silveracademy.test`)
  orgName?: string;                                       // COMMUNITY_PARTNER only
  prefs: { fontScale: 1 | 1.25 | 1.5; lastMode?: AppMode };
  version: number; createdAt; updatedAt;
}

interface InstructorProfile {
  uid: string; displayName: string;
  bio: string; expertise: WorkshopCategory[]; experienceYears: number;
  status: InstructorProfileStatus; reviewReason?: string;
  submittedAt: Timestamp; reviewedAt?: Timestamp; reviewedBy?: string;
  ratingSum: number; ratingCount: number;
  version: number; createdAt; updatedAt;
}

interface Workshop {
  id: string; instructorId: string; instructorName: string;     // denorm
  title: string; description: string; category: WorkshopCategory;
  capacity: number; materials: string;
  status: WorkshopStatus; statusBeforeArchive?: WorkshopStatus;
  seatsTaken: number;                    // denorm counter, only changed in booking/cancel transactions
  attendedCount: number;                 // denorm
  needsVolunteers: boolean; volunteerSlots: number; volunteersAssigned: number; // denorm
  activeVenueRequestId: string | null;   // set while PENDING_VENUE
  // Set on venue approval (null before):
  slotId: string | null; startAt: Timestamp | null; endAt: Timestamp | null;
  venue: { facilityId: string; name: string; address: string; postalCode: string; lat: number; lng: number; partnerId: string } | null;
  ratingSum: number; ratingCount: number;
  cancelReason?: string;
  version: number; createdAt; updatedAt;
}

interface Facility {
  id: string; partnerId: string; orgName: string;
  name: string; address: string; postalCode: string; lat: number; lng: number;
  capacity: number; amenities: string[];
  createdAt; updatedAt;
}

interface TimeSlot {                        // facilities/{facilityId}/slots/{slotId}
  id: string; facilityId: string; partnerId: string;   // denorm for collectionGroup queries + rules
  startAt: Timestamp; endAt: Timestamp;
  status: SlotStatus;
  bookedWorkshopId: string | null; bookedRequestId: string | null;
  createdAt; updatedAt;
}

interface VenueRequest {
  id: string; workshopId: string; instructorId: string; instructorName: string;
  facilityId: string; facilityName: string; partnerId: string;
  slotId: string; slotStartAt: Timestamp; slotEndAt: Timestamp;
  workshopSummary: { title: string; description: string; category: WorkshopCategory; capacity: number; materials: string };
  status: VenueRequestStatus;
  decisionReason?: string;                 // reject reason (optional) / conflict note
  infoRequest?: string; infoResponse?: string;
  suggestedSlotId?: string;                // CP suggestion when CONFLICTED
  decidedAt?: Timestamp; decidedBy?: string;
  createdAt; updatedAt;
}

interface Booking {                        // bookings/{workshopId}_{learnerId}; this IS the digital ticket
  id: string; workshopId: string; learnerId: string; learnerName: string;
  status: BookingStatus;
  ticketCode: string;                      // 8 chars Crockford base32, shown as XXXX-XXXX; manual fallback
  qrPayload: string;                       // `SA1.<bookingId>.<sig>` (see 4.2)
  workshopSnapshot: { title: string; startAt: Timestamp; endAt: Timestamp; venueName: string; venueAddress: string; instructorName: string };
  attendedAt?: Timestamp;
  createdAt; updatedAt;
}

interface Attendance {                     // attendance/{bookingId}
  bookingId: string; workshopId: string; learnerId: string; learnerName: string;
  instructorId: string;
  scannedBy: string; scannedByRole: 'SENIOR_INSTRUCTOR' | 'VOLUNTEER'; method: AttendanceMethod;
  pointsAwarded: number;                   // to instructorId
  createdAt: Timestamp;
}

interface VolunteerAssignment {
  id: string; workshopId: string; volunteerId: string; volunteerName: string;
  workshopTitle: string; startAt: Timestamp;  // denorm for "Assigned Workshops" list
  status: VolunteerAssignmentStatus;
  createdAt; updatedAt;
}

interface Feedback { bookingId; workshopId; learnerId; instructorId; rating: 1|2|3|4|5; comment: string; tags: string[]; createdAt }

interface Wallet { uid: string; balance: number; lifetimeEarned: number; lifetimeRedeemed: number; updatedAt }

interface LedgerEntry {                    // immutable
  id: string; type: LedgerEntryType; amount: number /* signed */; balanceAfter: number;
  workshopId?: string; workshopTitle?: string; bookingId?: string;          // EARN
  voucherId?: string; tierId?: string; provider?: string; denomination?: number; // REDEEM (never the code)
  description: string; createdAt: Timestamp;
}

interface VoucherTier {
  id: string; provider: string /* e.g. 'NTUC' */; providerName: string; denomination: number /* SGD */;
  pointsCost: number; active: boolean;
  counts: { AVAILABLE: number; CLAIMED: number; INVALID: number; REMOVED: number }; // denorm, updated in same tx as voucher status
  updatedAt;
}

interface VoucherInventoryItem {           // server-only collection
  id: string /* sha256(code) */; code: string; tierId: string; provider: string; denomination: number;
  status: VoucherStatus; statusReason?: string;
  uploadBatchId: string; uploadedBy: string; uploadedAt: Timestamp;
  claimedBy?: string; claimedAt?: Timestamp;
  updatedAt;
}

interface VoucherUpload { id; uploadedBy; acceptedCount; rejectedCount; rejected: { row: number; codeMasked: string; reason: 'INVALID_FORMAT' | 'DUPLICATE_IN_FILE' | 'DUPLICATE_EXISTING' | 'UNKNOWN_TIER' }[]; createdAt }

interface Incident {
  id: string /* = refNo */; category: IncidentCategory; description: string;
  reporterId: string; reporterRole: Role;
  relatedWorkshopId?: string; relatedUserId?: string;
  attachments: { path: string; contentType: string; sizeBytes: number }[];
  status: IncidentStatus; resolution?: string; infoRequest?: string;
  version: number; createdAt; updatedAt;
}

interface Notification { id; userId: string; type: NotificationType; title: string; body: string; refPath?: string; read: boolean; createdAt }

interface AuditLog {
  id; actorId: string | null /* null for failed anonymous login */; actorRole: Role | null;
  action: AuditAction; outcome: AuditOutcome;
  targetType?: 'USER' | 'WORKSHOP' | 'INCIDENT' | 'VOUCHER' | 'VOUCHER_TIER' | 'VOUCHER_UPLOAD' | 'INSTRUCTOR_PROFILE';
  targetId?: string; details: Record<string, string | number | boolean>; // never codes or passwords
  createdAt: Timestamp;
}
```

### 2.4 Denormalisation choices
- `workshops.seatsTaken`: authoritative seat counter, only mutated inside the booking transaction (and cancel). Remaining = `capacity - seatsTaken`. Seat count is never computed by counting bookings at read time.
- `workshops.volunteersAssigned`: same pattern for volunteer opt-in.
- `wallets/{uid}.balance` + immutable `ledger`: balance is the fast read; ledger is the audit trail. Invariant: `balance == sum(ledger.amount)`; both always written in the same transaction.
- `voucherTiers.counts`: per-status counts so the wallet screen and admin grouping never query the isolated inventory.
- `bookings.workshopSnapshot`, `venueRequests.workshopSummary`, `volunteerAssignments.workshopTitle/startAt`: copies so list screens need one query and tickets render offline. Snapshots are not updated after creation except on cancellation (status only).
- `workshops.venue`: copied from facility on approval so discovery needs no join.

### 2.5 Composite indexes (`firebase/firestore.indexes.json`)

| Collection (scope) | Fields | Used by |
|---|---|---|
| workshops | status ASC, startAt ASC | Learner directory, volunteer opportunities |
| workshops | instructorId ASC, createdAt DESC | SI "My Workshops" |
| bookings | learnerId ASC, createdAt DESC | My Bookings |
| bookings | workshopId ASC, status ASC | roster, cancel |
| venueRequests | partnerId ASC, status ASC, createdAt DESC | CP request queue |
| venueRequests | instructorId ASC, createdAt DESC | SI request status |
| venueRequests | slotId ASC, status ASC | conflict sweep in approval tx |
| slots (collection group) | status ASC, startAt ASC | SI venue browse across facilities |
| slots (collection group) | partnerId ASC, startAt ASC | CP availability calendar |
| volunteerAssignments | volunteerId ASC, status ASC, startAt ASC | Assigned Workshops |
| voucherInventory | tierId ASC, status ASC, uploadedAt ASC | redeem (FIFO pick) |
| voucherInventory | claimedBy ASC, claimedAt DESC | my vouchers |
| incidents | status ASC, createdAt DESC | admin queue |
| incidents | reporterId ASC, createdAt DESC | my reports |
| notifications | userId ASC, createdAt DESC | inbox |
| auditLogs | targetType ASC, targetId ASC, createdAt DESC | admin detail views |

Equality-only lookups (e.g. bookings by `workshopId` + `ticketCode`) use automatic single-field indexes.

### 2.6 Search (#2-1, #3-1)
Directory query: `workshops where status == 'OPEN' and startAt >= now orderBy startAt limit SEARCH_FETCH_LIMIT`. Keyword, category, date range, distance sort and recommendations are applied client-side by pure functions in `packages/shared/src/logic/` (`filterWorkshops`, `sortByDistance`, `recommendWorkshops`). Recommendation score = `RECO_W_POPULARITY * seatsTaken/capacity + RECO_W_PROXIMITY * (1 / (1 + distanceKm))` (proximity term 0 without location). Volunteer opportunities use the same query + `needsVolunteers && volunteersAssigned < volunteerSlots`.

---

## 3. Security rules design

### 3.1 Principle
**Clients never write Firestore directly.** Every mutation goes through a callable Cloud Function (Admin SDK bypasses rules). Rules are read-only gates. Only exception: Firebase Storage uploads of report attachments. This gives one place per rule (the function controller) and makes rules trivially auditable.

### 3.2 Identity and claims
- Custom claims set by functions: `{ roles: Role[], status: AccountStatus }`. Set at `auth-exchangeSingpass`, staff account creation, and every status/role change (then `revokeRefreshTokens`). Clients call `getIdToken(true)` after role changes.
- Functions **do not trust claims for writes**: `requireCaller(ctx, { roles, requireActive: true, auditOnDeny? })` reads `users/{uid}` (source of truth), checks status `ACTIVE` and role membership, throws `UNAUTHENTICATED` / `ACCOUNT_SUSPENDED` / `PERMISSION_DENIED`. For admin callables `auditOnDeny: true` writes an `auditLogs` entry `PERMISSION_DENIED` (#5-1 Ex2).
- Suspension: `users-setAccountStatus(SUSPEND)` sets `users.status`, claims, `auth.updateUser(uid, { disabled: true })`, `revokeRefreshTokens`. Reactivate reverses it.
- Mode (Learner vs SI) is **not** a security concept: authorization is by role; mode only selects which UI is shown (ADR-008).

### 3.3 RBAC matrix (who can do what)

| Capability | LEARNER | SENIOR_INSTRUCTOR | VOLUNTEER | COMMUNITY_PARTNER | ADMIN |
|---|---|---|---|---|---|
| Browse OPEN workshops | yes | yes | yes | no | yes |
| Book workshop | yes (not own) | - | - | - | - |
| Create / edit own DRAFT workshop | - | approved profile | - | - | - |
| Request venue | - | approved profile, own workshop | - | - | - |
| Record attendance | - | own workshop | ASSIGNED to workshop | - | - |
| Roster (class list) | - | own workshop | ASSIGNED | - | yes |
| Wallet / redeem | - | yes (redeem needs APPROVED profile) | - | - | read |
| Opt in to assist | - | - | yes | - | - |
| Facilities, slots, decide requests | - | - | - | own facilities | read |
| Submit report | yes | yes | yes | - | - |
| Accounts, instructor review, workshop admin, incidents, vouchers admin, audit log | - | - | - | - | yes |

### 3.4 Firestore read rules (`firebase/firestore.rules`)

Helpers: `signedIn()`, `active() = request.auth.token.status == 'ACTIVE'`, `hasRole(r) = r in request.auth.token.roles`, `isAdmin() = hasRole('ADMIN')`, `isMe(uid) = request.auth.uid == uid`. Every allow below implicitly requires `signedIn() && active()`. **All `create`, `update`, `delete`: `if false`.**

| Path | `get` / `list` allowed if |
|---|---|
| users/{uid} | `isMe(uid) \|\| isAdmin()` |
| instructorProfiles/{uid} | `isMe(uid) \|\| isAdmin()` |
| workshops/{id} | `resource.data.status in ['OPEN','COMPLETED','CANCELLED'] \|\| resource.data.instructorId == auth.uid \|\| isAdmin()` (queries must filter on `status` or `instructorId` accordingly) |
| facilities/{id}, facilities/{id}/slots/{sid}, collection group `slots` | any active signed-in user (venue data is not sensitive) |
| venueRequests/{id} | `resource.data.instructorId == auth.uid \|\| resource.data.partnerId == auth.uid \|\| isAdmin()` |
| bookings/{id} | `resource.data.learnerId == auth.uid \|\| isAdmin()` (instructors/volunteers use `bookings-getRoster`) |
| attendance/{id} | `resource.data.learnerId == auth.uid \|\| resource.data.instructorId == auth.uid \|\| isAdmin()` |
| volunteerAssignments/{id} | `resource.data.volunteerId == auth.uid \|\| isAdmin()` |
| feedback/{id} | `resource.data.learnerId == auth.uid \|\| isAdmin()` |
| wallets/{uid}, wallets/{uid}/ledger/{e} | `isMe(uid) \|\| isAdmin()` |
| voucherTiers/{id} | any active signed-in user |
| voucherInventory/{id} | **never** (NFR 6.3; admin access via `vouchers-listInventory` with masked codes) |
| voucherUploads/{id} | `isAdmin()` |
| incidents/{id} | `resource.data.reporterId == auth.uid \|\| isAdmin()` |
| notifications/{id} | `resource.data.userId == auth.uid` |
| auditLogs/{id} | `isAdmin()` |

Suspended users fail `active()` once their token refreshes; `revokeRefreshTokens` + `disabled` forces this immediately for new sessions.

### 3.5 Storage rules (`firebase/storage.rules`)
- `reportUploads/{uid}/{fileId}`: `write` if `request.auth.uid == uid && request.resource.size <= MAX_ATTACHMENT_BYTES && request.resource.contentType.matches('image/(jpeg|png)|application/pdf')`; `read` if owner or `'ADMIN' in request.auth.token.roles`. No update/delete.
- Everything else denied.

---

## 4. Transaction designs

Common to all: implemented with `db.runTransaction` (Admin SDK; all reads before writes; default retries). On contention exhaustion the handler maps the Firestore `ABORTED` error to `BUSY_TRY_AGAIN`. `now` comes from `common/clock.ts` (injectable for tests). The `decide*` controller function receives plain snapshot data and either returns the write plan or throws `AppError`.

### 4.1 Book workshop — `bookings-bookWorkshop` (UC #2-2; FR 3.7-3.11; NFR 4.1, 4.2)
- Pre (outside tx): `requireCaller(roles: [LEARNER])`. Input `{ workshopId }`. Read `users/{uid}` (name) via requireCaller.
- Tx reads: `workshops/{workshopId}`, `bookings/{workshopId}_{uid}`.
- `decideBooking(workshop, existingBooking, uid, now)` checks in this order:
  1. workshop missing → `NOT_FOUND`
  2. `workshop.instructorId == uid` → `CANNOT_BOOK_OWN_WORKSHOP`
  3. `status != 'OPEN'` → `WORKSHOP_NOT_OPEN`
  4. `startAt <= now` → `WORKSHOP_STARTED`
  5. existing booking (any status) → `ALREADY_BOOKED` (details `{ bookingId }`)
  6. `seatsTaken >= capacity` → `WORKSHOP_FULL`
- Tx writes: `tx.create(bookings/{id}, { status: 'CONFIRMED', ticketCode, qrPayload, workshopSnapshot, ... })`; `tx.update(workshop, { seatsTaken: seatsTaken + 1, updatedAt })`; `tx.create(notifications/auto, BOOKING_CONFIRMED)`.
- `ticketCode` = 8 random Crockford base32 chars (crypto); `qrPayload` = `qrSigner.sign(bookingId)`.
- Output `{ bookingId, ticketCode, qrPayload, workshopSnapshot (ISO times), seatsRemaining }`.
- Concurrency: every booking reads and writes the same workshop doc, so Firestore serialises them; a loser re-runs and sees the new `seatsTaken`. Deterministic booking id makes duplicate requests (double tap, two devices) collide on `tx.create`. Capacity cannot be exceeded. Test: 20 parallel calls on capacity 5 → exactly 5 `CONFIRMED`, 15 `WORKSHOP_FULL`; same learner twice in parallel → 1 success, 1 `ALREADY_BOOKED`.
- No learner cancellation in the prototype (ADR-013).

### 4.2 QR payload format (tamper resistance)
- Format: `SA1.<bookingId>.<sig>`; `sig = base64url(HMAC_SHA256(QR_HMAC_SECRET, "SA1." + bookingId))` truncated to 22 chars (~128 bits). Regex: `^SA1\.([A-Za-z0-9_]{1,128})\.([A-Za-z0-9_-]{22})$`.
- `QR_HMAC_SECRET` is a functions-only env var (`functions/.env.local`, dev default for emulators). Signing and verifying live only in `functions/src/common/qrSigner.ts` (verify with `crypto.timingSafeEqual`). `packages/shared` only has `parseQrPayload` (format check) for instant client-side "not a SilverAcademy code" feedback.
- Properties: editing any character breaks the signature (`INVALID_QR`); payload carries no personal data beyond ids; replay of a valid code is harmless because attendance is once-only; version prefix allows key rotation (`SA2`). A screenshot of a ticket is a bearer token; staff see the learner's name in the confirmation to eyeball identity.
- Manual fallback (#1-4 Ex4): staff enter `ticketCode` (displayed as `XXXX-XXXX`) for the currently selected workshop. Normalise: uppercase, strip `-`/spaces, `O→0`, `I/L→1`. Lookup `bookings where workshopId == W and ticketCode == C` (0 → `TICKET_NOT_FOUND`, >1 → `TICKET_NOT_FOUND`, practically impossible).

### 4.3 Record attendance — `attendance-recordAttendance` (UC #1-4, #3-4; FR 2.7-2.10, 4.7-4.8; NFR 3.2, 4.3)
- Input: `{ workshopId, qrPayload } | { workshopId, ticketCode }` (zod discriminated by which key is present).
- Pre (outside tx): `requireCaller(roles: [SENIOR_INSTRUCTOR, VOLUNTEER])`. If `qrPayload`: `qrSigner.verify` → `INVALID_QR`; extract `bookingId`. If `ticketCode`: query → `bookingId` or `TICKET_NOT_FOUND`.
- Tx reads: `workshops/{workshopId}`, `bookings/{bookingId}`, `attendance/{bookingId}`, `volunteerAssignments/{workshopId}_{uid}` (only if caller is not the instructor), `wallets/{workshop.instructorId}`.
- `decideAttendance(...)` order:
  1. workshop missing → `NOT_FOUND`
  2. staff check: `uid == workshop.instructorId` (scannedByRole SI) **or** assignment exists with `status == 'ASSIGNED'` (scannedByRole VOLUNTEER); else `NOT_AUTHORISED_FOR_WORKSHOP`
  3. `workshop.status != 'OPEN' && != 'COMPLETED'` → `SESSION_NOT_ACTIVE`; `isCheckInWindowOpen(startAt, endAt, now)` false → `SESSION_NOT_ACTIVE` (window `startAt - CHECKIN_OPENS_MIN_BEFORE` .. `endAt + CHECKIN_CLOSES_MIN_AFTER`; bypassed when env `DEMO_IGNORE_CHECKIN_WINDOW=true`)
  4. booking missing or `booking.status == 'CANCELLED'` → `NO_BOOKING`
  5. `booking.workshopId != workshopId` → `WRONG_WORKSHOP` (#3-4 Ex3)
  6. attendance doc exists or `booking.status == 'ATTENDED'` → `ALREADY_ATTENDED` (details `{ learnerName, attendedAt }`)
- Tx writes:
  - `tx.create(attendance/{bookingId}, { ..., scannedBy: uid, scannedByRole, method, pointsAwarded: POINTS_PER_ATTENDANCE, instructorId })`
  - `tx.update(booking, { status: 'ATTENDED', attendedAt: now })`
  - `tx.update(workshop, { attendedCount: +1 })`
  - wallet: `tx.set(wallets/{instructorId}, { balance: b + P, lifetimeEarned: e + P, ... })` (creates if missing)
  - `tx.create(wallets/{instructorId}/ledger/earn_{bookingId}, { type: 'EARN_ATTENDANCE', amount: P, balanceAfter, workshopId, workshopTitle, bookingId })`
- Points always go to the workshop's instructor, whoever scans (ADR-010). Volunteers earn nothing.
- Output `{ learnerName, workshopTitle, attendedAt (ISO), method, pointsAwarded }`.
- Once-only is guaranteed by `tx.create` on the deterministic `attendance/{bookingId}` id even under concurrent scans by SI and volunteer.

### 4.4 Redeem voucher — `vouchers-redeemVoucher` (UC #1-7; FR 2.13-2.15, 6.28; NFR 3.3, 4.4)
- Input `{ tierId }`. Pre: `requireCaller(roles: [SENIOR_INSTRUCTOR])`; read `instructorProfiles/{uid}` → `status != 'APPROVED'` → `PROFILE_NOT_APPROVED`.
- Tx reads: `voucherTiers/{tierId}`, `wallets/{uid}`, query `voucherInventory where tierId == T and status == 'AVAILABLE' orderBy uploadedAt limit 1` (`tx.get(query)`).
- `decideRedeem(tier, wallet, candidate)`:
  1. tier missing or `!active` → `TIER_NOT_FOUND`
  2. `(wallet?.balance ?? 0) < tier.pointsCost` → `INSUFFICIENT_POINTS` (details `{ required, balance }`)
  3. no candidate → `OUT_OF_STOCK`
- Tx writes (all or nothing):
  - `voucherInventory/{id}`: `status 'CLAIMED', claimedBy uid, claimedAt now`
  - `wallets/{uid}`: `balance - cost`, `lifetimeRedeemed + cost`
  - `wallets/{uid}/ledger/redeem_{voucherId}`: `type 'REDEEM_VOUCHER', amount -cost, balanceAfter, voucherId, tierId, provider, denomination`
  - `voucherTiers/{tierId}`: `counts.AVAILABLE - 1, counts.CLAIMED + 1`
  - `auditLogs/auto`: `VOUCHER_REDEEM`, actor uid, target voucherId (no code)
- Output `{ voucherId, code, provider, denomination, pointsSpent, balanceAfter, claimedAt }`. The code is returned only here and from `vouchers-listMyVouchers`.
- Concurrency: two SIs racing for the last voucher both read the same candidate; one commits, the other retries, re-queries, gets `OUT_OF_STOCK`. One SI double-tapping: the second attempt sees the reduced balance. Any thrown error aborts all writes (Ex2, Ex3).

### 4.5 Voucher upload with dedupe — `vouchers-uploadVouchers` (UC #5-4; FR 6.23-6.29)
- Input `{ rows: { provider: string; denomination: number; code: string }[] }`, `1..MAX_UPLOAD_ROWS` rows (web parses CSV header `provider,denomination,code`). `requireCaller(roles: [ADMIN], auditOnDeny)`.
- Pre-tx (pure `classifyUploadRows(rows, tiers)`): normalise code (trim, uppercase); `!VOUCHER_CODE_REGEX` → `INVALID_FORMAT`; tier `${provider}_${denomination}` not existing/active → `UNKNOWN_TIER`; repeated normalised code within file → later occurrences `DUPLICATE_IN_FILE`. Survivors get id `sha256(code)`.
- Tx reads: `tx.getAll(...survivorRefs)` and the affected `voucherTiers` docs. Existing ids → `DUPLICATE_EXISTING`.
- Tx writes: `tx.create` each accepted voucher (`AVAILABLE`, `uploadBatchId`); tier `counts.AVAILABLE += n` per tier; `voucherUploads/{batchId}` summary (codes masked to last 4); `auditLogs` `VOUCHER_UPLOAD` with counts.
- Semantics: invalid/duplicate rows are rejected and reported; valid rows are committed together or not at all (Ex3). Write budget: `MAX_UPLOAD_ROWS (400) + tiers + 2 < 500`.
- Output `{ batchId, acceptedCount, rejected: [{ row, codeMasked, reason }] }`.
- Status change `vouchers-setVoucherStatus`: only `AVAILABLE → INVALID | REMOVED` (reason required); tx updates voucher + tier counts + audit.

### 4.6 Venue approval with slot locking — `venues-decideVenueRequest` (UC #4-2; FR 5.5-5.9)
Related flows first:
- `venues-requestVenue` (#1-3): SI with APPROVED profile owns workshop; tx reads workshop, slot, facility. Checks: workshop `status == 'DRAFT'` and `activeVenueRequestId == null` else `VENUE_REQUEST_EXISTS`/`WORKSHOP_NOT_EDITABLE`; slot `status == 'AVAILABLE'` else `SLOT_UNAVAILABLE`; `slot.startAt > now + VENUE_REQUEST_MIN_LEAD_MIN` else `SLOT_IN_PAST`; facility capacity >= workshop capacity else `VENUE_TOO_SMALL`. Writes: request `PENDING`, workshop `status 'PENDING_VENUE'`, `activeVenueRequestId`; notify CP (`VENUE_REQUEST_NEW`). The slot is **not** held; several SIs may request the same slot.
- Input `{ requestId, decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFO', reason?, message?, suggestedSlotId? }`. `requireCaller(roles: [COMMUNITY_PARTNER])`.
- Tx reads: request; workshop; slot; for APPROVE also query `venueRequests where slotId == S and status in ['PENDING','AWAITING_INFO']` and the workshops of those competitors.
- `decideVenueRequest(...)`:
  1. request missing → `NOT_FOUND`; `request.partnerId != uid` → `NOT_FACILITY_OWNER`
  2. `status not in ['PENDING','AWAITING_INFO']` → `REQUEST_NOT_PENDING`
  3. REJECT: write request `REJECTED` (+ optional `decisionReason`); workshop back to `DRAFT`, `activeVenueRequestId null`; notify SI.
  4. REQUEST_INFO: `message` required (`REASON_REQUIRED`); request `AWAITING_INFO`, `infoRequest`; notify SI. SI answers with `venues-respondToInfoRequest` → back to `PENDING`.
  5. APPROVE: if `slot.status != 'AVAILABLE'` or `workshop.status != 'PENDING_VENUE'` or `workshop.activeVenueRequestId != requestId` → **conflict path**: write request `CONFLICTED` (+ `suggestedSlotId` if given), workshop back to `DRAFT`, notify SI; commit; handler then throws `SLOT_CONFLICT` so the CP UI prompts for an alternative (#4-2 Ex2).
     Otherwise writes: request `APPROVED`, `decidedAt/By`; slot `BOOKED`, `bookedWorkshopId`, `bookedRequestId`; workshop `status 'OPEN'`, `slotId`, `startAt`, `endAt`, `venue` snapshot, `activeVenueRequestId null`; every competing request → `CONFLICTED` and its workshop → `DRAFT` (+ notification); notify SI (`VENUE_REQUEST_DECIDED`).
- Slot locking: the slot doc is read and written in the same tx as the request, so two CPs (or two tabs) approving different requests for the same slot serialise; the second sees `BOOKED` and takes the conflict path.
- Slot edits (`venues-upsertSlot`, `venues-deleteSlot`, #4-1): tx reads slot; `status == 'BOOKED'` → `SLOT_BOOKED_LOCKED` (FR 5.4); new status must be `AVAILABLE | UNAVAILABLE | MAINTENANCE` (BOOKED is only set by approval); `endAt > startAt` and duration `<= MAX_SLOT_HOURS` else `INVALID_TIME_RANGE`; `startAt > now` else `SLOT_IN_PAST`; overlap with another slot of the same facility (pre-tx query `startAt < newEnd`, filter `endAt > newStart`, exclude self) → `SLOT_OVERLAP`. When a slot leaves `AVAILABLE` (or is deleted) any `PENDING/AWAITING_INFO` requests on it become `CONFLICTED`, their workshops return to `DRAFT`, SIs notified (same tx).

### 4.7 Other small transactions (rules only; see `api/functions.md`)
- Volunteer opt-in: tx reads workshop + `volunteerAssignments/{wid}_{uid}`; existing `ASSIGNED` → `ALREADY_OPTED_IN` (details `{ status }`); workshop not OPEN / `!needsVolunteers` / started → `NOT_ACCEPTING_VOLUNTEERS`; `volunteersAssigned >= volunteerSlots` → `VOLUNTEERS_FULL`; write assignment `ASSIGNED` (set, so a previously WITHDRAWN doc is reused) + `volunteersAssigned + 1`. Withdraw (before `startAt`): `WITHDRAWN`, `-1`.
- Admin workshop cancel: tx sets workshop `CANCELLED` (+ `cancelReason`), all `CONFIRMED` bookings `CANCELLED` (<= `MAX_CAPACITY` docs), slot back to `AVAILABLE` with `bookedWorkshopId null`, notifications to learners and assigned volunteers, audit. Requires `reason` and `confirmImpact: true` when `seatsTaken > 0`.
- Feedback: tx reads attendance + feedback doc + workshop + instructorProfile; writes feedback and `ratingSum/ratingCount` on both.
- Admin edits on `users`, `workshops`, `incidents` take `expectedVersion`; mismatch → `STALE_VERSION`.

---

## 5. External service interfaces

Both interfaces live in `packages/shared/src/services/` (types only for auth; implementations for map since they are plain `fetch`).

### 5.1 AuthProvider (Singpass, mobile) and SingpassVerifier (functions)

```ts
// packages/shared/src/services/AuthProvider.ts
export type RegisterAs = 'LEARNER' | 'VOLUNTEER';

/** Opaque proof from the identity provider, exchanged server-side. Real Singpass: OIDC auth code + PKCE verifier. Mock: `mock:<profileId>`. */
export interface SingpassAssertion { assertion: string; nonce?: string; }

export interface AuthProvider {
  readonly kind: 'mock-singpass' | 'singpass';
  /** False if the IdP is unreachable; UI shows SINGPASS_UNAVAILABLE (#0-1 Ex2). */
  isAvailable(): Promise<boolean>;
  /** Runs the IdP login UI. Rejects with AppError SINGPASS_AUTH_FAILED | SINGPASS_UNAVAILABLE. */
  authenticate(): Promise<SingpassAssertion>;
}

/** Verified identity returned by the server-side verifier (never stored raw). */
export interface SingpassIdentity { sub: string; name: string; dateOfBirth: string /* YYYY-MM-DD */; }

/** functions/src/auth/SingpassVerifier.ts */
export interface SingpassVerifier {
  /** Throws AppError SINGPASS_AUTH_FAILED | SINGPASS_UNAVAILABLE. */
  verify(assertion: SingpassAssertion): Promise<SingpassIdentity>;
}

export interface MockSingpassProfile extends SingpassIdentity {
  profileId: string;          // e.g. 'learner-35', 'senior-62', 'senior-50', 'volunteer-28', 'senior-49-edge'
  label: string;              // shown on the mock login picker
  suggestedRegisterAs: RegisterAs;
}
export const MOCK_SINGPASS_PROFILES: readonly MockSingpassProfile[]; // packages/shared/src/auth/mockSingpassProfiles.ts
// Special profileIds: 'FAIL' → SINGPASS_AUTH_FAILED, 'DOWN' → SINGPASS_UNAVAILABLE (demo the exceptions).
```

Login sequence (mobile): `authProvider.authenticate()` → `call auth-exchangeSingpass({ assertion, registerAs? })` → `signInWithCustomToken(customToken)` → `getIdTokenResult()` for `roles` → show mode toggle iff roles include both LEARNER and SENIOR_INSTRUCTOR. If the response is `REGISTRATION_REQUIRED` the app shows "Join as Learner / Volunteer" and repeats the call with `registerAs`.
Server (`auth-exchangeSingpass`): verifier selected by env `AUTH_MODE` (`mock` in emulators; `MockSingpassVerifier` refuses to run otherwise). `uid = 'sp_' + sha256(sub).slice(0, 20)`. Age = full years from `dateOfBirth` at `now` (SG time). New user: roles `LEARNER` (+ `SENIOR_INSTRUCTOR` if age >= `SENIOR_MIN_AGE`) or `VOLUNTEER`; create `users` doc. Existing user: refresh `seniorEligible`/SI role; status not ACTIVE → `ACCOUNT_SUSPENDED`. Set claims; `createCustomToken(uid, claims)`.

Staff login (web, not an external service): Firebase email/password with email `${userId}@staff.silveracademy.test` (Firebase Auth hashes passwords: NFR 1.3). Then `auth-recordStaffLogin({ userId, outcome })` for audit. `auth/user-disabled` → "Account suspended, contact the platform team" and outcome `BLOCKED`. Wrong credentials → clear form, generic "Invalid Credentials. Access Denied", outcome `FAILURE`.

### 5.2 MapProvider (OneMap + stub)

```ts
// packages/shared/src/services/map/MapProvider.ts
export interface LatLng { lat: number; lng: number; }
export interface GeocodeResult extends LatLng { address: string; postalCode: string; buildingName?: string; }

export interface MapProvider {
  readonly kind: 'onemap' | 'stub';
  /** Cheap health probe (timeout MAP_TIMEOUT_MS). False → UI uses list view (#1-3 Ex2). */
  isAvailable(): Promise<boolean>;
  /** Free-text / postal search. Rejects with AppError MAP_UNAVAILABLE on network failure or timeout. */
  search(query: string, limit?: number): Promise<GeocodeResult[]>;
  /** 6-digit SG postal code → location; null if not found. */
  geocodePostal(postalCode: string): Promise<GeocodeResult | null>;
  /** XYZ raster tile template for map components, or null if this provider has no tiles. */
  tileUrlTemplate(): string | null;
  /** Attribution text required by the provider. */
  attribution(): string;
}

export function createMapProvider(cfg: { kind: 'onemap' | 'stub'; timeoutMs?: number; fetchImpl?: typeof fetch }): MapProvider;
// pure helper, not part of the provider:
export function haversineKm(a: LatLng, b: LatLng): number;
```

- `OneMapProvider`: search via `GET https://www.onemap.gov.sg/api/common/elastic/search?searchVal={q}&returnGeom=Y&getAddrDetails=Y&pageNum=1` (no token needed); tiles `https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png`; attribution "OneMap, Singapore Land Authority". Every call wrapped in `AbortController` timeout; failures become `MAP_UNAVAILABLE` and never touch Firestore (NFR 4.6).
- `StubMapProvider`: fixture list of ~20 SG addresses (`packages/shared/src/services/map/fixtures.ts`, shared with the seed script); `tileUrlTemplate()` returns null so the UI renders the list view.
- Selection: env `MAP_PROVIDER=onemap|stub` (default `stub` in emulators for offline demos).
- Device location (expo-location) is not part of MapProvider; "selected location" = device location or a postal code geocoded via `geocodePostal`.
- CP facility creation: web geocodes the postal code, passes `lat/lng` to `venues-upsertFacility`, which checks Singapore bounds (`LOCATION_OUT_OF_BOUNDS`).

---

## 6. Error handling conventions

- `packages/shared/src/errors.ts` exports `type AppErrorCode` (full list in `api/functions.md` §0) and `class AppError extends Error { code; details? }`.
- Functions: controllers throw `AppError`; `handlers` wrap every callable with `withErrorMapping(fn)` which converts to `HttpsError(httpsCode, message, { code, ...details })`. Unknown errors → `INTERNAL` (logged with stack, no internals to client). Firestore `ABORTED` after retries → `BUSY_TRY_AGAIN`.
- HttpsError code mapping: `unauthenticated` (UNAUTHENTICATED); `permission-denied` (PERMISSION_DENIED, ACCOUNT_SUSPENDED, PROFILE_NOT_APPROVED, NOT_AUTHORISED_FOR_WORKSHOP, NOT_ASSIGNED, NOT_FACILITY_OWNER, NOT_STAFF_ACCOUNT, CANNOT_TARGET_ADMIN, NOT_SENIOR_ELIGIBLE); `invalid-argument` (INVALID_INPUT, INVALID_QR, REASON_REQUIRED, INVALID_TIME_RANGE, LOCATION_OUT_OF_BOUNDS, ATTACHMENT_INVALID, UPLOAD_TOO_LARGE); `not-found` (NOT_FOUND, TICKET_NOT_FOUND, TIER_NOT_FOUND); `already-exists` (ALREADY_BOOKED, ALREADY_ATTENDED, ALREADY_OPTED_IN, ALREADY_SUBMITTED, VENUE_REQUEST_EXISTS); `resource-exhausted` (WORKSHOP_FULL, VOLUNTEERS_FULL, OUT_OF_STOCK); `unavailable` (SINGPASS_UNAVAILABLE, MAP_UNAVAILABLE); `aborted` (BUSY_TRY_AGAIN, STALE_VERSION); everything else `failed-precondition`.
- Apps: `services/callables.ts` converts `FirebaseError` → `AppError` using `details.code`. UI maps `AppErrorCode` → user text via a single strings file (task 2.11). Never show raw Firebase messages.
- Input validation: zod schemas in `packages/shared/src/schemas/` are used by both the app controller (inline field errors, NFR 2.4) and the function handler (`INVALID_INPUT` with `details.fieldErrors`).

---

## 7. Constants (`packages/shared/src/constants.ts`)

| Name | Value | Notes |
|---|---|---|
| FUNCTIONS_REGION | `'asia-southeast1'` | |
| SENIOR_MIN_AGE | 50 | FR 1.2 |
| WORKSHOP_TITLE_MAX / DESCRIPTION_MAX / MATERIALS_MAX | 80 / 2000 / 500 | |
| WORKSHOP_CAPACITY_MIN / MAX | 1 / 50 | keeps cancel tx < 500 writes |
| VOLUNTEER_SLOTS_MAX | 5 | |
| VENUE_REQUEST_MIN_LEAD_MIN | 60 | |
| MAX_SLOT_HOURS | 8 | |
| CHECKIN_OPENS_MIN_BEFORE / CLOSES_MIN_AFTER | 60 / 30 | active session window |
| POINTS_PER_ATTENDANCE | 1 | FR 2.10 |
| POINTS_PER_SGD | 2 | default `pointsCost = denomination * POINTS_PER_SGD` when seeding tiers |
| VOUCHER_CODE_REGEX | `/^[A-Z0-9-]{8,32}$/` | after trim + uppercase |
| MAX_UPLOAD_ROWS | 400 | tx write limit |
| TICKET_CODE_LENGTH | 8 | Crockford base32 |
| QR_PREFIX | `'SA1'` | |
| FEEDBACK_WINDOW_DAYS | 7 | |
| MAX_ATTACHMENT_BYTES / MAX_ATTACHMENTS | 5 MB / 3 | |
| INCIDENT_DESCRIPTION_MIN / MAX | 10 / 2000 | |
| SEARCH_FETCH_LIMIT | 200 | |
| RECO_W_POPULARITY / RECO_W_PROXIMITY | 0.6 / 0.4 | |
| MAP_TIMEOUT_MS | 4000 | |
| FONT_SCALES | `[1, 1.25, 1.5]` | NFR 2.1 |
| MIN_TOUCH_TARGET_PX | 44 | NFR 2.2 |
| SG_BOUNDS | lat 1.15-1.48, lng 103.6-104.1 | facility validation |
