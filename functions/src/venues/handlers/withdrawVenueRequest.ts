// UC #1-3 RequestVenue: venues-withdrawVenueRequest (workshop returns to DRAFT).
import { defineCallable, type CallableContext } from '../../common';
import { withdrawRequestTx } from '../repo/venueRequestRepo';
type Ctx = Pick<
  CallableContext<'venues-withdrawVenueRequest', { roles: ['SENIOR_INSTRUCTOR'] }>,
  'input' | 'caller' | 'db'
>;

export async function withdrawVenueRequest(ctx: Ctx): Promise<{ status: 'WITHDRAWN' }> {
  await withdrawRequestTx(ctx.db, { uid: ctx.caller.uid, ...ctx.input });
  return { status: 'WITHDRAWN' };
}

export const withdrawVenueRequestCallable = defineCallable(
  'venues-withdrawVenueRequest',
  { roles: ['SENIOR_INSTRUCTOR'] },
  (ctx) => withdrawVenueRequest(ctx),
);
