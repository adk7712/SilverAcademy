import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@silveracademy/shared';
import type { Workshop } from '@silveracademy/shared';
import { checkEditForm, toEditForm } from './editForm';
import { attempt, checkStatusForm, classifyFailure } from './submit';
import {
  availableStatusActions,
  capacityLocked,
  filterWorkshops,
  impactedBookings,
} from './workshopRules';
import { EMPTY_WORKSHOP_FILTERS } from '../types';

const NOW = new Date('2026-10-19T00:00:00Z');
const at = (iso: string) => ({ seconds: 0, nanoseconds: 0, toDate: () => new Date(iso) });
const ws = (over: Partial<Workshop> = {}): Workshop =>
  ({
    id: 'w1',
    title: 'Pottery',
    instructorName: 'Mdm Tan',
    description: 'Clay basics',
    category: 'ARTS_CRAFTS',
    materials: '',
    capacity: 10,
    seatsTaken: 4,
    status: 'OPEN',
    version: 3,
    startAt: at('2026-11-01T02:00:00Z'),
    ...over,
  }) as Workshop;

describe('availableStatusActions', () => {
  it('follows the transition table', () => {
    expect(availableStatusActions({ status: 'OPEN' })).toEqual([
      'COMPLETED',
      'CANCELLED',
      'ARCHIVED',
    ]);
    expect(availableStatusActions({ status: 'DRAFT' })).toEqual(['CANCELLED', 'ARCHIVED']);
    expect(availableStatusActions({ status: 'PENDING_VENUE' })).toEqual(['CANCELLED', 'ARCHIVED']);
    expect(availableStatusActions({ status: 'COMPLETED' })).toEqual(['ARCHIVED']);
    expect(availableStatusActions({ status: 'CANCELLED' })).toEqual(['ARCHIVED']);
    expect(availableStatusActions({ status: 'ARCHIVED' })).toEqual(['UNARCHIVE']);
  });
});

describe('impactedBookings', () => {
  it('warns on cancel whenever seats are taken', () => {
    expect(impactedBookings(ws(), 'CANCELLED', NOW)).toBe(4);
    expect(impactedBookings(ws({ seatsTaken: 0 }), 'CANCELLED', NOW)).toBe(0);
  });
  it('warns on archive only for an upcoming OPEN workshop', () => {
    expect(impactedBookings(ws(), 'ARCHIVED', NOW)).toBe(4);
    expect(impactedBookings(ws({ startAt: at('2026-10-01T00:00:00Z') }), 'ARCHIVED', NOW)).toBe(0);
    expect(impactedBookings(ws({ status: 'COMPLETED' }), 'ARCHIVED', NOW)).toBe(0);
  });
  it('never warns for other actions', () =>
    expect(impactedBookings(ws(), 'COMPLETED', NOW)).toBe(0));
});

describe('capacityLocked', () => {
  it('locks after start or when finished', () => {
    expect(capacityLocked(ws(), NOW)).toBe(false);
    expect(capacityLocked(ws({ startAt: at('2026-10-18T00:00:00Z') }), NOW)).toBe(true);
    expect(capacityLocked(ws({ status: 'CANCELLED' }), NOW)).toBe(true);
    expect(capacityLocked(ws({ startAt: null }), NOW)).toBe(false);
  });
});

describe('filterWorkshops', () => {
  const rows = [
    ws(),
    ws({
      id: 'w2',
      title: 'Yoga',
      instructorName: 'Mr Lim',
      status: 'DRAFT',
      category: 'FITNESS_WELLNESS',
    }),
  ];
  it('searches title and instructor, filters status and category', () => {
    expect(
      filterWorkshops(rows, { ...EMPTY_WORKSHOP_FILTERS, query: 'lim' }).map((w) => w.id),
    ).toEqual(['w2']);
    expect(
      filterWorkshops(rows, { ...EMPTY_WORKSHOP_FILTERS, status: 'OPEN' }).map((w) => w.id),
    ).toEqual(['w1']);
    expect(
      filterWorkshops(rows, { ...EMPTY_WORKSHOP_FILTERS, category: 'FITNESS_WELLNESS' }),
    ).toHaveLength(1);
    expect(filterWorkshops(rows, EMPTY_WORKSHOP_FILTERS)).toHaveLength(2);
  });
});

describe('checkEditForm', () => {
  const w = ws();
  it('returns only changed fields', () => {
    const res = checkEditForm({ ...toEditForm(w), title: ' New title ', capacity: '12' }, w, false);
    expect(res).toEqual({ ok: true, patch: { title: 'New title', capacity: 12 } });
  });
  it('returns an empty patch when nothing changed', () =>
    expect(checkEditForm(toEditForm(w), w, false)).toEqual({ ok: true, patch: {} }));
  it('rejects blank title and capacity below bookings', () => {
    const res = checkEditForm({ ...toEditForm(w), title: ' ', capacity: '3' }, w, false);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(Object.keys(res.errors).sort()).toEqual(['capacity', 'title']);
  });
  it('ignores capacity when locked', () => {
    const res = checkEditForm({ ...toEditForm(w), capacity: 'abc' }, w, true);
    expect(res).toEqual({ ok: true, patch: {} });
  });
});

describe('checkStatusForm', () => {
  it('requires reason and impact acknowledgement', () => {
    const c = checkStatusForm({
      reasonText: ' ',
      reasonRequired: true,
      impact: 2,
      acknowledged: false,
    });
    expect(Object.keys(c.errors).sort()).toEqual(['ack', 'reason']);
  });
  it('passes when complete', () => {
    const c = checkStatusForm({
      reasonText: ' unsafe ',
      reasonRequired: true,
      impact: 2,
      acknowledged: true,
    });
    expect(c).toEqual({ reason: 'unsafe', errors: {} });
  });
  it('does not need ack without impact', () =>
    expect(
      checkStatusForm({ reasonText: '', reasonRequired: false, impact: 0, acknowledged: false })
        .errors,
    ).toEqual({}));
});

describe('attempt / classifyFailure', () => {
  it('returns done value', async () =>
    expect(await attempt(async () => 5)).toEqual({ kind: 'done', value: 5 }));
  it('classifies stale and session errors', async () => {
    expect(classifyFailure(new AppError('STALE_VERSION')).refresh).toBe(true);
    expect(classifyFailure(new AppError('ACCOUNT_SUSPENDED')).endSession).toBe(true);
    const out = await attempt(vi.fn().mockRejectedValue(new AppError('WORKSHOP_LOCKED_FIELDS')));
    expect(out).toMatchObject({ kind: 'failed', refresh: true });
  });
  it('keeps server field errors', () => {
    const e = new AppError('INVALID_INPUT', undefined, { fieldErrors: { title: ['Too long'] } });
    expect(classifyFailure(e).fieldErrors).toEqual({ title: 'Too long' });
  });
});
