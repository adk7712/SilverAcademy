# users

Accounts, instructor profiles, preferences, admin account actions, staff onboarding, notifications.

Callables (`users-*`): `updatePreferences`, `submitInstructorProfile`, `reviewInstructorProfile`, `setAccountStatus`, `createStaffAccount`, `markNotificationRead`.
Pure rules in `controller/decide*.ts`; transactions in `repo/`; Firebase Auth side effects (disable, claims, revoke) in `repo/accountAuthRepo.ts`.
Admin account search is a direct Firestore read (functions.md section 2).
