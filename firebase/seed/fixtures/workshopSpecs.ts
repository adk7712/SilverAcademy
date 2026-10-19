// Seed workshop definitions (task 0.5): varied statuses, categories and instructors. Pure data, shared by venues and bookings.
// Status, slot and request links are declared in venues.ts and bookings.ts. Titles are fictional demo data.
import type { WorkshopCategory, WorkshopStatus } from '@silveracademy/shared';
import type { PersonKey } from './accounts';

export interface WorkshopSpec {
  id: string;
  instructor: PersonKey;
  title: string;
  description: string;
  category: WorkshopCategory;
  capacity: number;
  materials: string;
  status: WorkshopStatus;
  needsVolunteers: boolean;
  volunteerSlots: number;
  cancelReason?: string;
}

export const WORKSHOP_SPECS: readonly WorkshopSpec[] = [
  {
    id: 'ws-01',
    instructor: 'instructorAhmad',
    title: 'Smartphone Basics for Seniors',
    description: 'Make calls, send photos and use messaging apps safely on your own phone.',
    category: 'DIGITAL_SKILLS',
    capacity: 12,
    materials: 'Bring your charged phone.',
    status: 'OPEN',
    needsVolunteers: false,
    volunteerSlots: 0,
  },
  {
    id: 'ws-02',
    instructor: 'instructorMary',
    title: 'Healthy Steamed Dishes at Home',
    description: 'Prepare three low-oil steamed dishes with simple kitchen tools.',
    category: 'COOKING',
    capacity: 2,
    materials: 'Apron. Ingredients are provided.',
    status: 'OPEN',
    needsVolunteers: false,
    volunteerSlots: 0,
  },
  {
    id: 'ws-03',
    instructor: 'instructorMary',
    title: 'Chair Tai Chi for Mobility',
    description:
      'Gentle seated movements to improve balance and posture. Volunteers help with check-in.',
    category: 'FITNESS_WELLNESS',
    capacity: 20,
    materials: 'Comfortable clothing and a water bottle.',
    status: 'OPEN',
    needsVolunteers: true,
    volunteerSlots: 2,
  },
  {
    id: 'ws-04',
    instructor: 'instructorAhmad',
    title: 'Ukulele for Beginners',
    description: 'Learn four chords and a simple strumming pattern over three songs.',
    category: 'MUSIC',
    capacity: 8,
    materials: 'Ukulele (loan available on request).',
    status: 'COMPLETED',
    needsVolunteers: false,
    volunteerSlots: 0,
  },
  {
    id: 'ws-05',
    instructor: 'instructorAhmad',
    title: 'Conversational Mandarin Over Tea',
    description:
      'Practise everyday Mandarin phrases for ordering food and chatting with neighbours.',
    category: 'LANGUAGES',
    capacity: 15,
    materials: 'Notebook and pen.',
    status: 'OPEN',
    needsVolunteers: false,
    volunteerSlots: 0,
  },
  {
    id: 'ws-06',
    instructor: 'instructorMary',
    title: 'Watercolour Morning',
    description: 'Paint a simple landscape with basic watercolour techniques.',
    category: 'ARTS_CRAFTS',
    capacity: 10,
    materials: 'Watercolour set and paper pad.',
    status: 'CANCELLED',
    needsVolunteers: false,
    volunteerSlots: 0,
    cancelReason: 'Instructor unavailable (demo data).',
  },
  {
    id: 'ws-07',
    instructor: 'instructorAhmad',
    title: 'Balcony Herb Gardening',
    description: 'Start a small herb garden in pots and care for it through the seasons.',
    category: 'GARDENING',
    capacity: 10,
    materials: 'Gardening gloves. Pots and soil are provided.',
    status: 'PENDING_VENUE',
    needsVolunteers: false,
    volunteerSlots: 0,
  },
  {
    id: 'ws-08',
    instructor: 'instructorMary',
    title: 'Mindful Breathing Basics',
    description: 'Short breathing exercises for calm and better sleep. Draft, not yet published.',
    category: 'OTHER',
    capacity: 6,
    materials: 'Cushion or chair.',
    status: 'DRAFT',
    needsVolunteers: false,
    volunteerSlots: 0,
  },
];

export const workshopSpec = (id: string): WorkshopSpec => {
  const spec = WORKSHOP_SPECS.find((w) => w.id === id);
  if (!spec) throw new Error(`Unknown workshop spec: ${id}`);
  return spec;
};
