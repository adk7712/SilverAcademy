// Lab 4 basis path tests: per-workshop predicate in filterWorkshops, V(G) = 11 decisions + 1 = 12.
import type { SearchableWorkshop } from './workshopSearch';
import { filterWorkshops, type WorkshopFilter } from './workshopSearch';

const START = new Date('2026-11-01T10:00:00Z');
const w: SearchableWorkshop = {
  id: 'w',
  title: 'Watercolour Basics',
  description: '',
  category: 'ARTS_CRAFTS',
  capacity: 10,
  seatsTaken: 5,
  instructorName: 'Ann',
  needsVolunteers: true,
  volunteerSlots: 2,
  volunteersAssigned: 1,
  startAt: { seconds: 0, nanoseconds: 0, toDate: () => START },
  venue: { lat: 1.33, lng: 103.84, name: 'Toa Payoh CC', address: '93 Toa Payoh Central' },
};
const later = new Date(START.getTime() + 1);
const earlier = new Date(START.getTime() - 1);

// [path, filter, workshop overrides, kept?]
it.each<[string, WorkshopFilter, Partial<SearchableWorkshop>, boolean]>([
  ['P1 no filters', {}, {}, true],
  ['P2 category matches', { categories: ['ARTS_CRAFTS'] }, {}, true],
  ['P3 category differs', { categories: ['MUSIC'] }, {}, false],
  ['P4 seats left', { hasSeatsOnly: true }, { seatsTaken: 9 }, true],
  ['P5 full', { hasSeatsOnly: true }, { seatsTaken: 10 }, false],
  ['P6 needs volunteers', { volunteerOpportunitiesOnly: true }, {}, true],
  [
    'P7 volunteer slots full',
    { volunteerOpportunitiesOnly: true },
    { volunteersAssigned: 2 },
    false,
  ],
  ['P8 starts at from', { from: START }, {}, true],
  ['P9 starts before from', { from: later }, {}, false],
  ['P10 starts at to', { to: START }, {}, true],
  ['P11 starts after to', { to: earlier }, {}, false],
  ['P12 keyword in venue', { keyword: 'toa  PAYOH' }, {}, true],
])('%s', (_path, filter, overrides, kept) => {
  expect(filterWorkshops([{ ...w, ...overrides }], filter)).toHaveLength(kept ? 1 : 0);
});
