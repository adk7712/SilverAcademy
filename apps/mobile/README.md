# mobile

Expo app (Learner, Instructor, Volunteer). Plain React Navigation. Run: `npm run dev:mobile` (press `w` for web, `i`/`a` for simulators).

- Env (`apps/mobile/.env.local`, see root `.env.example`): `EXPO_PUBLIC_USE_EMULATORS=true`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_EMULATOR_HOST` (use `10.0.2.2` on the Android emulator, the LAN IP on a phone). Without emulators set `EXPO_PUBLIC_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_APP_ID`.
- Layout: `src/app` (entry/providers), `src/navigation` (typed routes + shells), `src/design` (theme, components), `src/i18n` (strings), `src/services` (firebase, callables, error mapper), `src/features/<feature>` (ui/controller/repo).
- Foundation handoff and screen ownership table: `docs/handoffs/2.1-mobile-foundation.md`.
- Bundle check: `npx expo export --platform web` (from `apps/mobile`; delete `dist/` afterwards).
