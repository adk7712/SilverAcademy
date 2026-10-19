// Unit tests for the pure users rules (UC #5-1, #5-5, gap #17): no Firebase, no emulator.
import type { InstructorProfile, User } from '@silveracademy/shared';
import { decideAccountAction } from './controller/decideAccountAction';
import { decideInstructorReview } from './controller/decideInstructorReview';
import { decideInstructorSubmit } from './controller/decideInstructorSubmit';
import { decidePreferences } from './controller/decidePreferences';
import { staffEmail, staffUid } from './controller/staffAccount';

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return (e as { code?: string }).code;
  }
};
const user = (over: Partial<User> = {}): User =>
  ({
    uid: 'sp_target',
    roles: ['LEARNER'],
    status: 'ACTIVE',
    flagged: false,
    version: 3,
    seniorEligible: true,
    prefs: { fontScale: 1 },
    ...over,
  }) as User;
const act = (target: User | undefined, action: string, extra: object = {}, actor = 'st_admin') =>
  decideAccountAction(target, actor, {
    action: action as 'FLAG',
    expectedVersion: 3,
    reason: 'because',
    ...extra,
  });

describe('decideAccountAction', () => {
  it('suspend: SUSPENDED, bumps version, touches Auth, audit ACCOUNT_SUSPEND', () => {
    expect(act(user(), 'SUSPEND')).toMatchObject({
      status: 'SUSPENDED',
      version: 4,
      touchesAuth: true,
      auditAction: 'ACCOUNT_SUSPEND',
    });
  });
  it('reactivate returns to ACTIVE', () => {
    const d = act(user({ status: 'SUSPENDED' }), 'REACTIVATE', { reason: undefined });
    expect(d).toMatchObject({
      status: 'ACTIVE',
      touchesAuth: true,
      auditAction: 'ACCOUNT_REACTIVATE',
    });
  });
  it('flag stores the reason and does not touch Auth; unflag clears it', () => {
    const flagged = act(user(), 'FLAG');
    expect(flagged).toMatchObject({ flagged: true, flagReason: 'because', touchesAuth: false });
    const un = act(user({ flagged: true, flagReason: 'x' }), 'UNFLAG', { reason: undefined });
    expect(un).toMatchObject({ flagged: false, flagReason: null });
  });
  it('missing target is NOT_FOUND', () => {
    expect(codeOf(() => act(undefined, 'SUSPEND'))).toBe('NOT_FOUND');
  });
  it('admins and self cannot be targeted (even before stale version)', () => {
    expect(codeOf(() => act(user({ roles: ['ADMIN'] }), 'SUSPEND'))).toBe('CANNOT_TARGET_ADMIN');
    expect(codeOf(() => act(user({ uid: 'me' }), 'SUSPEND', { expectedVersion: 99 }, 'me'))).toBe(
      'CANNOT_TARGET_ADMIN',
    );
  });
  it('stale version', () => {
    expect(codeOf(() => act(user(), 'SUSPEND', { expectedVersion: 2 }))).toBe('STALE_VERSION');
  });
  it('FLAG and SUSPEND need a non-blank reason', () => {
    expect(codeOf(() => act(user(), 'SUSPEND', { reason: undefined }))).toBe('REASON_REQUIRED');
    expect(codeOf(() => act(user(), 'FLAG', { reason: '   ' }))).toBe('REASON_REQUIRED');
  });
  it('invalid transitions', () => {
    expect(codeOf(() => act(user({ flagged: true }), 'FLAG'))).toBe('INVALID_TRANSITION');
    expect(codeOf(() => act(user(), 'UNFLAG'))).toBe('INVALID_TRANSITION');
  });
  it('SUSPEND on SUSPENDED and REACTIVATE on ACTIVE are idempotent Auth resyncs (M1)', () => {
    const s = act(user({ status: 'SUSPENDED' }), 'SUSPEND');
    expect(s).toMatchObject({ status: 'SUSPENDED', version: 3, touchesAuth: true, resync: true });
    const r = act(user(), 'REACTIVATE', { reason: undefined });
    expect(r).toMatchObject({ status: 'ACTIVE', version: 3, touchesAuth: true, resync: true });
    expect(act(user(), 'SUSPEND').resync).toBe(false);
  });
  it('suspending a flagged account keeps the flag', () => {
    expect(act(user({ flagged: true, flagReason: 'f' }), 'SUSPEND')).toMatchObject({
      flagged: true,
      flagReason: 'f',
    });
  });
});

const profile = (over: Partial<InstructorProfile> = {}): InstructorProfile =>
  ({ uid: 'sp_si', status: 'PENDING', version: 1, ...over }) as InstructorProfile;

describe('decideInstructorReview', () => {
  const review = (p: InstructorProfile | undefined, decision: string, extra: object = {}) =>
    decideInstructorReview(p, { decision: decision as 'APPROVE', expectedVersion: 1, ...extra });
  it('approve needs no reason', () => {
    expect(review(profile(), 'APPROVE')).toMatchObject({
      status: 'APPROVED',
      reviewReason: null,
      version: 2,
    });
  });
  it('reject and revision need a reason and carry it', () => {
    expect(codeOf(() => review(profile(), 'REJECT'))).toBe('REASON_REQUIRED');
    expect(codeOf(() => review(profile(), 'REQUEST_REVISION', { reason: ' ' }))).toBe(
      'REASON_REQUIRED',
    );
    expect(review(profile(), 'REJECT', { reason: 'bio too short' })).toMatchObject({
      status: 'REJECTED',
      reviewReason: 'bio too short',
    });
    expect(review(profile(), 'REQUEST_REVISION', { reason: 'add detail' }).status).toBe(
      'REQUIRES_REVISION',
    );
  });
  it('order: NOT_FOUND, NOT_PENDING, REASON_REQUIRED, STALE_VERSION', () => {
    expect(codeOf(() => review(undefined, 'APPROVE'))).toBe('NOT_FOUND');
    expect(codeOf(() => review(profile({ status: 'APPROVED' }), 'REJECT'))).toBe('NOT_PENDING');
    expect(codeOf(() => review(profile(), 'REJECT', { expectedVersion: 9 }))).toBe(
      'REASON_REQUIRED',
    );
    expect(codeOf(() => review(profile(), 'APPROVE', { expectedVersion: 9 }))).toBe(
      'STALE_VERSION',
    );
  });
});

describe('decideInstructorSubmit', () => {
  it('allows none / REJECTED / REQUIRES_REVISION', () => {
    expect(codeOf(() => decideInstructorSubmit(user(), undefined))).toBeUndefined();
    expect(
      codeOf(() => decideInstructorSubmit(user(), profile({ status: 'REJECTED' }))),
    ).toBeUndefined();
    expect(
      codeOf(() => decideInstructorSubmit(user(), profile({ status: 'REQUIRES_REVISION' }))),
    ).toBeUndefined();
  });
  it('refuses ineligible, approved and already pending', () => {
    expect(codeOf(() => decideInstructorSubmit(user({ seniorEligible: false }), undefined))).toBe(
      'NOT_SENIOR_ELIGIBLE',
    );
    expect(codeOf(() => decideInstructorSubmit(user(), profile({ status: 'APPROVED' })))).toBe(
      'PROFILE_ALREADY_APPROVED',
    );
    expect(codeOf(() => decideInstructorSubmit(user(), profile()))).toBe('INVALID_TRANSITION');
  });
});

describe('decidePreferences', () => {
  it('merges and validates lastMode against held roles', () => {
    expect(decidePreferences({ fontScale: 1 }, ['LEARNER'], { fontScale: 1.5 })).toEqual({
      fontScale: 1.5,
    });
    expect(decidePreferences({ fontScale: 1 }, ['LEARNER'], { lastMode: 'LEARNER' })).toEqual({
      fontScale: 1,
      lastMode: 'LEARNER',
    });
    expect(
      codeOf(() => decidePreferences({ fontScale: 1 }, ['LEARNER'], { lastMode: 'ADMIN' })),
    ).toBe('INVALID_INPUT');
  });
});

describe('staff identifiers', () => {
  it('uid and email follow the seed convention', () => {
    expect(staffUid('alice')).toBe('st_alice');
    expect(staffEmail('Alice')).toBe('alice@staff.silveracademy.test');
  });
});
