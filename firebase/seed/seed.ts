// Entry point for `npm run seed` (task 0.5). Populates the Auth and Firestore emulators with demo data. Emulator-only:
// see guard.ts. Demo accounts are listed in docs/dev-guide.md.
import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { applyAuthUsers, applyDocs, countByCollection } from './apply';
import { loadSeedConfig } from './guard';
import { buildSeedPlan } from './plan';

async function main(): Promise<void> {
  const config = loadSeedConfig(process.env);
  const plan = buildSeedPlan(config, new Date());

  const app = initializeApp({ projectId: config.projectId });
  try {
    await applyAuthUsers(getAuth(app), plan.authUsers);
    await applyDocs(getFirestore(app), plan.docs);
  } finally {
    await deleteApp(app);
  }

  console.log(`Seeded project ${config.projectId}: ${plan.authUsers.length} auth users.`);
  for (const [collection, count] of countByCollection(plan.docs)) {
    console.log(`  ${collection}: ${count}`);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Seed failed: ${message}`);
  process.exitCode = 1;
});
