// Firebase web client init; connects to the Local Emulator Suite when VITE_USE_EMULATORS is on.
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { FUNCTIONS_REGION } from '@silveracademy/shared';
import { EMULATOR_PORTS, env } from './env';

const app = initializeApp({ apiKey: env.apiKey, projectId: env.projectId });

export const firebaseAuth = getAuth(app);
export const firestore = getFirestore(app);
export const functions = getFunctions(app, FUNCTIONS_REGION);
export const storage = getStorage(app);

if (env.useEmulators) {
  const host = env.emulatorHost;
  connectAuthEmulator(firebaseAuth, `http://${host}:${EMULATOR_PORTS.auth}`, {
    disableWarnings: true,
  });
  connectFirestoreEmulator(firestore, host, EMULATOR_PORTS.firestore);
  connectFunctionsEmulator(functions, host, EMULATOR_PORTS.functions);
  connectStorageEmulator(storage, host, EMULATOR_PORTS.storage);
}
