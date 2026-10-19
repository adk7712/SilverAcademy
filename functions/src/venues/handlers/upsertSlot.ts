// UC #4-1 ManageAvailability: venues-upsertSlot (cannot modify a BOOKED slot; conflicts pending requests when a slot leaves AVAILABLE).
import { defineCallable, type CallableContext } from '../../common';
import { upsertSlotTx } from '../repo/slotRepo';
type Ctx = Pick<
  CallableContext<'venues-upsertSlot', { roles: ['COMMUNITY_PARTNER'] }>,
  'input' | 'caller' | 'db' | 'now'
>;

export const upsertSlot = (ctx: Ctx): Promise<{ slotId: string; conflictedRequestIds: string[] }> =>
  upsertSlotTx(ctx.db, { uid: ctx.caller.uid, input: ctx.input, now: ctx.now });

export const upsertSlotCallable = defineCallable(
  'venues-upsertSlot',
  { roles: ['COMMUNITY_PARTNER'] },
  (ctx) => upsertSlot(ctx),
);
