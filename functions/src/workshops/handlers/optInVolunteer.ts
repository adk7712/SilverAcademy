// UC #3-2 AssistWorkshop: workshops-optInVolunteer (ADR-014: opt-in auto-assigns while slots remain).
import { defineCallable, type CallableContext } from '../../common';
import { optInTx } from '../repo/volunteerRepo';

type Ctx = Pick<
  CallableContext<'workshops-optInVolunteer', { roles: ['VOLUNTEER'] }>,
  'input' | 'caller' | 'db' | 'now'
>;

export async function optInVolunteer(
  ctx: Ctx,
): Promise<{ assignmentId: string; status: 'ASSIGNED' }> {
  const { assignmentId } = await optInTx(ctx.db, {
    uid: ctx.caller.uid,
    volunteerName: ctx.caller.user.displayName,
    workshopId: ctx.input.workshopId,
    now: ctx.now,
  });
  return { assignmentId, status: 'ASSIGNED' };
}

export const optInVolunteerCallable = defineCallable(
  'workshops-optInVolunteer',
  { roles: ['VOLUNTEER'] },
  (ctx) => optInVolunteer(ctx),
);
