import type { Role, User } from '@silveracademy/shared';
import { decideCaller, requireCallerWith } from './requireCaller';

const user = (roles: Role[], status: User['status'] = 'ACTIVE') => ({ roles, status }) as User;
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};

describe('decideCaller', () => {
  it('no uid or no user doc -> UNAUTHENTICATED', () => {
    expect(codeOf(() => decideCaller(undefined, user(['LEARNER'])))).toBe('UNAUTHENTICATED');
    expect(codeOf(() => decideCaller('u', undefined))).toBe('UNAUTHENTICATED');
  });
  it('suspended is checked before role', () => {
    expect(
      codeOf(() => decideCaller('u', user(['LEARNER'], 'SUSPENDED'), { roles: ['ADMIN'] })),
    ).toBe('ACCOUNT_SUSPENDED');
    expect(codeOf(() => decideCaller('u', user(['LEARNER'], 'INACTIVE')))).toBe(
      'ACCOUNT_SUSPENDED',
    );
  });
  it('requireActive:false lets non-active users through', () => {
    expect(decideCaller('u', user(['LEARNER'], 'SUSPENDED'), { requireActive: false }).uid).toBe(
      'u',
    );
  });
  it('role membership: any one of the roles suffices', () => {
    expect(
      decideCaller('u', user(['LEARNER', 'SENIOR_INSTRUCTOR']), { roles: ['SENIOR_INSTRUCTOR'] })
        .roles,
    ).toEqual(['LEARNER', 'SENIOR_INSTRUCTOR']);
    expect(
      codeOf(() => decideCaller('u', user(['LEARNER']), { roles: ['ADMIN', 'VOLUNTEER'] })),
    ).toBe('PERMISSION_DENIED');
  });
  it('no roles option = any signed-in role', () => {
    expect(decideCaller('u', user(['VOLUNTEER'])).roles).toEqual(['VOLUNTEER']);
  });
});

describe('requireCallerWith audit', () => {
  const deps = (u: User | undefined) => ({
    loadUser: jest.fn().mockResolvedValue(u),
    auditDenied: jest.fn().mockResolvedValue(undefined),
  });
  it('audits a denial only when auditOnDeny and the user exists', async () => {
    const d = deps(user(['LEARNER']));
    await expect(
      requireCallerWith(d, 'u', { roles: ['ADMIN'], auditOnDeny: true }),
    ).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    expect(d.auditDenied).toHaveBeenCalledWith({
      uid: 'u',
      roles: ['LEARNER'],
      code: 'PERMISSION_DENIED',
    });

    const d2 = deps(user(['LEARNER']));
    await expect(requireCallerWith(d2, 'u', { roles: ['ADMIN'] })).rejects.toBeDefined();
    expect(d2.auditDenied).not.toHaveBeenCalled();

    const d3 = deps(undefined);
    await expect(requireCallerWith(d3, 'u', { auditOnDeny: true })).rejects.toBeDefined();
    expect(d3.auditDenied).not.toHaveBeenCalled();
  });
  it('still throws the original AppError when the denial audit itself fails', async () => {
    const d = {
      loadUser: jest.fn().mockResolvedValue(user(['LEARNER'])),
      auditDenied: jest.fn().mockRejectedValue(new Error('firestore down')),
    };
    await expect(
      requireCallerWith(d, 'u', { roles: ['ADMIN'], auditOnDeny: true }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(d.auditDenied).toHaveBeenCalled();
  });
  it('does not load a user without a uid', async () => {
    const d = deps(undefined);
    await expect(requireCallerWith(d, undefined)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    expect(d.loadUser).not.toHaveBeenCalled();
  });
});
