# Handoff: F Fake Singpass login

## Task
Issue #1: replace the mobile profile picker with a fake Singpass screen. Keep it demo-only. Do not integrate real Singpass.

## Agent / model
ADK (issue #1). Docs pass by Claude (claude-haiku-5-5).

## What was built
- Mobile login: `LoginScreen` shows a DEMO banner and one "Log in with Singpass" button. That opens `FakeSingpassScreen`, which has a permanent "DEMO - not real Singpass" banner in every state and no real Singpass logo or assets.
- Two tabs. App/QR tab: a dashed placeholder box (not a scannable code); tapping a demo account pretend-scans it and goes to approval, with no password. Singpass ID + password tab: tapping a demo account fills the ID; type an ID and any non-empty password, then submit.
- Approval step: "Approve in the Singpass app", 2 second delay (`APPROVAL_DELAY_MS`), cancellable. Then the unchanged `login(profileId)` runs (`auth-exchangeSingpass`).
- First login still shows `RegisterChoice`. Its choice calls `login(profileId, registerAs)` directly, with no second approval.
- Demo tools: collapsed button at the bottom of the screen. Contains `senior-49-edge` (age 49), `suspended-demo`, Singpass unavailable (`DOWN`) and auth failure (`FAIL`). Simulations skip the approval delay.
- ID rules: only seed profile IDs are accepted (trimmed, case-insensitive). An unknown ID is rejected on the device and never sent to the server. `FAIL` and `DOWN` cannot be typed.
- Password rules: required non-empty, never checked, kept only in local component state, never sent or logged. The screen warns not to enter a real password.
- Leaving or cancelling during the approval delay cancels sign-in (timer cleared on cancel and unmount; double taps ignored).
- Seed: new `suspended-demo` profile (Koh Beng Huat, DOB 1968-04-12, LEARNER + SENIOR_INSTRUCTOR, status SUSPENDED, also on the Auth claim). It has no workshops, bookings or wallet. Login returns `ACCOUNT_SUSPENDED`. Singpass profiles go from 6 to 7; seeded Auth users +1.
- Cloud Functions logic changed slightly: the mock verifier accepts `suspended-demo` (via `MOCK_SINGPASS_PROFILES`) and `decideSingpassLogin` has a mock-mode-only guard (`mockMode`) that refuses `suspended-demo` with `ACCOUNT_SUSPENDED` when it has no user doc, so it never registers. With a doc, normal rules apply: an admin can reactivate it and it then logs in normally until a reseed (no code change, documented). Tests: `functions/src/auth/auth.test.ts`, `suspendedMockGuard.test.ts`, `auth.emu.test.ts`, `firebase/e2e/run.ts` (also checks the seeded Auth user is disabled and an admin REACTIVATE, then re-suspends it).
- The seed now sets `disabled: true` on SUSPENDED Auth users (`apply.ts`), like a real suspension; login still returns `ACCOUNT_SUSPENDED` from the exchange and admin REACTIVATE enables the user again.
- Leave handling: Back and Android back work during the server exchange and are hidden only once token sign-in has started (`LoadingStage`: `exchange` / `session`), `reset` on every leave, stale-attempt token in `useLoginController`; the form no longer reappears while the session loads after a successful login (fallback timer). If the session still has not loaded after `SESSION_HYDRATE_FALLBACK_MS`, the fallback signs out (`signOutUser`) and shows the `INTERNAL` error, so a retry re-hydrates. Web a11y (`aria-expanded`, `aria-checked`), `autoComplete="new-password"` on web, Enter submits on the ID field, banner pinned via `Screen`'s `banner` prop, `.gitignore` and ESLint ignore for `.deploy/`.
- By design the simulations skip the approval step; typed IDs and the app-tab pretend-scan go through it.

## Files touched
Tracked, modified:
- `apps/mobile/src/design/components/Segmented.tsx`: new `testID` option, `aria-checked`.
- `apps/mobile/src/design/components/TextField.tsx`: autofill pass-through.
- `apps/mobile/src/design/components/Button.tsx`: `aria-expanded`.
- `apps/mobile/src/design/components/Screen.tsx`: optional `banner` prop (pinned, outside the scroll area).
- `apps/mobile/src/features/auth/controller/useLoginController.ts`: generation token, loading stage, hydrate fallback with sign-out.
- `.gitignore`, `eslint.config.mjs`: `.deploy/`, hosted creds and env.
- `firebase/e2e/run.ts`: `suspended-demo` check.
- `functions/src/auth/controller/singpassLogin.ts`, `handlers/exchangeSingpass.ts`, `repo/usersRepo.ts`, `auth.test.ts`, `auth.emu.test.ts`, `README.md`: suspended-demo guard.
- `docs/api/functions.md`.
- `apps/mobile/src/features/auth/README.md`: new login flow and rules.
- `apps/mobile/src/features/auth/controller/loginLogic.ts` and `loginLogic.test.ts`: demo account list and login phase.
- `apps/mobile/src/features/auth/ui/LoginScreen.tsx`: opens the fake screen.
- `apps/mobile/src/i18n/en/auth.ts`: strings.
- `firebase/seed/apply.ts`, `firebase/seed/fixtures/accounts.ts`, `firebase/seed/types.ts`: `suspended-demo`.
- `packages/shared/README.md`, `packages/shared/src/auth/mockSingpassProfiles.ts` and `.test.ts`, `packages/shared/src/logic/logic.test.ts`: shared profile list and tests.

New, untracked:
- `apps/mobile/src/features/auth/constants.ts`
- `apps/mobile/src/features/auth/controller/approvalGate.ts` and `approvalGate.test.ts`
- `apps/mobile/src/features/auth/controller/fakeSingpassLogic.ts` and `fakeSingpassLogic.test.ts`
- `apps/mobile/src/features/auth/controller/useFakeSingpassFlow.ts`, `flowMachine.ts` and `flowMachine.test.ts`, `loginGeneration.ts` and `loginGeneration.test.ts`
- `apps/mobile/src/features/auth/ui/FakeSingpassScreen.tsx`, `SingpassIdTab.tsx`, `SingpassQrTab.tsx`, `DemoAccountList.tsx`, `DemoTools.tsx`, `DemoBanner.tsx`
- Docs in this change: `docs/decisions.md`, `docs/dev-guide.md`, `docs/architecture.md`, `docs/known-limitations.md`, `docs/progress.md`, `docs/README.md`, `docs/checklists/use-case-coverage.md`, `docs/handoffs/F-fake-singpass.md`, and root `README.md`.

## Interfaces exposed
- `MOCK_SUSPENDED_PROFILE_ID` (`'suspended-demo'`) from `@silveracademy/shared`.
- `TextField`: autofill props pass through to the input.
- `Segmented`: option `testID`.

## Open issues
- Password field is cosmetic (`known-limitations.md` S16).
- Layout not checked on a physical device (`known-limitations.md` V13).
- Leaving after the server call has started does not stop that call; the device ignores its result, but the server may still create or refresh the user doc.
- `npm run e2e` exits 0 even with no emulators (sections print "fetch failed"); see `known-limitations.md` section 7. Not fixed.
- Hosted rollout order: merge the opt-in branch (PR #11), deploy functions, reseed, then ship mobile web. The reseed overwrites live demo data on fixed IDs (full-doc `set()` in `firebase/seed/apply.ts`, Auth users reset in place). Not done.

## Notes for next agent
- Branch from `origin/master`, not from PR #11. Do not stack on it.
- Do not commit these untracked local files: `.cloud-demo-credentials`, `.deploy/`, `functions/.env.silveracademy-demo-adk`. The first one holds hosted credentials (CLAUDE.md).
- The reseed is a separate step. Nothing here has been deployed or reseeded. `CLAUDE.md` points to `docs/hosted-demo.md` for hosted steps, but that file does not exist yet.
- Real Singpass later: replace `services/auth/createAuthProvider.ts` and `FakeSingpassScreen`, and add a real verifier in functions in place of `UnconfiguredSingpassVerifier` (`functions/src/auth/singpassVerifier.ts`).

## Verification
Three test and fix rounds, each with browser testing. Two rounds of code review. The final round found no failures.

Final commands:
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npx prettier --check . '!.claude/settings.local.json'`: pass. `npm run format:check` fails locally only on the machine-local, git-ignored `.claude/settings.local.json`.
- `npm test`: Jest 54 suites and 450 tests pass; web 16 files and 115 tests pass.
- `npm run test:emulator`: 11 suites and 138 tests pass.
- `npm run e2e`: 70 checks pass, 0 fail, against seeded emulators.

Browser (Expo mobile web, Chrome, 375x812 and 320x568, localhost emulators):
- All seeded roles reach the correct shell through both tabs. `senior-49-edge` is Learner only.
- `suspended-demo` is refused, including when its user doc is deleted.
- `DOWN` and `FAIL` simulations behave as designed.
- An unknown ID sends no network request.
- The password canary is absent from requests, URL, console, storage, IndexedDB and cookies.
- Cancel, stale-login and hung-exchange handling work.
- The 15 s hydrate fallback signs out, and retry works.
- The DEMO banner stays in view.
- Targets are at least 44x44.
- Aria attributes are present.

Admin reactivation of `suspended-demo` was exercised in the round 2 browser test and is covered in the e2e run.

Not tested:
- Native iOS and Android, and physical devices.
- Android hardware back.
- Hosted (Vercel and Firebase).
