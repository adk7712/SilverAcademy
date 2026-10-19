# Next Steps

Prioritised list for the next developer. Each item links to the limitation it addresses (`known-limitations.md`, IDs such as SEC1 or V1). Priority means:

- **P1.** Do before showing the prototype to anyone who will judge it, or before any real use.
- **P2.** Do before the prototype is extended beyond the demo scope.
- **P3.** Hardening, polish and cleanup. Safe to defer.

Start with `dev-guide.md` section 6 and run both demo flows, so you know the current state.

---

## P1: prove what the demo claims

1. **Run the two PDF flows on real devices and in a browser click-through** (V1, V2, V3).
   - Phone (iOS or Android, Expo Go or dev build): camera QR scanning in Flow B, the offline ticket in Flow A step 7, the create-workshop form, the venue map request, the redeem screen, volunteer screens, the report form with an attachment.
   - Web: the Partner approval (approve, reject, request info, slot add and edit), Admin voucher upload (CSV preview and rejected rows), accounts suspend and reactivate, incident status updates.
   - Record each result in `checklists/use-case-coverage.md` and `progress.md`. Write a handoff.
2. **Verify the NFR checks** (V9): scan under 3 s, search under 2 s on seed data, 44 px targets on a device, and offline ticket display. Tick `checklists/phase3-quality.md` only with evidence.
3. **Decide the H1 hardening** (SEC1). Pick one: award points only for QR check-ins, or cap MANUAL check-ins per workshop and flag them in the audit log. Needs a product decision, then a change in `functions/src/attendance` and `packages/shared`. Any demo that shows the manual code path should say that it can be abused.
4. **Retest the suspension retry path** (SEC3). The M1 fix makes SUSPEND and REACTIVATE retryable when the Auth step fails. Add an emulator test that simulates an Auth failure, then retries, and checks `disabled` and the claims.

## P2: close the gaps that matter beyond the demo

5. **Sensitive reads after suspension** (SEC2). Choose one: add a `get()` of `users/{uid}.status == 'ACTIVE'` to the rules for sensitive collections, or shorten token lifetime. Update ADR-025 with the decision.
6. **Task 1.8: consolidated backend unit tests.** The checklist lists over-capacity, duplicate booking, double attendance, redeem rollback and RBAC denials. Most of these exist in module tests (handoffs 1.2 to 1.4). Write a short matrix that maps each rule to its test, and fill any missing cases. Then tick 1.8 in `progress.md`.
7. **Storage hardening** (SEC7, L6). Restrict uploads to LEARNER, SENIOR_INSTRUCTOR and VOLUNTEER in `firebase/storage.rules`, add a per-user cap, and add a cleanup job for attachments not referenced by an incident.
8. **Admin-facing reasons vs learner copy** (SEC6, L5). Add a `publicReason` field for learner notices, keep the admin reason in the audit log, and stop exposing `flagReason` to the user's own document.
9. **Shared-device logout** (SEC9, L9). Clear `tickets:v1:<uid>` on explicit sign-out, or agree on a product rule for shared phones. This conflicts with the offline goal on a personal phone, so decide first.
10. **OneMap live check** (V10). With a real token and the browser origin, check CORS and the search and postal lookup. If the map is in scope for the demo, decide whether to keep the schematic plot or add tiles (S2).
11. **Reporter reply to AWAITING_INFO** (S6, L7). Add `reports-respondToIncident` and a mobile reply action, or record it as out of scope in the spec.
12. **Admin edits and denormalised copies** (B10). Decide whether title and description changes should update booking and request snapshots, or whether the snapshot wording should be shown in the UI.
13. **Cancelling a workshop and volunteers** (B11). Mark assignments as WITHDRAWN on cancel, and tell volunteers.

## P3: polish, hardening and cleanup

14. **Copy, icons and assets** (task 2.11, S15). Choose an icon set for the mobile tab bar; tidy the error strings across `strings/` and `i18n/`.
15. **Bookings audit action** (B1). Add a booking action to `AUDIT_ACTIONS` in `packages/shared` and write it in the transaction in `functions/src/bookings/repo/bookingRepo.ts`.
16. **Layering lint for cross-feature imports** (B20). Add an ESLint rule that blocks imports into another feature's internals (only `index.ts` is allowed).
17. **Web bundle** (F16). Split the routes with dynamic imports; the bundle is about 820 kB.
18. **Duplicated hooks** (F17). Move `useLoad` and `formatTimestamp` into one shared web util, keeping behaviour identical.
19. **Seed unions** (T1). Remove the two local literal unions in `firebase/seed/fixtures/bookings.ts` and `vouchers.ts` now that the shared enum typing is fixed, then rerun typecheck.
20. **Dependency audit** (T2). Run `npm audit` and fix the transitive issues that do not break the Expo or Firebase versions.
21. **Per-module READMEs** (T8). Audit each `apps/*/src/features/*/README.md` and `functions/src/*/README.md` against the code.
22. **Missing handoffs for 0.0 and 0.1** (`progress.md`). Write short handoffs for the docs hub and the requirements map, or mark them done with the reason.
23. **Mobile web cosmetic bug** (F8). Fix the bottom-tab href for nested route params on web.
24. **Emulator test hygiene** (T3, T4). Make the Jest emulator suites exit cleanly, and document the port cleanup in `dev-guide.md` (already there).
25. **Mockup extras** (S11). Decide whether voice search, text-to-speech, subsidy labels, the voucher goal card and the live check-in feed belong to the product. If not, say so in the demo script (it already warns against them).
26. **Curriculum review and CP onboarding** (S7, S8). These are spec gaps (ADR-009, ADR-021). Record the decision in `decisions.md` before building anything.

---

## Suggested first session for the next developer

1. Follow `dev-guide.md` sections 2 to 6 end to end. Note anything that does not match.
2. Do item 1 (device and browser click-through) for Flow A only. Write the handoff.
3. Do item 2 for the scan timing. The scanner and the search are the two numbers a judge is most likely to ask about.
4. Update `progress.md`, `checklists/`, and `known-limitations.md` for everything you verified or changed.
