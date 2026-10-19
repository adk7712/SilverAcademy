// UC #1-3 tests for venue options, pins, request status rules and slot-gone errors.
import type { Facility, TimeSlot, VenueRequest } from '@silveracademy/shared';
import {
  buildVenueOptions,
  canPickVenue,
  canRespondToInfo,
  canWithdraw,
  isSlotGoneError,
  latestRequest,
  projectPins,
  validateReply,
} from './venueRequestLogic';

const NOW = Date.UTC(2026, 9, 20, 0, 0, 0);
const HOUR = 3_600_000;
const ts = (ms: number) => ({ seconds: ms / 1000, nanoseconds: 0, toDate: () => new Date(ms) });
const fac = (id: string, name: string, capacity: number, lat = 1.3, lng = 103.8) =>
  ({ id, name, capacity, lat, lng }) as Facility;
const slot = (id: string, facilityId: string, startMs: number, status = 'AVAILABLE') =>
  ({
    id,
    facilityId,
    status,
    startAt: ts(startMs),
    endAt: ts(startMs + HOUR),
  }) as unknown as TimeSlot;
const req = (status: string, createdMs: number) =>
  ({ status, createdAt: ts(createdMs) }) as unknown as VenueRequest;

describe('buildVenueOptions', () => {
  const facilities = [fac('b', 'Beta Hall', 10), fac('a', 'Alpha Hall', 30), fac('c', 'Empty', 50)];
  const slots = [
    slot('s1', 'b', NOW + 5 * HOUR),
    slot('s2', 'a', NOW + 9 * HOUR),
    slot('s3', 'a', NOW + 3 * HOUR),
    slot('past', 'a', NOW - HOUR),
    slot('soon', 'a', NOW + 30 * 60_000),
    slot('booked', 'a', NOW + 20 * HOUR, 'BOOKED'),
  ];
  it('groups available future slots, drops empty venues and sorts', () => {
    const o = buildVenueOptions(facilities, slots, 20, NOW);
    expect(o.map((x) => x.facility.id)).toEqual(['a', 'b']);
    expect(o[0]!.slots.map((s) => s.id)).toEqual(['s3', 's2']);
    expect(o[0]!.fits).toBe(true);
    expect(o[1]!.fits).toBe(false);
  });
  it('lists venues that fit before ones that are too small', () => {
    const o = buildVenueOptions(facilities, slots, 5, NOW);
    expect(o.every((x) => x.fits)).toBe(true);
    const small = buildVenueOptions(facilities, slots, 15, NOW);
    expect(small.map((x) => x.facility.id)).toEqual(['a', 'b']);
  });
});

describe('projectPins', () => {
  it('keeps pins inside the box with north up', () => {
    const pins = projectPins([fac('a', 'A', 1, 1.2, 103.7), fac('b', 'B', 1, 1.4, 103.9)]);
    expect(pins[0]!.yPct).toBeGreaterThan(pins[1]!.yPct);
    expect(pins[0]!.xPct).toBeLessThan(pins[1]!.xPct);
    for (const p of pins) {
      expect(p.xPct).toBeGreaterThanOrEqual(0);
      expect(p.yPct).toBeLessThanOrEqual(100);
    }
  });
  it('centres a single pin', () => {
    expect(projectPins([fac('a', 'A', 1)])[0]!).toMatchObject({ xPct: 50, yPct: 50 });
  });
});

describe('request rules', () => {
  it('only AWAITING_INFO can be answered; open ones can be withdrawn', () => {
    expect(canRespondToInfo(req('AWAITING_INFO', 0))).toBe(true);
    expect(canRespondToInfo(req('PENDING', 0))).toBe(false);
    expect(canWithdraw(req('PENDING', 0))).toBe(true);
    expect(canWithdraw(req('APPROVED', 0))).toBe(false);
  });
  it('allows a new pick only for a DRAFT workshop without an open request', () => {
    expect(canPickVenue('DRAFT', null)).toBe(true);
    expect(canPickVenue('DRAFT', req('CONFLICTED', 0))).toBe(true);
    expect(canPickVenue('DRAFT', req('PENDING', 0))).toBe(false);
    expect(canPickVenue('PENDING_VENUE', null)).toBe(false);
  });
  it('picks the latest request', () => {
    expect(latestRequest([req('REJECTED', 1), req('PENDING', 5)])?.status).toBe('PENDING');
    expect(latestRequest([])).toBeNull();
  });
  it('detects slot-gone errors', () => {
    expect(isSlotGoneError('SLOT_CONFLICT')).toBe(true);
    expect(isSlotGoneError('SLOT_UNAVAILABLE')).toBe(true);
    expect(isSlotGoneError('VENUE_TOO_SMALL')).toBe(false);
  });
  it('requires a reply', () => {
    expect(validateReply('  ').ok).toBe(false);
    expect(validateReply(' hi ')).toMatchObject({ ok: true, message: 'hi' });
  });
});
