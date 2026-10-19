# Progress Board

Status: todo / in progress / done / blocked. Update the date whenever status changes. A task is done only when its handoff is written (`handoffs/`) and the relevant checklists are ticked.

**Task ID note.** IDs 2.1 to 2.6 are the **mobile** frontend tasks. IDs 2.7 to 2.10 are the **web** frontend tasks. The handoff file names also use "2.x", and "2.2" is used twice: `2.2-mobile-learner.md` is progress task 2.2 (mobile Learner), and `2.2-web-foundation.md` is progress task 2.7 (web foundation). Use the **Handoff** column below to find the right file. There is no progress task 2.11 handoff yet.

Done counts: phase 0 has 4 of 6 done (0.0 and 0.1 have artifacts but no handoff); phase 1 has 7 of 8 (1.8 open); phase 2 has 10 of 11 (2.11 open); phase 3 has 4 of 4.

## Phase 0 – Foundations

| ID | Task | Owner model | Status | Date | Handoff / notes |
|----|------|-------------|--------|------|-----------------|
| 0.0 | Docs hub skeleton and root CLAUDE.md | Sonnet | in progress | 2026-10-19 | Artifacts exist (`CLAUDE.md`, `docs/README.md`, root `README.md` from 3.4). No handoff file. |
| 0.1 | `docs/requirements-map.md` from PDF | Haiku | in progress | 2026-10-19 | File exists (use case map, NFR map, ambiguities). No handoff file. |
| 0.2 | Architecture and data model | Opus | done | 2026-10-19 | `handoffs/0.2-architecture.md` |
| 0.3 | Scaffold monorepo and tooling | Sonnet | done | 2026-10-19 | `handoffs/0.3-scaffold.md` |
| 0.4 | Shared types, enums, zod schemas, constants | Sonnet | done | 2026-10-19 | `handoffs/0.4-shared.md`. The enum typing defect from 0.5 is fixed in `packages/shared/src/enums.ts`. |
| 0.5 | Seed script | Haiku | done | 2026-10-19 | `handoffs/0.5-seed.md` |

## Phase 1 – Core backend

| ID | Task | Owner model | Status | Date | Handoff / notes |
|----|------|-------------|--------|------|-----------------|
| 1.1 | Mock Singpass AuthProvider, role/age check, role toggle, RBAC + Firestore rules | Sonnet | done | 2026-10-19 | `handoffs/1.1-auth-infra.md` |
| 1.2 | Booking transaction (`bookings-*`) | Opus | done | 2026-10-19 | `handoffs/1.2-bookings.md` |
| 1.3 | Attendance function (`attendance-recordAttendance`) | Opus | done | 2026-10-19 | `handoffs/1.3-attendance.md` |
| 1.4 | Voucher redeem and upload with dedupe (`vouchers-*`) | Opus | done | 2026-10-19 | `handoffs/1.4-vouchers.md` |
| 1.5 | Workshop CRUD, venue request/approval, volunteer opt-in | Sonnet | done | 2026-10-19 | `handoffs/1.5-workshops-venues.md` |
| 1.6 | MapProvider (OneMap + stub), distance sorting | Sonnet | done | 2026-10-19 | `handoffs/1.6-map.md`. OneMap live calls untested (see known limitations). |
| 1.7 | Audit-log helper, admin account actions, instructor review, feedback, reports | Sonnet | done | 2026-10-19 | `handoffs/1.7-admin-users-reports.md` |
| 1.8 | Unit tests for backend rules (consolidated pass) | Sonnet | todo | | Per-module tests exist (handoffs 1.1 to 1.7, about 137 emulator and 373 Jest tests). A consolidated pass against the rule list is still open. |

## Phase 2 – Frontends

Mobile tasks (2.1 to 2.6):

| ID | Task | Owner model | Status | Date | Handoff / notes |
|----|------|-------------|--------|------|-----------------|
| 2.1 | Mobile design system, shell, Firebase client, auth, navigation | Sonnet | done | 2026-10-19 | `handoffs/2.1-mobile-foundation.md` |
| 2.2 | Mobile Learner: Discover, workshop detail, My Bookings, offline QR ticket | Sonnet | done | 2026-10-19 | `handoffs/2.2-mobile-learner.md`. Not run on devices. |
| 2.3 | Mobile Instructor: dashboard, create workshop, venue request, instructor profile | Sonnet | done | 2026-10-19 | `handoffs/2.3-mobile-instructor.md`. Map is schematic. |
| 2.4 | Mobile scanner with manual ticket-code fallback, class roster | Sonnet | done | 2026-10-19 | `handoffs/2.4-mobile-scanner.md`. Camera not run on a device. |
| 2.5 | Mobile Wallet, points history, redeem voucher | Sonnet | done | 2026-10-19 | `handoffs/2.5-mobile-wallet.md` |
| 2.6 | Mobile Volunteer (opportunities, assist, assigned), Report an Issue, Profile notifications, learner feedback | Sonnet | done | 2026-10-19 | `handoffs/2.6-mobile-volunteer-reports.md` |
| 2.11 | Copy, error strings, icon/asset wiring (mobile and web) | Haiku | todo | | No icon set installed; text-only tab bars. |

Web tasks (2.7 to 2.10):

| ID | Task | Owner model | Status | Date | Handoff / notes |
|----|------|-------------|--------|------|-----------------|
| 2.7 | Web: admin/partner login, layout, route guards | Sonnet | done | 2026-10-19 | Delivered with the web foundation: `handoffs/2.2-web-foundation.md` |
| 2.8 | Web: Partner venue availability and request approval | Sonnet | done | 2026-10-19 | `handoffs/2.8-web-partner.md`. UI clicks not run in 3.1. |
| 2.9 | Web Admin part 1: accounts, workshops, instructor review | Sonnet | done | 2026-10-19 | `handoffs/2.9-web-admin-accounts.md`. Mutations not clicked in 3.1. |
| 2.10 | Web Admin part 2: voucher inventory, incident queue | Sonnet | done | 2026-10-19 | `handoffs/2.10-web-admin-vouchers-incidents.md`. Mutations not clicked in 3.1. |

## Phase 3 – Integration and quality

| ID | Task | Owner model | Status | Date | Handoff / notes |
|----|------|-------------|--------|------|-----------------|
| 3.1 | E2E run of the two PDF mockup flows on emulators; fix wiring bugs | Sonnet | done | 2026-10-19 | `handoffs/3.1-integration.md`. Backend path verified by `npm run e2e`; web and mobile-web smoke only. |
| 3.2 | Review pass: concurrency, atomicity, RBAC, layering | Opus | done | 2026-10-19 | `review-findings.md` (no Critical findings; H1, H2, M1 to M5 and Lows) |
| 3.3 | Review fixes (H1, H2, M1 to M5, cheap Lows) and simplify pass | Sonnet | done | 2026-10-19 | `handoffs/3.3-review-fixes.md`. Deferred items are listed in `known-limitations.md`. |
| 3.4 | Final docs: root README, dev-guide, demo script, progress and checklist sweep | Haiku | done | 2026-10-19 | Root `README.md`, `dev-guide.md`, `known-limitations.md`, `next-steps.md`, checklists. `handoffs/3.4-final-docs.md` |

## Open NFR checks (phase 3 checklist)

NFR checks (44 px targets, scan under 3 s, search under 2 s on seed data, ticket viewable offline) are **not** verified. The 44 px target is checked in code (`minTouchTarget`), not on a device. See `checklists/phase3-quality.md`.

Note 2026-10-19: 4.1 web sweep fixes (session-expiry logout in reports/vouchers, stale-response races, voucher page error banner, Modal busy Esc, misc) done; see `handoffs/4.1-web-fixes.md`.

Note 2026-10-19: 4.2 mobile sweep fixes done; see `handoffs/4.2-mobile-fixes.md`.

- 4.4 shared sweep fixes done: see docs/handoffs/4.4-shared-fixes.md (not committed).

- 4.3 backend sweep fixes done: see docs/handoffs/4.3-backend-fixes.md (not committed).
