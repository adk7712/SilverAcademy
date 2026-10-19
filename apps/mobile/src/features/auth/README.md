# auth

Mock Singpass login, first-login Learner/Volunteer choice, session (claims, persisted mode), logout (UC #0-1, FR 1.3).

- `repo/authRepo.ts`: Firebase Auth + `auth-exchangeSingpass`; `repo/modeRepo.ts`: local mode persistence.
- `controller/`: `sessionLogic.ts` (pure: claims, `canToggleMode`, `resolveMode`), `SessionProvider.tsx` (`useSession()`), `useLoginController.ts`.
- `ui/`: `LoginScreen`, `RegisterChoice`, `ModeToggle`, `AccountPanel`, `SessionBlockedScreen`.
- Public API (`index.ts`): `useSession`, `SessionProvider`, `LoginScreen`, `AccountPanel`, `ModeToggle`, `SessionBlockedScreen`.
- Real Singpass later: replace `services/auth/createAuthProvider.ts` only.
