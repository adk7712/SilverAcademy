// UC #1-3 RequestVenue: venues-requestVenue (own DRAFT workshop; approved profile).
import { defineCallable, type CallableContext } from '../../common';
import { requestVenueTx } from '../repo/venueRequestRepo';
type Ctx = Pick<
  CallableContext<'venues-requestVenue', { roles: ['SENIOR_INSTRUCTOR'] }>,
  'input' | 'caller' | 'db' | 'now'
>;

export async function requestVenue(ctx: Ctx): Promise<{ requestId: string; status: 'PENDING' }> {
  const { requestId } = await requestVenueTx(ctx.db, {
    uid: ctx.caller.uid,
    instructorName: ctx.caller.user.displayName,
    now: ctx.now,
    ...ctx.input,
  });
  return { requestId, status: 'PENDING' };
}

export const requestVenueCallable = defineCallable(
  'venues-requestVenue',
  { roles: ['SENIOR_INSTRUCTOR'] },
  (ctx) => requestVenue(ctx),
);
