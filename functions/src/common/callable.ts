// defineCallable: the standard handler wrapper (architecture.md 1.1, 6; functions.md conventions). Cross-cutting.
//   auth/role/status check (requireCaller) -> zod input parse (CALLABLES registry) -> handler -> output check -> AppError mapping.
import { onCall, type CallableFunction } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import type { Firestore } from 'firebase-admin/firestore';
import type { z } from 'zod';
import {
  AppError,
  CALLABLES,
  FUNCTIONS_REGION,
  toFieldErrors,
  type CallableName,
} from '@silveracademy/shared';
import { now as systemNow, type Clock } from './clock';
import { toHttpsError } from './errors';
import { getDb } from './firebase';
import {
  firestoreUserLoader,
  requireCallerWith,
  type Caller,
  type CallerOptions,
  type UserLoader,
} from './requireCaller';
import { writeAudit } from './audit';
import { takeRateToken } from './rateLimit';

const DENIED_AUDITS_PER_MINUTE = 10;

export type CallableInputOf<N extends CallableName> = z.output<(typeof CALLABLES)[N]['input']>;
export type CallableResultOf<N extends CallableName> = z.input<(typeof CALLABLES)[N]['output']>;

/** `'public'` = no auth required (ctx.caller is null; ctx.uid may still be set). Otherwise requireCaller options. */
export type CallableAccess = 'public' | CallerOptions;

export interface CallableContext<N extends CallableName, A extends CallableAccess> {
  name: N;
  /** zod-parsed input. */
  input: CallableInputOf<N>;
  /** Signed-in caller loaded from users/{uid}; null for `'public'` access. */
  caller: A extends 'public' ? null : Caller;
  /** `request.auth?.uid` (for public callables that optionally accept a signed-in caller). */
  uid: string | undefined;
  /** Current time from the injected clock. Pass this into decide* functions; never call `new Date()` in handlers. */
  now: Date;
  db: Firestore;
}

export type CallableHandler<N extends CallableName, A extends CallableAccess> = (
  ctx: CallableContext<N, A>,
) => Promise<CallableResultOf<N>>;

export interface CallableDefinition<N extends CallableName, A extends CallableAccess> {
  name: N;
  access: A;
  handler: CallableHandler<N, A>;
}

export interface RunDeps {
  db: Firestore;
  clock: Clock;
  loadUser: UserLoader;
  auditDenied?: (entry: {
    uid: string;
    roles: string[];
    code: string;
    name: string;
  }) => Promise<void>;
}

export interface RawRequest {
  auth?: { uid: string } | undefined;
  data: unknown;
}

/** Throws AppError INVALID_INPUT with `details.fieldErrors` when the data does not satisfy the schema. */
export function parseInput<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    throw new AppError('INVALID_INPUT', 'Invalid input.', {
      fieldErrors: toFieldErrors(result.error),
    });
  }
  return result.data;
}

/**
 * Pure-ish core (no Firebase Functions runtime): used by `defineCallable` and by unit tests with fake deps.
 * Throws AppError only; the wrapper converts to HttpsError.
 */
export async function runCallable<N extends CallableName, A extends CallableAccess>(
  def: CallableDefinition<N, A>,
  req: RawRequest,
  deps: RunDeps,
): Promise<CallableResultOf<N>> {
  const uid = req.auth?.uid;
  const schemas = CALLABLES[def.name];
  let caller: Caller | null = null;
  if (def.access !== 'public') {
    caller = await requireCallerWith(
      {
        loadUser: deps.loadUser,
        auditDenied: ({ uid: actor, roles, code }) =>
          deps.auditDenied?.({ uid: actor, roles, code, name: def.name }) ?? Promise.resolve(),
      },
      uid,
      def.access,
    );
  }
  const input = parseInput(schemas.input, req.data) as CallableInputOf<N>;
  const result = await def.handler({
    name: def.name,
    input,
    caller: caller as CallableContext<N, A>['caller'],
    uid,
    now: deps.clock(),
    db: deps.db,
  });
  const checked = schemas.output.safeParse(result);
  if (!checked.success) {
    logger.error(`Output of ${def.name} violates its schema`, checked.error.issues);
    throw new AppError('INTERNAL');
  }
  return checked.data as CallableResultOf<N>;
}

/**
 * Declares a deployed callable named `<feature>-<name>`. Export the returned value from the feature's `index.ts`
 * under the `<name>` part; `export * as <feature>` in src/index.ts produces the deployed name.
 */
export function defineCallable<N extends CallableName, A extends CallableAccess>(
  name: N,
  access: A,
  handler: CallableHandler<N, A>,
): CallableFunction<unknown, Promise<unknown>> {
  const def: CallableDefinition<N, A> = { name, access, handler };
  return onCall({ region: FUNCTIONS_REGION }, async (request) => {
    try {
      const db = getDb();
      return await runCallable(
        def,
        { auth: request.auth ? { uid: request.auth.uid } : undefined, data: request.data },
        {
          db,
          clock: systemNow,
          loadUser: firestoreUserLoader(db),
          auditDenied: async ({ uid, roles, code, name: callable }) => {
            // M3: at most DENIED_AUDITS_PER_MINUTE entries per uid, so a hostile client cannot flood the log.
            if (!(await takeRateToken(db, `denied:${uid}`, DENIED_AUDITS_PER_MINUTE, new Date())))
              return;
            await writeAudit(db, {
              actorId: uid,
              actorRole: (roles[0] as Caller['roles'][number] | undefined) ?? null,
              action: 'PERMISSION_DENIED',
              outcome: 'DENIED',
              details: { callable, code },
            });
          },
        },
      );
    } catch (e) {
      throw toHttpsError(e);
    }
  });
}
