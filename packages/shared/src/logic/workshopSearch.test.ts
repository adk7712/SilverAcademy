// Tests for geo and workshop search helpers (UC #2-1 #3-1).
import type { SearchableWorkshop } from './workshopSearch';
import {
  filterWorkshops,
  isVolunteerOpportunity,
  recommendWorkshops,
  seatsRemaining,
  sortByDistance,
  sortByStart,
} from './workshopSearch';
import { haversineKm, isWithinSgBounds } from './geo';
const ts = (iso: string) => ({ seconds: 0, nanoseconds: 0, toDate: () => new Date(iso) });
const CENTRAL = { lat: 1.3521, lng: 103.8198 };
const mk = (o: Partial<SearchableWorkshop> & { id: string }): SearchableWorkshop => ({
  title: 'Workshop',
  description: '',
  category: 'MUSIC',
  capacity: 10,
  seatsTaken: 0,
  instructorName: 'Ann',
  needsVolunteers: false,
  volunteerSlots: 0,
  volunteersAssigned: 0,
  startAt: ts('2026-11-01T10:00:00Z'),
  venue: null,
  ...o,
});
const venueAt = (lat: number, lng: number) => ({ lat, lng, name: 'Hall', address: '1 Road' });

describe('geo', () => {
  it('haversine: zero, known distance, symmetric', () => {
    expect(haversineKm(CENTRAL, CENTRAL)).toBe(0);
    const d = haversineKm({ lat: 1.3521, lng: 103.8198 }, { lat: 1.2897, lng: 103.8501 });
    expect(d).toBeGreaterThan(7);
    expect(d).toBeLessThan(8.5);
    expect(haversineKm(CENTRAL, { lat: 1.3, lng: 103.9 })).toBeCloseTo(
      haversineKm({ lat: 1.3, lng: 103.9 }, CENTRAL),
    );
  });
  it('SG bounds', () => {
    expect(isWithinSgBounds(CENTRAL)).toBe(true);
    expect(isWithinSgBounds({ lat: 3.1, lng: 101.7 })).toBe(false);
  });
});

describe('workshop search', () => {
  const items = [
    mk({
      id: 'a',
      title: 'Watercolour painting',
      category: 'ARTS_CRAFTS',
      startAt: ts('2026-11-03T10:00:00Z'),
    }),
    mk({
      id: 'b',
      title: 'Smartphone basics',
      category: 'DIGITAL_SKILLS',
      seatsTaken: 10,
      startAt: ts('2026-11-02T10:00:00Z'),
    }),
    mk({
      id: 'c',
      title: 'Garden herbs',
      category: 'GARDENING',
      needsVolunteers: true,
      volunteerSlots: 2,
      volunteersAssigned: 2,
    }),
    mk({
      id: 'd',
      title: 'Chair yoga',
      category: 'FITNESS_WELLNESS',
      needsVolunteers: true,
      volunteerSlots: 2,
      volunteersAssigned: 1,
      instructorName: 'Bob Tan',
    }),
  ];
  it('keyword is case-insensitive, multi-term AND, searches instructor', () => {
    expect(filterWorkshops(items, { keyword: 'PAINTING' }).map((w) => w.id)).toEqual(['a']);
    expect(filterWorkshops(items, { keyword: 'chair tan' }).map((w) => w.id)).toEqual(['d']);
    expect(filterWorkshops(items, { keyword: 'zzz' })).toEqual([]);
    expect(filterWorkshops(items, {})).toHaveLength(4);
  });
  it('category, seats, volunteer and date filters', () => {
    expect(filterWorkshops(items, { categories: ['GARDENING'] }).map((w) => w.id)).toEqual(['c']);
    expect(filterWorkshops(items, { hasSeatsOnly: true }).map((w) => w.id)).not.toContain('b');
    expect(filterWorkshops(items, { volunteerOpportunitiesOnly: true }).map((w) => w.id)).toEqual([
      'd',
    ]);
    expect(
      filterWorkshops(items, {
        from: new Date('2026-11-02T00:00:00Z'),
        to: new Date('2026-11-02T23:59:59Z'),
      }).map((w) => w.id),
    ).toEqual(['b']);
  });
  it('seat helpers', () => {
    expect(seatsRemaining({ capacity: 5, seatsTaken: 7 })).toBe(0);
    expect(isVolunteerOpportunity(items[3] as SearchableWorkshop)).toBe(true);
  });
  it('sortByStart orders by start then id', () => {
    expect(sortByStart(items).map((w) => w.id)).toEqual(['c', 'd', 'b', 'a']);
  });
  it('sortByDistance: nearest first, no venue last', () => {
    const far = mk({ id: 'far', venue: venueAt(1.45, 103.8) });
    const near = mk({ id: 'near', venue: venueAt(1.353, 103.82) });
    const none = mk({ id: 'none' });
    const sorted = sortByDistance([none, far, near], CENTRAL);
    expect(sorted.map((w) => w.id)).toEqual(['near', 'far', 'none']);
    expect(sorted[2]?.distanceKm).toBeNull();
    expect(sorted[0]?.distanceKm).toBeLessThan(0.5);
  });
  it('recommend: skips full, popularity and proximity weigh in, respects limit', () => {
    const popular = mk({ id: 'pop', seatsTaken: 9, venue: venueAt(1.45, 103.8) });
    const near = mk({ id: 'near', seatsTaken: 0, venue: venueAt(1.3521, 103.8198) });
    const full = mk({ id: 'full', seatsTaken: 10, venue: venueAt(1.3521, 103.8198) });
    const recs = recommendWorkshops([popular, near, full], { origin: CENTRAL });
    expect(recs.map((w) => w.id)).toEqual(['pop', 'near']); // popularity 0.54 beats proximity 0.4
    expect(recommendWorkshops([popular, near], { origin: CENTRAL, limit: 1 })).toHaveLength(1);
    const far = mk({ id: 'far', venue: venueAt(1.45, 103.8) });
    expect(recommendWorkshops([far, near], { origin: CENTRAL }).map((w) => w.id)).toEqual([
      'near',
      'far',
    ]);
    // without location only popularity counts
    expect(recommendWorkshops([near, popular]).map((w) => w.id)).toEqual(['pop', 'near']);
  });
});
