// UC #1-2 CreateWorkshop: workshops-updateWorkshop (owner edits own DRAFT workshop).
import { defineCallable, type CallableContext } from '../../common';
import { updateWorkshopTx } from '../repo/workshopRepo';

type Ctx = Pick<
  CallableContext<'workshops-updateWorkshop', { roles: ['SENIOR_INSTRUCTOR'] }>,
  'input' | 'caller' | 'db'
>;

export const updateWorkshop = (ctx: Ctx): Promise<{ workshopId: string }> =>
  updateWorkshopTx(ctx.db, {
    uid: ctx.caller.uid,
    workshopId: ctx.input.workshopId,
    patch: ctx.input.patch,
  });

export const updateWorkshopCallable = defineCallable(
  'workshops-updateWorkshop',
  { roles: ['SENIOR_INSTRUCTOR'] },
  (ctx) => updateWorkshop(ctx),
);
