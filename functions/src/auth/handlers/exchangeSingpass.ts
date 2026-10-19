// UC #0-1 auth-exchangeSingpass: verify assertion -> create/refresh user -> set claims -> custom token.
import type { Auth } from 'firebase-admin/auth';
import { AppError, type SingpassVerifier } from '@silveracademy/shared';
import { defineCallable, getAdminAuth, type CallableContext } from '../../common';
import { singpassUid } from '../controller/singpassLogin';
import { issueCustomToken, syncClaimsFromUserDoc } from '../repo/claimsRepo';
import { loginTransaction } from '../repo/usersRepo';
import { createSingpassVerifier } from '../singpassVerifier';

/** Handler body, exported so tests can call it with a fake verifier/Auth. */
export async function exchangeSingpass(
  ctx: Pick<CallableContext<'auth-exchangeSingpass', 'public'>, 'input' | 'db' | 'now'>,
  verifier: SingpassVerifier,
  auth: Auth,
) {
  const { assertion, nonce, registerAs } = ctx.input;
  const identity = await verifier.verify({ assertion, ...(nonce ? { nonce } : {}) });
  const uid = singpassUid(identity.sub);
  const result = await loginTransaction(ctx.db, { uid, identity, registerAs, now: ctx.now });
  const claims = await syncClaimsFromUserDoc(ctx.db, auth, uid, result.roles, result.displayName);
  if (claims.status !== 'ACTIVE') throw new AppError('ACCOUNT_SUSPENDED'); // suspended while logging in (M2)
  const customToken = await issueCustomToken(auth, uid, claims);
  return {
    customToken,
    uid,
    roles: result.roles,
    seniorEligible: result.seniorEligible,
    isNewUser: result.isNewUser,
  };
}

export const exchangeSingpassCallable = defineCallable('auth-exchangeSingpass', 'public', (ctx) =>
  exchangeSingpass(ctx, createSingpassVerifier(), getAdminAuth()),
);
