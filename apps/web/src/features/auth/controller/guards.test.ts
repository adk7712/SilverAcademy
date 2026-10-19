import { describe, expect, it } from 'vitest';
import {
  decideGuard,
  hasAnyRole,
  parseClaims,
  staffEmail,
  toSessionUser,
  userIdFromEmail,
} from './guards';
import type { SessionState } from '../types';

const signedIn = (roles: ('ADMIN' | 'COMMUNITY_PARTNER')[]): SessionState => ({
  status: 'signedIn',
  user: { uid: 'st_a', userId: 'a', roles },
});

describe('decideGuard', () => {
  it('waits while loading', () =>
    expect(decideGuard({ status: 'loading' }, ['ADMIN'])).toBe('loading'));
  it('sends anonymous users to login', () =>
    expect(decideGuard({ status: 'signedOut' }, ['ADMIN'])).toBe('login'));
  it('allows a matching role', () =>
    expect(decideGuard(signedIn(['ADMIN']), ['ADMIN'])).toBe('allow'));
  it('denies the other staff role', () => {
    expect(decideGuard(signedIn(['COMMUNITY_PARTNER']), ['ADMIN'])).toBe('forbidden');
    expect(decideGuard(signedIn(['ADMIN']), ['COMMUNITY_PARTNER'])).toBe('forbidden');
  });
  it('allows when any held role matches', () =>
    expect(decideGuard(signedIn(['ADMIN', 'COMMUNITY_PARTNER']), ['COMMUNITY_PARTNER'])).toBe(
      'allow',
    ));
});

describe('claims helpers', () => {
  it('parses roles and status, dropping unknown values', () => {
    expect(parseClaims({ roles: ['ADMIN', 'HACKER', 7], status: 'ACTIVE' })).toEqual({
      roles: ['ADMIN'],
      status: 'ACTIVE',
    });
    expect(parseClaims(null)).toEqual({ roles: [], status: undefined });
    expect(parseClaims({ roles: 'ADMIN', status: 'weird' })).toEqual({
      roles: [],
      status: undefined,
    });
  });

  it('builds a session only for ACTIVE staff', () => {
    const email = 'admin01@staff.silveracademy.test';
    expect(toSessionUser('u', email, { roles: ['ADMIN', 'LEARNER'], status: 'ACTIVE' })).toEqual({
      uid: 'u',
      userId: 'admin01',
      roles: ['ADMIN'],
    });
    expect(toSessionUser('u', email, { roles: ['ADMIN'], status: 'SUSPENDED' })).toBeNull();
    expect(toSessionUser('u', email, { roles: ['ADMIN'], status: undefined })).toBeNull();
    expect(toSessionUser('u', email, { roles: ['LEARNER'], status: 'ACTIVE' })).toBeNull();
  });

  it('maps login ids to emails and back', () => {
    expect(staffEmail('  Admin01 ')).toBe('admin01@staff.silveracademy.test');
    expect(userIdFromEmail('admin01@staff.silveracademy.test')).toBe('admin01');
    expect(userIdFromEmail(null)).toBe('');
  });

  it('hasAnyRole', () => {
    expect(hasAnyRole(['ADMIN'], ['COMMUNITY_PARTNER'])).toBe(false);
    expect(hasAnyRole([], ['ADMIN'])).toBe(false);
  });
});
