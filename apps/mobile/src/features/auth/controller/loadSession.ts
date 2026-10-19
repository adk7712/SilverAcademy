// UC #0-1 builds a signed-in SessionState from claims, the user doc and the stored mode.
import { loadClaims, loadUserSummary } from '../repo/authRepo';
import { loadCachedClaims, saveCachedClaims } from '../repo/claimsCacheRepo';
import { loadStoredMode } from '../repo/modeRepo';
import type { SessionState } from '../types';
import { claimsWithFallback, orFallback, parseClaims, resolveMode } from './sessionLogic';

const SUMMARY_TIMEOUT_MS = 4000;

/** Never rejects for network reasons: falls back to cached claims so the offline ticket stays reachable (H2). */
export async function loadSession(uid: string, forceRefresh: boolean): Promise<SessionState> {
  const [cached, summary, stored] = await Promise.all([
    loadCachedClaims(uid),
    orFallback(loadUserSummary(uid), SUMMARY_TIMEOUT_MS, null),
    loadStoredMode(uid),
  ]);
  const claims = await claimsWithFallback(
    () => loadClaims(forceRefresh),
    cached,
    (c) => void saveCachedClaims(uid, c),
  );
  const { roles, status } = parseClaims(claims);
  return {
    status: 'signedIn',
    uid,
    displayName: summary?.displayName ?? '',
    roles,
    accountStatus: status,
    mode: resolveMode(roles, stored ?? summary?.lastMode),
  };
}
