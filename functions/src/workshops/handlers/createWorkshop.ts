// UC #1-2 CreateWorkshop: workshops-createWorkshop (SENIOR_INSTRUCTOR, approved profile).
import { defineCallable, type CallableContext } from '../../common';
import { createWorkshopTx } from '../repo/workshopRepo';

type Ctx = Pick<
  CallableContext<'workshops-createWorkshop', { roles: ['SENIOR_INSTRUCTOR'] }>,
  'input' | 'caller' | 'db'
>;

export async function createWorkshop(ctx: Ctx): Promise<{ workshopId: string; status: 'DRAFT' }> {
  const { workshopId } = await createWorkshopTx(ctx.db, {
    uid: ctx.caller.uid,
    instructorName: ctx.caller.user.displayName,
    input: ctx.input,
  });
  return { workshopId, status: 'DRAFT' };
}

export const createWorkshopCallable = defineCallable(
  'workshops-createWorkshop',
  { roles: ['SENIOR_INSTRUCTOR'] },
  (ctx) => createWorkshop(ctx),
);
