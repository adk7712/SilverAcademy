# web

React + Vite app (Admin, Community Partner). Run: `npm run dev:web`.

- Hosted: https://silver-academy-web-adk7712.vercel.app (Vercel project `silver-academy-web`, config in the root `vercel.json`). Sign in at `/login` with `admin01` or `partner01`; password `<ask the project owner>`.
- Env (`apps/web/.env.local` locally, Vercel env vars when hosted, see root `.env.example`): emulators are on unless `VITE_USE_EMULATORS=false`. For a real Firebase project set `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_API_KEY`.
- Production build check: `npm run build -w @silveracademy/web` (output in `apps/web/dist`). Setup details: `docs/hosted-demo.md`.
