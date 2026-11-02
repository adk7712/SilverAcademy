# Hosted Demo

The prototype also runs online, so it can be tried from any browser without the emulators. This page lists the links, how the hosted setup differs from local development, and how to redeploy. Decision record: ADR-026 and ADR-027 in `decisions.md`. Limits: section 8 of `known-limitations.md`.

The hosted demo is for showing the prototype. It uses **mock Singpass** and seeded demo data. Do not enter real personal data.

---

## 1. Links

| App | Who uses it | URL |
|---|---|---|
| Staff web app (Admin, Community Partner) | `admin01`, `partner01` | https://silver-academy-web-adk7712.vercel.app (sign in at `/login`) |
| Mobile web app (Learner, Instructor, Volunteer) | the mock Singpass profiles | https://silver-academy-mobile-adk7712.vercel.app |
| Firebase project | backend | `silveracademy-demo-adk` (Blaze plan, region `asia-southeast1`) |

Other Vercel aliases exist (`silver-academy-web.vercel.app`, `silver-academy-mobile.vercel.app`). The `-adk7712` ones above are the ones to share.

Each pull request also gets preview URLs from Vercel (posted as a PR comment by the Vercel bot). Previews use the **same** Firebase project as the main links, so what you do in a preview changes the shared demo data.

---

## 2. Accounts

- **Mobile web:** pick a profile in the mock Singpass picker (`learner-35`, `senior-62`, `volunteer-28`, ...). The full list is in `dev-guide.md` section 5.
- **Staff web:** user id `admin01` or `partner01` with the staff password.
  - Staff password: `<ask the project owner>`. It is deliberately not written in the repo.
  - The owner keeps the original generated values in the git-ignored file `.cloud-demo-credentials` (repo root). The passwords may have been changed afterwards in Firebase Auth, so the file can be out of date.
  - Firebase Auth needs at least 6 characters. The seed script needs at least 8 (`STAFF_PASSWORD_MIN`).

---

## 3. How the hosted setup differs from local

| | Local | Hosted |
|---|---|---|
| Backend | Firebase emulators (`demo-silveracademy`) | Real Firebase project `silveracademy-demo-adk` |
| Singpass | mock, allowed because it is an emulator | mock, allowed only with `ALLOW_MOCK_AUTH=true` (ADR-027) |
| Web client | `VITE_USE_EMULATORS` defaults to on | `VITE_USE_EMULATORS=false` in Vercel |
| Mobile client | `EXPO_PUBLIC_USE_EMULATORS=true` | `EXPO_PUBLIC_USE_EMULATORS=false` (the default) |
| Seed | emulator hosts set, project id starts with `demo-` | cloud opt-in, see section 5 |
| `DEMO_IGNORE_CHECKIN_WINDOW` | honoured | ignored (emulator only), so check-in only works inside the real window |
| Map | stub provider | stub provider (`MAP_PROVIDER=stub`) |

The Firebase web API key is public client config. It is meant to ship in the browser bundle. Access is controlled by Auth, security rules and the callable functions, not by hiding the key.

---

## 4. Configuration

### Vercel environment variables (Production and Preview)

`silver-academy-web` (staff web app):

| Variable | Value |
|---|---|
| `VITE_USE_EMULATORS` | `false` |
| `VITE_FIREBASE_PROJECT_ID` | `silveracademy-demo-adk` |
| `VITE_FIREBASE_API_KEY` | `<web API key from Firebase console: Project settings, General>` |

`silver-academy-mobile` (mobile web app):

| Variable | Value |
|---|---|
| `EXPO_PUBLIC_USE_EMULATORS` | `false` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `silveracademy-demo-adk` |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | `<web API key>` |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` / `EXPO_PUBLIC_FIREBASE_APP_ID` | optional; set from the Firebase console if needed |

### Cloud Functions environment

Functions read `functions/.env.<project id>` at deploy time. For this project that is `functions/.env.silveracademy-demo-adk`. It is git-ignored; create it by hand:

```
AUTH_MODE=mock
ALLOW_MOCK_AUTH=true
QR_HMAC_SECRET=<long random string; must match the value used when seeding>
MAP_PROVIDER=stub
```

### Vercel project settings

- `silver-academy-web`: root directory `./`, config in the root `vercel.json` (installs with `npm ci`, builds `@silveracademy/web`, serves `apps/web/dist`, SPA rewrite).
- `silver-academy-mobile`: root directory `apps/mobile`, config in `apps/mobile/vercel.json` (installs from the repo root, builds with `npx expo export -p web`, serves `dist`, SPA rewrite).
- Deployment Protection (Vercel SSO) is turned off on both projects so the links open without a Vercel login. Changing this is a dashboard action.
- Pushes to `master` deploy to production; every other branch and PR gets a preview.

---

## 5. Redeploying and reseeding

Prerequisites: Firebase CLI signed in to an account with owner access to `silveracademy-demo-adk`, and `functions/.env.silveracademy-demo-adk` in place. Run everything from the repo root.

1. **Functions.** Cloud Build cannot install the workspace package `@silveracademy/shared`, so `firebase.deploy.json` deploys a staged copy of the esbuild bundle with a minimal `package.json` (`firebase/prepare-functions-deploy.mjs`, output in git-ignored `.deploy/`):
   ```sh
   npx firebase deploy --only functions --config firebase.deploy.json --project silveracademy-demo-adk
   ```
2. **Rules, indexes, Auth providers.**
   ```sh
   npx firebase deploy --only firestore,storage,auth --config firebase.deploy.json --project silveracademy-demo-adk
   ```
3. **Seed the data** (overwrites seeded documents; safe to rerun). Needs Application Default Credentials for the project, and no emulator variables set:
   ```sh
   SEED_CLOUD_PROJECT=silveracademy-demo-adk GCLOUD_PROJECT=silveracademy-demo-adk \
   SEED_ADMIN_PASSWORD=<admin password> SEED_PARTNER_PASSWORD=<partner password> \
   QR_HMAC_SECRET=<same value as in functions/.env.silveracademy-demo-adk> \
   npm run seed
   ```
   The seed refuses to run unless `SEED_CLOUD_PROJECT` equals `GCLOUD_PROJECT` and all three secrets are set (`firebase/seed/guard.ts`).
4. **Web and mobile apps.** Push to GitHub. Vercel builds both projects on its own.

Notes:
- A function created without the public invoker setting keeps rejecting browser calls. The 33 callables were created with it; if you ever delete and recreate them, deploy them as new functions rather than patching.
- `createCustomToken` (mock login) needs the compute service account to hold `roles/iam.serviceAccountTokenCreator`. This is granted already.
- After the first functions deploy, Artifact Registry needs a cleanup policy: `npx firebase functions:artifacts:setpolicy --location asia-southeast1 --project silveracademy-demo-adk`.

---

## 6. Smoke test after a deploy

1. Open the mobile web URL, pick `learner-35`, and check that Discover lists workshops.
2. Open the staff web URL, sign in as `admin01`, and check that Accounts loads.
3. If staff sign-in says "Invalid Credentials" with the right password, read the Cloud Logging entries for `auth-recordstafflogin` (the login calls that function after Firebase accepts the password; a crash there looks like a wrong password in the UI).

---

## 7. Cost and cleanup

The project is on the Blaze plan because Cloud Functions need it. Demo traffic stays inside the free quotas, but set a budget alert in the Google Cloud console. To stop all usage, delete the Firebase project or unlink billing.
