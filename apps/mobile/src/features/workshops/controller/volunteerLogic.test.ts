// UC #3-1 #3-2 #3-3 tests for the pure Volunteer rules.
import {
  assignedPhase,
  buildOpportunityList,
  detailAction,
  isOpenOpportunity,
  sortAssigned,
} from './volunteerLogic';
import type { OpportunityWorkshop } from '../volunteerTypes';

const NOW = new Date('2026-10-19T00:00:00Z');
const hours = (h: number) => new Date(NOW.getTime() + h * 3_600_000);

function ws(id: string, over: Partial<OpportunityWorkshop> = {}): OpportunityWorkshop {
  return {
    id,
    title: id,
    description: '',
    instructorName: 'I',
    materials: '',
    status: 'OPEN',
    startAt: hours(24),
    endAt: hours(26),
    venue: { name: 'V', address: 'A', lat: 1.3, lng: 103.8 },
    needsVolunteers: true,
    volunteerSlots: 2,
    volunteersAssigned: 0,
    seatsTaken: 0,
    attendedCount: 0,
    ...over,
  };
}

const HERE = { lat: 1.3, lng: 103.8 };
const FAR = { name: 'F', address: 'A', lat: 1.45, lng: 103.8 }; // ~16 km north
const CLOSE = { name: 'C', address: 'A', lat: 1.31, lng: 103.8 }; // ~1 km

describe('isOpenOpportunity', () => {
  it('excludes full, non-volunteer, started and non-open workshops', () => {
    expect(isOpenOpportunity(ws('a'), NOW)).toBe(true);
    expect(isOpenOpportunity(ws('a', { volunteersAssigned: 2 }), NOW)).toBe(false);
    expect(isOpenOpportunity(ws('a', { needsVolunteers: false }), NOW)).toBe(false);
    expect(isOpenOpportunity(ws('a', { startAt: hours(-1) }), NOW)).toBe(false);
    expect(isOpenOpportunity(ws('a', { status: 'CANCELLED' }), NOW)).toBe(false);
  });
});

describe('buildOpportunityList', () => {
  const list = [
    ws('far', { venue: FAR }),
    ws('close', { venue: CLOSE, startAt: hours(48) }),
    ws('novenue', { venue: null }),
  ];
  it('orders by proximity and keeps only nearby by default', () => {
    const r = buildOpportunityList(list, { origin: HERE, viewAll: false, now: NOW });
    expect(r.mode).toBe('NEARBY');
    expect(r.items.map((i) => i.workshop.id)).toEqual(['close']);
    expect(r.noNearby).toBe(false);
  });
  it('view all keeps every opportunity, nearest first, no-venue last', () => {
    const r = buildOpportunityList(list, { origin: HERE, viewAll: true, now: NOW });
    expect(r.items.map((i) => i.workshop.id)).toEqual(['close', 'far', 'novenue']);
  });
  it('flags noNearby when only far workshops exist', () => {
    const r = buildOpportunityList([ws('far', { venue: FAR })], {
      origin: HERE,
      viewAll: false,
      now: NOW,
    });
    expect(r.items).toEqual([]);
    expect(r.noNearby).toBe(true);
  });
  it('without location returns everything soonest first (unordered by distance)', () => {
    const r = buildOpportunityList(list, { origin: null, viewAll: false, now: NOW });
    expect(r.mode).toBe('UNORDERED');
    expect(r.items.map((i) => i.workshop.id)).toEqual(['far', 'novenue', 'close']);
    expect(r.items.every((i) => i.distanceKm === null)).toBe(true);
  });
});

describe('detailAction', () => {
  it('offers assist, withdraw, or the blocking reason', () => {
    expect(detailAction(ws('a'), null, NOW)).toBe('ASSIST');
    expect(detailAction(ws('a'), { workshopId: 'a', status: 'ASSIGNED' }, NOW)).toBe('WITHDRAW');
    expect(detailAction(ws('a'), { workshopId: 'a', status: 'WITHDRAWN' }, NOW)).toBe('ASSIST');
    expect(detailAction(ws('a', { volunteersAssigned: 2 }), null, NOW)).toBe('FULL');
    expect(detailAction(ws('a', { needsVolunteers: false }), null, NOW)).toBe('NOT_ACCEPTING');
    expect(detailAction(ws('a', { startAt: hours(-2) }), null, NOW)).toBe('STARTED');
    expect(
      detailAction(ws('a', { startAt: hours(-2) }), { workshopId: 'a', status: 'ASSIGNED' }, NOW),
    ).toBe('STARTED');
  });
});

describe('assigned ordering', () => {
  it('classifies phases and sorts upcoming first', () => {
    const up = ws('up');
    const done = ws('done', { status: 'COMPLETED', startAt: hours(-30), endAt: hours(-28) });
    const gone = ws('gone', { status: 'CANCELLED' });
    expect(assignedPhase(up, NOW)).toBe('UPCOMING');
    expect(assignedPhase(done, NOW)).toBe('COMPLETED');
    expect(assignedPhase(gone, NOW)).toBe('CANCELLED');
    expect(sortAssigned([done, gone, up], NOW)[0]?.id).toBe('up');
  });
});
