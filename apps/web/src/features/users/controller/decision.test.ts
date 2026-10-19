import { describe, expect, it, vi } from 'vitest';
import { AppError, REASON_MAX } from '@silveracademy/shared';
import { classifyFailure, submitWithReason } from './decision';
import { checkReason } from './reason';
import {
  actionNeedsReason,
  availableActions,
  decisionNeedsReason,
  filterAccounts,
} from './accountRules';
import { formatTimestamp } from '../../../services/formatTimestamp';
import { EMPTY_FILTERS } from '../types';
import type { User } from '@silveracademy/shared';

describe('checkReason', () => {
  it('requires a non-blank reason when required', () => {
    expect(checkReason('   ', true).ok).toBe(false);
    expect(checkReason('', false)).toEqual({ ok: true });
  });
  it('trims and rejects over-long text', () => {
    expect(checkReason('  spam  ', true)).toEqual({ ok: true, reason: 'spam' });
    expect(checkReason('x'.repeat(REASON_MAX + 1), true).ok).toBe(false);
  });
});

describe('submitWithReason', () => {
  it('does not call the backend when the reason is missing', async () => {
    const call = vi.fn();
    const out = await submitWithReason({ reasonText: '', reasonRequired: true, call });
    expect(out.kind).toBe('invalid');
    expect(call).not.toHaveBeenCalled();
  });
  it('passes the trimmed reason through', async () => {
    const call = vi.fn().mockResolvedValue(undefined);
    const out = await submitWithReason({ reasonText: ' abuse ', reasonRequired: true, call });
    expect(out.kind).toBe('done');
    expect(call).toHaveBeenCalledWith('abuse');
  });
  it('maps CANNOT_TARGET_ADMIN to a message without refresh', async () => {
    const out = await submitWithReason({
      reasonText: 'x',
      reasonRequired: true,
      call: () => Promise.reject(new AppError('CANNOT_TARGET_ADMIN')),
    });
    expect(out).toMatchObject({ kind: 'failed', refresh: false, endSession: false });
  });
  it('asks for refresh on STALE_VERSION and ends the session on ACCOUNT_SUSPENDED', () => {
    expect(classifyFailure(new AppError('STALE_VERSION')).refresh).toBe(true);
    expect(classifyFailure(new AppError('ACCOUNT_SUSPENDED')).endSession).toBe(true);
    expect(classifyFailure(new AppError('UNAUTHENTICATED')).endSession).toBe(true);
  });
});

const user = (over: Partial<User>): User =>
  ({ roles: ['LEARNER'], status: 'ACTIVE', flagged: false, ...over }) as User;

describe('availableActions', () => {
  it('offers nothing for admins', () =>
    expect(availableActions(user({ roles: ['ADMIN'] }))).toEqual([]));
  it('offers flag and suspend for an active account', () =>
    expect(availableActions(user({}))).toEqual(['FLAG', 'SUSPEND']));
  it('offers unflag when flagged', () =>
    expect(availableActions(user({ flagged: true }))).toEqual(['UNFLAG', 'SUSPEND']));
  it('offers only reactivate when suspended', () =>
    expect(availableActions(user({ status: 'SUSPENDED' }))).toEqual(['REACTIVATE']));
  it('requires reasons for flag and suspend only', () => {
    expect(actionNeedsReason('FLAG') && actionNeedsReason('SUSPEND')).toBe(true);
    expect(actionNeedsReason('UNFLAG') || actionNeedsReason('REACTIVATE')).toBe(false);
  });
  it('requires a reason for reject and request revision only', () => {
    expect(decisionNeedsReason('APPROVE')).toBe(false);
    expect(decisionNeedsReason('REJECT') && decisionNeedsReason('REQUEST_REVISION')).toBe(true);
  });
});

describe('filterAccounts', () => {
  const rows = [
    user({ uid: 'a', roles: ['LEARNER'] }),
    user({ uid: 'b', roles: ['VOLUNTEER'], status: 'SUSPENDED' }),
    user({ uid: 'c', roles: ['LEARNER', 'VOLUNTEER'], flagged: true }),
  ];
  it('returns all with empty filters', () =>
    expect(filterAccounts(rows, EMPTY_FILTERS)).toHaveLength(3));
  it('filters by role, status and flag', () => {
    expect(filterAccounts(rows, { ...EMPTY_FILTERS, role: 'VOLUNTEER' }).map((u) => u.uid)).toEqual(
      ['b', 'c'],
    );
    expect(
      filterAccounts(rows, { ...EMPTY_FILTERS, status: 'SUSPENDED' }).map((u) => u.uid),
    ).toEqual(['b']);
    expect(filterAccounts(rows, { ...EMPTY_FILTERS, flagged: 'yes' }).map((u) => u.uid)).toEqual([
      'c',
    ]);
    expect(filterAccounts(rows, { ...EMPTY_FILTERS, flagged: 'no' }).map((u) => u.uid)).toEqual([
      'a',
      'b',
    ]);
  });
});

describe('formatTimestamp', () => {
  it('shows a dash when missing', () => expect(formatTimestamp(undefined)).toBe('-'));
  it('formats in Singapore time', () =>
    expect(formatTimestamp({ toDate: () => new Date('2026-10-19T04:30:00Z') })).toContain('12:30'));
});
