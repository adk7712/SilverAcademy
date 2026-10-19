// UC #4-2 ProcessVenueRequest: venues-decideVenueRequest (approve locks the slot; reject reason optional).
import { defineCallable, type CallableContext } from '../../common';
import { AppError } from '@silveracademy/shared';
import { decideVenueRequestTx, type DecisionResult } from '../repo/decisionRepo';
type Ctx = Pick<
  CallableContext<'venues-decideVenueRequest', { roles: ['COMMUNITY_PARTNER'] }>,
  'input' | 'caller' | 'db' | 'now'
>;

export async function decideVenueRequest(ctx: Ctx): Promise<DecisionResult> {
  const { requestId, ...input } = ctx.input;
  const result = await decideVenueRequestTx(ctx.db, {
    uid: ctx.caller.uid,
    requestId,
    input,
    now: ctx.now,
  });
  // The CONFLICTED outcome is already committed; tell the partner so the UI prompts for an alternative (#4-2 Ex2).
  if (result.status === 'CONFLICTED') throw new AppError('SLOT_CONFLICT', undefined, { requestId });
  return result;
}

export const decideVenueRequestCallable = defineCallable(
  'venues-decideVenueRequest',
  { roles: ['COMMUNITY_PARTNER'] },
  (ctx) => decideVenueRequest(ctx),
);
