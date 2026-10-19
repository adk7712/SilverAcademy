// UC #4-2 ProcessVenueRequest (alt): venues-respondToInfoRequest (AWAITING_INFO -> PENDING).
import { defineCallable, type CallableContext } from '../../common';
import { respondToInfoTx } from '../repo/venueRequestRepo';
type Ctx = Pick<
  CallableContext<'venues-respondToInfoRequest', { roles: ['SENIOR_INSTRUCTOR'] }>,
  'input' | 'caller' | 'db'
>;

export async function respondToInfoRequest(ctx: Ctx): Promise<{ status: 'PENDING' }> {
  await respondToInfoTx(ctx.db, { uid: ctx.caller.uid, ...ctx.input });
  return { status: 'PENDING' };
}

export const respondToInfoRequestCallable = defineCallable(
  'venues-respondToInfoRequest',
  { roles: ['SENIOR_INSTRUCTOR'] },
  (ctx) => respondToInfoRequest(ctx),
);
