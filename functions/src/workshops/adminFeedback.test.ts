// Unit tests for admin workshop edit / status and feedback rules (UC #5-2, #5-3, #2-4; ADR-020, ADR-022).
import type { Workshop } from '@silveracademy/shared';
import { decideAdminEdit } from './controller/decideAdminEdit';
import { decideAdminStatus } from './controller/decideAdminStatus';
import { decideFeedback } from './controller/decideFeedback';

const NOW = new Date('2026-10-19T04:00:00Z');
const ts = (iso: string) => ({ toDate: () => new Date(iso) }) as Workshop['startAt'];
const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return (e as { code?: string }).code;
  }
};
const ws = (over: Partial<Workshop> = {}): Workshop =>
  ({
    id: 'w1',
    title: 'Old',
    description: 'd',
    category: 'MUSIC',
    materials: '',
    capacity: 10,
    seatsTaken: 4,
    status: 'OPEN',
    version: 2,
    startAt: ts('2026-10-25T04:00:00Z'),
    endAt: ts('2026-10-25T06:00:00Z'),
    ...over,
  }) as Workshop;

describe('decideAdminEdit', () => {
  it('applies only real changes and bumps the version', () => {
    const d = decideAdminEdit(ws(), { title: 'New', category: 'MUSIC' }, 2, NOW);
    expect(d.changes).toEqual({ title: 'New' });
    expect(d.changedFields).toEqual(['title']);
    expect(d.version).toBe(3);
  });
  it('no-op keeps version', () => {
    expect(decideAdminEdit(ws(), { title: 'Old' }, 2, NOW)).toMatchObject({
      changedFields: [],
      version: 2,
    });
  });
  it('NOT_FOUND and STALE_VERSION', () => {
    expect(codeOf(() => decideAdminEdit(undefined, {}, 1, NOW))).toBe('NOT_FOUND');
    expect(codeOf(() => decideAdminEdit(ws(), { title: 'x' }, 1, NOW))).toBe('STALE_VERSION');
  });
  it('capacity: locked once started or finished, never below seats taken', () => {
    expect(
      codeOf(() =>
        decideAdminEdit(ws({ startAt: ts('2026-10-19T03:00:00Z') }), { capacity: 20 }, 2, NOW),
      ),
    ).toBe('WORKSHOP_LOCKED_FIELDS');
    expect(
      codeOf(() => decideAdminEdit(ws({ status: 'COMPLETED' }), { capacity: 20 }, 2, NOW)),
    ).toBe('WORKSHOP_LOCKED_FIELDS');
    expect(
      codeOf(() => decideAdminEdit(ws({ status: 'CANCELLED' }), { capacity: 20 }, 2, NOW)),
    ).toBe('WORKSHOP_LOCKED_FIELDS');
    expect(codeOf(() => decideAdminEdit(ws(), { capacity: 3 }, 2, NOW))).toBe(
      'CAPACITY_BELOW_BOOKINGS',
    );
    expect(decideAdminEdit(ws(), { capacity: 4 }, 2, NOW).changes.capacity).toBe(4);
  });
  it('text edits stay allowed after the workshop has started', () => {
    const started = ws({ startAt: ts('2026-10-19T03:00:00Z') });
    expect(decideAdminEdit(started, { title: 'T' }, 2, NOW).changedFields).toEqual(['title']);
  });
});

const set = (w: Workshop | undefined, status: string, extra: object = {}) =>
  decideAdminStatus(w, { status: status as 'ARCHIVED', expectedVersion: 2, ...extra }, NOW);

describe('decideAdminStatus', () => {
  it('OPEN -> COMPLETED', () => {
    expect(set(ws(), 'COMPLETED')).toMatchObject({
      nextStatus: 'COMPLETED',
      cancel: false,
      version: 3,
    });
    expect(codeOf(() => set(ws({ status: 'DRAFT' }), 'COMPLETED'))).toBe('INVALID_TRANSITION');
  });
  it('archive of PENDING_VENUE withdraws the request and restores DRAFT on unarchive (M4)', () => {
    const a = set(ws({ status: 'PENDING_VENUE', seatsTaken: 0 }), 'ARCHIVED');
    expect(a).toMatchObject({ withdrawRequest: true, statusBeforeArchive: 'DRAFT' });
    expect(set(ws({ status: 'DRAFT', seatsTaken: 0 }), 'ARCHIVED').withdrawRequest).toBe(false);
  });
  it('archive of an upcoming OPEN workshop with bookings notifies learners (L4)', () => {
    expect(set(ws(), 'ARCHIVED', { confirmImpact: true }).notifyLearners).toBe(true);
    expect(set(ws({ seatsTaken: 0 }), 'ARCHIVED').notifyLearners).toBe(false);
  });
  it('archive remembers the previous status; unarchive restores it', () => {
    const a = set(ws({ status: 'COMPLETED', seatsTaken: 4 }), 'ARCHIVED');
    expect(a).toMatchObject({
      nextStatus: 'ARCHIVED',
      statusBeforeArchive: 'COMPLETED',
      cancel: false,
    });
    expect(
      set(ws({ status: 'ARCHIVED', statusBeforeArchive: 'COMPLETED' }), 'UNARCHIVE'),
    ).toMatchObject({ nextStatus: 'COMPLETED', statusBeforeArchive: null });
    expect(codeOf(() => set(ws(), 'UNARCHIVE'))).toBe('INVALID_TRANSITION');
    expect(codeOf(() => set(ws({ status: 'ARCHIVED' }), 'ARCHIVED'))).toBe('INVALID_TRANSITION');
  });
  it('archiving an upcoming OPEN workshop with seats needs confirmImpact', () => {
    expect(codeOf(() => set(ws(), 'ARCHIVED'))).toBe('ACTIVE_BOOKINGS_CONFIRM_REQUIRED');
    expect(set(ws(), 'ARCHIVED', { confirmImpact: true }).nextStatus).toBe('ARCHIVED');
    expect(set(ws({ seatsTaken: 0 }), 'ARCHIVED').nextStatus).toBe('ARCHIVED');
  });
  it('cancel: reason, impact confirmation, allowed sources', () => {
    expect(codeOf(() => set(ws(), 'CANCELLED', { confirmImpact: true }))).toBe('REASON_REQUIRED');
    expect(codeOf(() => set(ws(), 'CANCELLED', { reason: 'storm' }))).toBe(
      'ACTIVE_BOOKINGS_CONFIRM_REQUIRED',
    );
    try {
      set(ws(), 'CANCELLED', { reason: 'storm' });
    } catch (e) {
      expect((e as { details?: unknown }).details).toEqual({ seatsTaken: 4 });
    }
    expect(set(ws(), 'CANCELLED', { reason: ' storm ', confirmImpact: true })).toMatchObject({
      nextStatus: 'CANCELLED',
      cancel: true,
      cancelReason: 'storm',
    });
    expect(set(ws({ status: 'DRAFT', seatsTaken: 0 }), 'CANCELLED', { reason: 'r' }).cancel).toBe(
      true,
    );
    expect(codeOf(() => set(ws({ status: 'COMPLETED' }), 'CANCELLED', { reason: 'r' }))).toBe(
      'INVALID_TRANSITION',
    );
  });
  it('NOT_FOUND and STALE_VERSION come first', () => {
    expect(codeOf(() => set(undefined, 'COMPLETED'))).toBe('NOT_FOUND');
    expect(codeOf(() => set(ws(), 'CANCELLED', { expectedVersion: 1 }))).toBe('STALE_VERSION');
  });
});

describe('decideFeedback', () => {
  const base = {
    workshop: { endAt: ts('2026-10-10T06:00:00Z') },
    attended: true,
    alreadySubmitted: false,
  };
  it('allows an attended learner inside the window', () => {
    expect(codeOf(() => decideFeedback(base, new Date('2026-10-12T00:00:00Z')))).toBeUndefined();
  });
  it('window boundary is endAt + 7 days (inclusive)', () => {
    expect(codeOf(() => decideFeedback(base, new Date('2026-10-17T06:00:00Z')))).toBeUndefined();
    expect(codeOf(() => decideFeedback(base, new Date('2026-10-17T06:00:01Z')))).toBe(
      'FEEDBACK_WINDOW_CLOSED',
    );
  });
  it('requires attendance, then window, then uniqueness', () => {
    const now = new Date('2026-10-12T00:00:00Z');
    expect(codeOf(() => decideFeedback({ ...base, workshop: undefined }, now))).toBe('NOT_FOUND');
    expect(codeOf(() => decideFeedback({ ...base, attended: false }, now))).toBe('NOT_ATTENDED');
    expect(codeOf(() => decideFeedback({ ...base, alreadySubmitted: true }, now))).toBe(
      'ALREADY_SUBMITTED',
    );
    expect(
      codeOf(() =>
        decideFeedback({ ...base, alreadySubmitted: true }, new Date('2027-01-01T00:00:00Z')),
      ),
    ).toBe('FEEDBACK_WINDOW_CLOSED');
  });
});
