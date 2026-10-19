import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@silveracademy/shared';
import { outcomeForSignInError, performStaffLogin } from './staffLogin';
import type { StaffLoginDeps } from './staffLogin';

const ACTIVE_ADMIN = {
  uid: 'st_admin01',
  email: 'admin01@staff.silveracademy.test',
  claims: { roles: ['ADMIN' as const], status: 'ACTIVE' as const },
};

function makeDeps(over: Partial<StaffLoginDeps> = {}) {
  const calls: string[] = [];
  const deps: StaffLoginDeps = {
    signIn: vi.fn(async () => void calls.push('signIn')),
    signOut: vi.fn(async () => void calls.push('signOut')),
    recordLogin: vi.fn(async (_u, o) => void calls.push(`record:${o}`)),
    refreshClaims: vi.fn(async () => (calls.push('refresh'), ACTIVE_ADMIN)),
    ...over,
  };
  return { deps, calls };
}

describe('outcomeForSignInError', () => {
  it('classifies firebase auth codes', () => {
    expect(outcomeForSignInError({ code: 'auth/user-disabled' })).toBe('BLOCKED');
    expect(outcomeForSignInError({ code: 'auth/invalid-credential' })).toBe('FAILURE');
    expect(outcomeForSignInError({ code: 'auth/network-request-failed' })).toBeNull();
    expect(outcomeForSignInError(new Error('x'))).toBe('FAILURE');
  });
});

describe('performStaffLogin', () => {
  it('on success records SUCCESS, then force-refreshes the token, in that order', async () => {
    const { deps, calls } = makeDeps();
    const r = await performStaffLogin(deps, ' admin01 ', 'pw');
    expect(calls).toEqual(['signIn', 'record:SUCCESS', 'refresh']);
    expect(deps.signIn).toHaveBeenCalledWith('admin01@staff.silveracademy.test', 'pw');
    expect(r).toEqual({
      kind: 'success',
      user: { uid: 'st_admin01', userId: 'admin01', roles: ['ADMIN'] },
    });
  });

  it('wrong credentials -> invalid, audits FAILURE', async () => {
    const { deps } = makeDeps({
      signIn: vi.fn(async () => Promise.reject({ code: 'auth/invalid-credential' })),
    });
    expect(await performStaffLogin(deps, 'admin01', 'bad')).toEqual({ kind: 'invalid' });
    expect(deps.recordLogin).toHaveBeenCalledWith('admin01', 'FAILURE');
    expect(deps.refreshClaims).not.toHaveBeenCalled();
  });

  it('disabled account -> suspended, audits BLOCKED', async () => {
    const { deps } = makeDeps({
      signIn: vi.fn(async () => Promise.reject({ code: 'auth/user-disabled' })),
    });
    expect(await performStaffLogin(deps, 'x', 'p')).toEqual({ kind: 'suspended' });
    expect(deps.recordLogin).toHaveBeenCalledWith('x', 'BLOCKED');
  });

  it('audit failure on a failed login does not change the result', async () => {
    const { deps } = makeDeps({
      signIn: vi.fn(async () => Promise.reject({ code: 'auth/invalid-credential' })),
      recordLogin: vi.fn(async () => Promise.reject(new Error('down'))),
    });
    expect(await performStaffLogin(deps, 'x', 'p')).toEqual({ kind: 'invalid' });
  });

  it('network failure is reported without auditing', async () => {
    const { deps } = makeDeps({
      signIn: vi.fn(async () => Promise.reject({ code: 'auth/network-request-failed' })),
    });
    expect(await performStaffLogin(deps, 'x', 'p')).toEqual({ kind: 'network' });
    expect(deps.recordLogin).not.toHaveBeenCalled();
  });

  it('non-staff account (server refuses SUCCESS) is signed out with a generic notice', async () => {
    const { deps } = makeDeps({
      recordLogin: vi.fn(async () => Promise.reject(new AppError('NOT_STAFF_ACCOUNT'))),
    });
    expect(await performStaffLogin(deps, 'x', 'p')).toEqual({ kind: 'invalid' });
    expect(deps.signOut).toHaveBeenCalled();
  });

  it('server-side suspension on SUCCESS -> suspended and signed out', async () => {
    const { deps } = makeDeps({
      recordLogin: vi.fn(async () => Promise.reject(new AppError('ACCOUNT_SUSPENDED'))),
    });
    expect(await performStaffLogin(deps, 'x', 'p')).toEqual({ kind: 'suspended' });
    expect(deps.signOut).toHaveBeenCalled();
  });

  it('refreshed claims without a staff role are rejected', async () => {
    const { deps } = makeDeps({
      refreshClaims: vi.fn(async () => ({
        ...ACTIVE_ADMIN,
        claims: { roles: [], status: 'ACTIVE' as const },
      })),
    });
    expect(await performStaffLogin(deps, 'x', 'p')).toEqual({ kind: 'invalid' });
    expect(deps.signOut).toHaveBeenCalled();
  });

  it('refreshed claims with non-active status -> suspended', async () => {
    const { deps } = makeDeps({
      refreshClaims: vi.fn(async () => ({
        ...ACTIVE_ADMIN,
        claims: { roles: ['ADMIN' as const], status: 'SUSPENDED' as const },
      })),
    });
    expect(await performStaffLogin(deps, 'x', 'p')).toEqual({ kind: 'suspended' });
  });
});
