# auth

UC #0-1 (Singpass, mocked) and #0-2 (staff login audit). Callables: `auth-exchangeSingpass`, `auth-recordStaffLogin` (both `public` access; the second needs auth for `SUCCESS`).

- `controller/singpassLogin.ts` `decideSingpassLogin` (pure): age check, roles for new users, role refresh for returning users, suspension. `singpassUid`.
- `controller/staffLogin.ts` `decideStaffLoginSuccess`, `AUDIT_OUTCOME_FOR` (BLOCKED is stored as audit outcome DENIED).
- `singpassVerifier.ts` `MockSingpassVerifier` (assertion `mock:<profileId>`, `FAIL`, `DOWN`), `createSingpassVerifier()` picks by `AUTH_MODE`; the mock throws outside emulators. Real Singpass replaces only this file.
- `repo/usersRepo.ts` login transaction; `repo/claimsRepo.ts` custom claims `{ roles, status }` + custom token.
- Web must call `getIdToken(true)` after `recordStaffLogin` SUCCESS (claims are written then, so rules see `status`).
