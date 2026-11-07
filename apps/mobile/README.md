# mobile

Expo app (Learner, Instructor, Volunteer). Plain React Navigation. Run: `npm run dev:mobile` (press `w` for web, `i`/`a` for simulators).

- Env (`apps/mobile/.env.local`, see root `.env.example`): `EXPO_PUBLIC_USE_EMULATORS=true`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_EMULATOR_HOST` (use `10.0.2.2` on the Android emulator, the LAN IP on a phone). Without emulators set `EXPO_PUBLIC_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_APP_ID`.
- Layout: `src/app` (entry/providers), `src/navigation` (typed routes + shells), `src/design` (theme, components), `src/i18n` (strings), `src/services` (firebase, callables, error mapper), `src/features/<feature>` (ui/controller/repo).
- Foundation handoff and screen ownership table: `docs/handoffs/2.1-mobile-foundation.md`.
- Bundle check: `npx expo export --platform web` (from `apps/mobile`; delete `dist/` afterwards).
- Hosted (web build): https://silver-academy-mobile-adk7712.vercel.app (Vercel project `silver-academy-mobile`, root directory `apps/mobile`, config in `apps/mobile/vercel.json`, built with `npx expo export -p web`). Pick a profile in the mock Singpass picker.
- Hosted env (Vercel env vars): `EXPO_PUBLIC_USE_EMULATORS=false`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_API_KEY`, optional `_AUTH_DOMAIN` and `_APP_ID`. Setup details: `docs/hosted-demo.md`.
