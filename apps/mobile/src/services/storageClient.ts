// UC #2-5 Firebase Storage client (report attachments only); connects to the emulator like services/firebase.ts.
import { getApp } from 'firebase/app';
import {
  connectStorageEmulator,
  deleteObject,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { EMULATOR_PORTS, env } from '../config/env';
import './firebase'; // ensures the app is initialised

const storage = getStorage(getApp());
if (env.useEmulators) {
  try {
    connectStorageEmulator(storage, env.emulatorHost, EMULATOR_PORTS.storage);
  } catch {
    // Already connected (fast refresh).
  }
}

/** Uploads a local file (uri from the picker) to `path`; rejects on rules/size/network failure. */
export async function uploadLocalFile(uri: string, path: string, contentType: string) {
  const blob = await (await fetch(uri)).blob();
  await uploadBytes(ref(storage, path), blob, { contentType });
}

/** Deletes an uploaded object (used to clean up after a failed submit); rejects on failure. */
export async function deleteStoragePath(path: string) {
  await deleteObject(ref(storage, path));
}
