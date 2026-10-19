// NFR 4.5 local copy of the last known claims so a cold start without network can still open the ticket.
import { claimsKey } from '../../../config/storageKeys';
import { readStored, writeStored } from '../../../services/storage';

type Claims = Record<string, unknown>;

export const loadCachedClaims = (uid: string) => readStored<Claims>(claimsKey(uid));
export const saveCachedClaims = (uid: string, claims: Claims) =>
  writeStored(claimsKey(uid), { roles: claims.roles, status: claims.status });
