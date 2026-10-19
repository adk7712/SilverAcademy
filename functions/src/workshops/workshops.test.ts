// Unit tests for the pure workshop and volunteer rules (UC #1-2, #3-2): no Firebase, no emulator.
import type { Workshop } from '@silveracademy/shared';
import { decideCreateWorkshop, decideUpdateWorkshop } from './controller/decideWorkshop';
import { decideOptIn, decideWithdraw } from './controller/decideVolunteer';

const NOW = new Date('2026-10-19T04:00:00Z');
const ts = (iso: string) => ({ seconds: 0, nanoseconds: 0, toDate: () => new Date(iso) });
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as { code?: string; details?: unknown }).code;
  }
};
const detailsOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as { details?: unknown }).details;
  }
};

const input = {
  title: 'Phone basics',
  description: 'd',
  category: 'DIGITAL_SKILLS' as const,
  capacity: 10,
  materials: '',
  needsVolunteers: false,
  volunteerSlots: 0,
};

describe('decideCreateWorkshop', () => {
  it('requires an APPROVED profile', () => {
    expect(codeOf(() => decideCreateWorkshop(undefined, input))).toBe('PROFILE_NOT_APPROVED');
    expect(codeOf(() => decideCreateWorkshop({ status: 'PENDING' }, input))).toBe(
      'PROFILE_NOT_APPROVED',
    );
  });
  it('returns the stored fields for an approved profile', () => {
    expect(decideCreateWorkshop({ status: 'APPROVED' }, input)).toEqual(input);
  });
  it('rejects inconsistent volunteer settings', () => {
    const bad = { ...input, needsVolunteers: true, volunteerSlots: 0 };
    expect(codeOf(() => decideCreateWorkshop({ status: 'APPROVED' }, bad))).toBe('INVALID_INPUT');
  });
});

describe('decideUpdateWorkshop', () => {
  const ws = { ...input, instructorId: 'u1', status: 'DRAFT' as const };
  it('order: NOT_FOUND, PERMISSION_DENIED, WORKSHOP_NOT_EDITABLE', () => {
    expect(codeOf(() => decideUpdateWorkshop(undefined, {}, 'u1'))).toBe('NOT_FOUND');
    expect(codeOf(() => decideUpdateWorkshop(ws, {}, 'u2'))).toBe('PERMISSION_DENIED');
    expect(codeOf(() => decideUpdateWorkshop({ ...ws, status: 'PENDING_VENUE' }, {}, 'u2'))).toBe(
      'PERMISSION_DENIED',
    );
    expect(codeOf(() => decideUpdateWorkshop({ ...ws, status: 'OPEN' }, {}, 'u1'))).toBe(
      'WORKSHOP_NOT_EDITABLE',
    );
  });
  it('returns only provided fields and ignores undefined', () => {
    expect(decideUpdateWorkshop(ws, { title: 'New', capacity: undefined }, 'u1')).toEqual({
      title: 'New',
    });
  });
  it('validates the merged volunteer rule', () => {
    expect(codeOf(() => decideUpdateWorkshop(ws, { needsVolunteers: true }, 'u1'))).toBe(
      'INVALID_INPUT',
    );
    expect(
      decideUpdateWorkshop(ws, { needsVolunteers: true, volunteerSlots: 2 }, 'u1'),
    ).toMatchObject({ volunteerSlots: 2 });
  });
});

describe('decideOptIn', () => {
  const open = {
    status: 'OPEN' as Workshop['status'],
    needsVolunteers: true,
    volunteerSlots: 2,
    volunteersAssigned: 1,
    startAt: ts('2026-10-25T04:00:00Z'),
  };
  it('accepts when open with a free slot', () => {
    expect(() => decideOptIn(open, undefined, NOW)).not.toThrow();
    expect(() => decideOptIn(open, { status: 'WITHDRAWN' }, NOW)).not.toThrow();
  });
  it('NOT_FOUND', () =>
    expect(codeOf(() => decideOptIn(undefined, undefined, NOW))).toBe('NOT_FOUND'));
  it('ALREADY_OPTED_IN carries status and wins over NOT_ACCEPTING/FULL', () => {
    const full = { ...open, volunteersAssigned: 2, status: 'COMPLETED' as const };
    expect(codeOf(() => decideOptIn(full, { status: 'ASSIGNED' }, NOW))).toBe('ALREADY_OPTED_IN');
    expect(detailsOf(() => decideOptIn(full, { status: 'ASSIGNED' }, NOW))).toEqual({
      status: 'ASSIGNED',
    });
  });
  it('NOT_ACCEPTING_VOLUNTEERS: not open, no need, started, or no start time', () => {
    for (const w of [
      { ...open, status: 'DRAFT' as const },
      { ...open, needsVolunteers: false },
      { ...open, startAt: ts('2026-10-19T04:00:00Z') },
      { ...open, startAt: null },
    ]) {
      expect(codeOf(() => decideOptIn(w, undefined, NOW))).toBe('NOT_ACCEPTING_VOLUNTEERS');
    }
  });
  it('VOLUNTEERS_FULL', () => {
    expect(codeOf(() => decideOptIn({ ...open, volunteersAssigned: 2 }, undefined, NOW))).toBe(
      'VOLUNTEERS_FULL',
    );
  });
});

describe('decideWithdraw', () => {
  const w = { startAt: ts('2026-10-25T04:00:00Z'), volunteersAssigned: 1 };
  it('NOT_ASSIGNED when missing or already withdrawn', () => {
    expect(codeOf(() => decideWithdraw(undefined, w, NOW))).toBe('NOT_ASSIGNED');
    expect(codeOf(() => decideWithdraw({ status: 'WITHDRAWN' }, w, NOW))).toBe('NOT_ASSIGNED');
  });
  it('WORKSHOP_STARTED once startAt has passed', () => {
    const started = { ...w, startAt: ts('2026-10-19T03:00:00Z') };
    expect(codeOf(() => decideWithdraw({ status: 'ASSIGNED' }, started, NOW))).toBe(
      'WORKSHOP_STARTED',
    );
  });
  it('decrements the counter, never below zero', () => {
    expect(decideWithdraw({ status: 'ASSIGNED' }, w, NOW)).toEqual({ volunteersAssigned: 0 });
    expect(decideWithdraw({ status: 'ASSIGNED' }, { ...w, volunteersAssigned: 0 }, NOW)).toEqual({
      volunteersAssigned: 0,
    });
  });
});
