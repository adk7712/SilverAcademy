// UC #4-1 ManageAvailability: venues-deleteSlot (BOOKED slots are locked).
import { defineCallable, type CallableContext } from '../../common';
import { deleteSlotTx } from '../repo/slotRepo';
type Ctx = Pick<
  CallableContext<'venues-deleteSlot', { roles: ['COMMUNITY_PARTNER'] }>,
  'input' | 'caller' | 'db'
>;

export const deleteSlot = (ctx: Ctx): Promise<{ conflictedRequestIds: string[] }> =>
  deleteSlotTx(ctx.db, { uid: ctx.caller.uid, ...ctx.input });

export const deleteSlotCallable = defineCallable(
  'venues-deleteSlot',
  { roles: ['COMMUNITY_PARTNER'] },
  (ctx) => deleteSlot(ctx),
);
