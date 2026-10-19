// UC #3-2 AssistWorkshop: workshops-withdrawVolunteer (before the workshop starts).
import { defineCallable, type CallableContext } from '../../common';
import { withdrawTx } from '../repo/volunteerRepo';

type Ctx = Pick<
  CallableContext<'workshops-withdrawVolunteer', { roles: ['VOLUNTEER'] }>,
  'input' | 'caller' | 'db' | 'now'
>;

export async function withdrawVolunteer(ctx: Ctx): Promise<{ status: 'WITHDRAWN' }> {
  await withdrawTx(ctx.db, { uid: ctx.caller.uid, workshopId: ctx.input.workshopId, now: ctx.now });
  return { status: 'WITHDRAWN' };
}

export const withdrawVolunteerCallable = defineCallable(
  'workshops-withdrawVolunteer',
  { roles: ['VOLUNTEER'] },
  (ctx) => withdrawVolunteer(ctx),
);
