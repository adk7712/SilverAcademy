// UC #4-1 ManageAvailability: venues-upsertFacility (COMMUNITY_PARTNER; owner for updates).
import { defineCallable, type CallableContext } from '../../common';
import { upsertFacilityTx } from '../repo/facilityRepo';
type Ctx = Pick<
  CallableContext<'venues-upsertFacility', { roles: ['COMMUNITY_PARTNER'] }>,
  'input' | 'caller' | 'db'
>;

export const upsertFacility = (ctx: Ctx): Promise<{ facilityId: string }> =>
  upsertFacilityTx(ctx.db, {
    uid: ctx.caller.uid,
    orgName: ctx.caller.user.orgName ?? ctx.caller.user.displayName,
    input: ctx.input,
  });

export const upsertFacilityCallable = defineCallable(
  'venues-upsertFacility',
  { roles: ['COMMUNITY_PARTNER'] },
  (ctx) => upsertFacility(ctx),
);
