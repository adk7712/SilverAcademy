// Firebase client init (app, auth, firestore, functions) with emulator wiring (architecture.md 1.3). Cross-cutting.
// Only repos and services import this file; ui and controller layers never touch Firebase.
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import type { Auth, Persistence } from 'firebase/auth';
import { getFirestore, initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { FUNCTIONS_REGION } from '@silveracademy/shared';
import { EMULATOR_PORTS, env } from '../config/env';

function createApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();
  const { projectId, apiKey, authDomain, appId } = env.firebase;
  return initializeApp({ projectId, apiKey, authDomain, appId });
}

/** `getReactNativePersistence` exists only in the react-native build of firebase/auth. */
type RnPersistenceFactory = (storage: typeof AsyncStorage) => Persistence;

function createAuth(app: FirebaseApp): Auth {
  const factory = (FirebaseAuth as unknown as { getReactNativePersistence?: RnPersistenceFactory })
    .getReactNativePersistence;
  if (Platform.OS === 'web' || !factory) return FirebaseAuth.getAuth(app);
  try {
    return FirebaseAuth.initializeAuth(app, { persistence: factory(AsyncStorage) });
  } catch {
    return FirebaseAuth.getAuth(app); // already initialised (fast refresh)
  }
}

function createFirestore(app: FirebaseApp) {
  try {
    return initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    return getFirestore(app);
  }
}

const app = createApp();
export const firebaseAuth = createAuth(app);
export const firestore = createFirestore(app);
export const functionsClient = getFunctions(app, FUNCTIONS_REGION);

function connectEmulators(): void {
  const host = env.emulatorHost;
  try {
    FirebaseAuth.connectAuthEmulator(firebaseAuth, `http://${host}:${EMULATOR_PORTS.auth}`, {
      disableWarnings: true,
    });
    connectFirestoreEmulator(firestore, host, EMULATOR_PORTS.firestore);
    connectFunctionsEmulator(functionsClient, host, EMULATOR_PORTS.functions);
  } catch {
    // Already connected (fast refresh re-evaluates this module); safe to ignore.
  }
}

if (env.useEmulators) connectEmulators();
