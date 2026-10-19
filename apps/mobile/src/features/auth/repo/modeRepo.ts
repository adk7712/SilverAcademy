// FR 1.3 local persistence of the Learner/Instructor UI mode, per user (ADR-008). Not a security setting.
import { modeKey } from '../../../config/storageKeys';
import { readStored, writeStored } from '../../../services/storage';
import type { ShellMode } from '../types';

export const loadStoredMode = (uid: string) => readStored<ShellMode>(modeKey(uid));
export const saveStoredMode = (uid: string, mode: ShellMode) => writeStored(modeKey(uid), mode);
