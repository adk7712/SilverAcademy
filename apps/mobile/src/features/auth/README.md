# auth

Fake Singpass login, first-login Learner/Volunteer choice, session (claims, persisted mode), logout (UC #0-1, FR 1.3).

Login flow (demo only, permanent "DEMO - not real Singpass" banner on every login state; it is pinned under the header via `Screen`'s `banner` prop, outside the scroll area):

1. `LoginScreen`: one "Log in with Singpass" button opens `FakeSingpassScreen`.
2. `FakeSingpassScreen`: a Singpass-style layout with an app/QR tab (plain placeholder, not a scannable code) and a Singpass ID + password tab. Type a seed profile ID or tap a demo account.
3. Fake "Approve in the Singpass app" step (`APPROVAL_DELAY_MS` in `constants.ts`, cancellable). Then `login(profileId)` runs: `auth-exchangeSingpass`, roles and the age check are server-side. The app-tab pretend-scan and typed IDs go through the approval step; the Demo tools simulations skip it by design.
4. First login: `RegisterChoice` is shown and its choice calls `login(profileId, registerAs)` directly. The approval step is not repeated.
5. "Demo tools" (collapsed by default) holds the hidden simulations: age 49 (`senior-49-edge`), suspended (`suspended-demo`, seeded SUSPENDED, so the real backend answers `ACCOUNT_SUSPENDED`; in mock mode the server also refuses it when its doc is missing, and an admin reactivation lets it log in normally until the next reseed), Singpass down (`DOWN`) and failed login (`FAIL`). They skip the approval delay.

Rules:

- Only known seed profile IDs are accepted (`resolveTypedProfileId`: trimmed, case-insensitive). An unknown typed ID is rejected on the device and never sent to the server, so a mistyped real NRIC never leaves the phone. `FAIL`/`DOWN` cannot be typed.
- The password must be non-empty on the ID tab but is never checked, stored outside component state, sent or logged. Secure entry, autofill off, and a visible "do not enter your real Singpass password" warning.
- Leaving or cancelling never signs in: the approval timer is cleared on cancel and unmount, double taps are ignored, and a generation token (`loginGeneration.ts`) in `useLoginController` makes a login that was in flight when the user left skip the exchange/sign-in and any state update. Every leave (Back, Android hardware back, Cancel) calls `reset`, so reopening shows no stale error or first-login choice. Back and hardware back work while the server exchange runs (`LoadingStage` `exchange`, `canLeaveWhileLoading`) and are hidden/swallowed only once the token sign-in has started (`session`). The already-sent exchange cannot be recalled.
- After a successful sign-in the screen stays on "Logging in" until the session swaps it out (no flash of the form); if that never happens within `SESSION_HYDRATE_FALLBACK_MS`, `decideHydrateFallback` makes the controller call `signOutUser` and show the `INTERNAL` error, so Firebase is not left signed in and a retry re-hydrates. A stale attempt (left, reset, unmounted) does nothing.
- Web a11y: `aria-expanded` (Demo tools) and `aria-checked` (tabs) are passed explicitly because react-native-web does not map `accessibilityState`. The password field uses `autoComplete="new-password"` on web only, so browsers neither fill nor offer to save it.

Files:

- `repo/authRepo.ts`: Firebase Auth + `auth-exchangeSingpass`; `repo/modeRepo.ts`: local mode persistence.
- `controller/`: `fakeSingpassLogic.ts` (pure: ID check, screen states, simulations), `approvalGate.ts` (pure timer gate), `flowMachine.ts` (pure: busy guard, approval, cancel, register rules), `loginGeneration.ts` (pure: stale-attempt token), `loginLogic.ts` (pure: login phase, demo account list), `useFakeSingpassFlow.ts`, `useLoginController.ts`, `sessionLogic.ts` (pure: claims, `canToggleMode`, `resolveMode`), `SessionProvider.tsx` (`useSession()`).
- `ui/`: `LoginScreen`, `FakeSingpassScreen`, `SingpassIdTab`, `SingpassQrTab`, `DemoAccountList`, `DemoTools`, `DemoBanner`, `RegisterChoice`, `ModeToggle`, `AccountPanel`, `SessionBlockedScreen`.
- Public API (`index.ts`): `useSession`, `SessionProvider`, `LoginScreen`, `AccountPanel`, `ModeToggle`, `SessionBlockedScreen`.
- Real Singpass later: replace `services/auth/createAuthProvider.ts` and `FakeSingpassScreen`, and add a real verifier in functions in place of `UnconfiguredSingpassVerifier`.
