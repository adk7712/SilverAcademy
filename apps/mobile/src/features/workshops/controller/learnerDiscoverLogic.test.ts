// UC #2-1 tests for the Discover pipeline and UC #2-2 booking rules (pure).
import type { Workshop } from '@silveracademy/shared';
import {
  INITIAL_DISCOVER_STATE,
  computeDiscover,
  isFiltered,
  venuePins,
} from './learnerDiscoverLogic';
import { bookBlockReason, describeBookFailure } from './learnerDetailLogic';
import { AppError } from '@silveracademy/shared';

const ts = (iso: string) => ({ seconds: 0, nanoseconds: 0, toDate: () => new Date(iso) });
const ws = (id: string, over: Partial<Workshop> = {}): Workshop =>
  ({
    id,
    title: `Workshop ${id}`,
    description: 'desc',
    category: 'MUSIC',
    capacity: 10,
    seatsTaken: 0,
    instructorName: 'Mr Tan',
    needsVolunteers: false,
    volunteerSlots: 0,
    volunteersAssigned: 0,
    status: 'OPEN',
    startAt: ts('2026-11-10T02:00:00Z'),
    venue: { lat: 1.3, lng: 103.8, name: 'CC', address: 'Road' },
    ...over,
  }) as unknown as Workshop;

const now = new Date('2026-11-01T00:00:00Z');
const S = INITIAL_DISCOVER_STATE;

describe('computeDiscover', () => {
  const items = [
    ws('far', {
      venue: { lat: 1.45, lng: 103.9, name: 'Far', address: 'x' } as never,
      startAt: ts('2026-11-12T02:00:00Z'),
    }),
    ws('near', { startAt: ts('2026-11-14T02:00:00Z') }),
    ws('past', { startAt: ts('2026-10-01T02:00:00Z') }),
    ws('cook', { category: 'COOKING', title: 'Laksa class', startAt: ts('2026-11-11T02:00:00Z') }),
  ];
  it('drops started workshops and sorts by date', () => {
    expect(computeDiscover(items, S, null, now).results.map((w) => w.id)).toEqual([
      'cook',
      'far',
      'near',
    ]);
  });
  it('sorts by distance when location is known, not otherwise', () => {
    const origin = { lat: 1.3, lng: 103.8 };
    const near = computeDiscover(items, { ...S, sort: 'NEAREST' }, origin, now).results;
    expect(near[near.length - 1]?.id).toBe('far');
    const fallback = computeDiscover(items, { ...S, sort: 'NEAREST' }, null, now).results;
    expect(fallback[0]?.id).toBe('cook');
  });
  it('filters by keyword, category and date window', () => {
    expect(
      computeDiscover(items, { ...S, keyword: 'laksa' }, null, now).results.map((w) => w.id),
    ).toEqual(['cook']);
    expect(computeDiscover(items, { ...S, category: 'COOKING' }, null, now).results).toHaveLength(
      1,
    );
    const window = computeDiscover(items, { ...S, days: 11 }, null, now);
    expect(window.results.map((w) => w.id)).toEqual(['cook']);
    expect(computeDiscover(items, { ...S, keyword: 'zzz' }, null, now).results).toEqual([]);
  });
  it('recommends only when unfiltered, skipping full workshops', () => {
    const withFull = [...items, ws('full', { seatsTaken: 10 })];
    const reco = computeDiscover(withFull, S, null, now).recommended;
    expect(reco.map((w) => w.id)).not.toContain('full');
    expect(reco.length).toBeGreaterThan(0);
    expect(computeDiscover(withFull, { ...S, keyword: 'work' }, null, now).recommended).toEqual([]);
  });
  it('isFiltered reflects reset state', () => {
    expect(isFiltered(S)).toBe(false);
    expect(isFiltered({ ...S, category: 'MUSIC' })).toBe(true);
  });
});

describe('booking rules', () => {
  it('reports why booking is blocked', () => {
    expect(bookBlockReason(ws('a'), now)).toBeNull();
    expect(bookBlockReason(ws('a', { status: 'COMPLETED' }), now)).toBe('NOT_OPEN');
    expect(bookBlockReason(ws('a', { startAt: ts('2026-10-01T00:00:00Z') }), now)).toBe('STARTED');
    expect(bookBlockReason(ws('a', { seatsTaken: 10 }), now)).toBe('FULL');
  });
  it('maps server failures', () => {
    const dup = describeBookFailure(
      new AppError('ALREADY_BOOKED', undefined, { bookingId: 'w_u' }),
    );
    expect(dup.existingBookingId).toBe('w_u');
    const full = describeBookFailure({ details: { code: 'WORKSHOP_FULL' } });
    expect(full.refresh).toBe(true);
    expect(full.message).toMatch(/full/i);
  });
});

describe('venuePins', () => {
  it('groups workshops by venue and skips those without one', () => {
    const v = (facilityId: string) => ({ facilityId, name: facilityId, lat: 1.3, lng: 103.8 });
    const pins = venuePins([
      ws('a', { venue: v('f1') as Workshop['venue'] }),
      ws('b', { venue: null }),
      ws('c', { venue: v('f1') as Workshop['venue'] }),
      ws('d', { venue: v('f2') as Workshop['venue'] }),
    ]);
    expect(pins.map((p) => [p.id, p.workshops.map((w) => w.id)])).toEqual([
      ['f1', ['a', 'c']],
      ['f2', ['d']],
    ]);
  });
});
