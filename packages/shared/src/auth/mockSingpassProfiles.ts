// UC #0-1 mock Singpass identities for demo/tests (architecture.md 5.1). Fixture data, not real persons.
import type { MockSingpassProfile } from '../services/AuthProvider';

/** Special profile ids that simulate IdP failures (#0-1 Ex1, Ex2). */
export const MOCK_FAIL_PROFILE_ID = 'FAIL'; // -> SINGPASS_AUTH_FAILED
export const MOCK_DOWN_PROFILE_ID = 'DOWN'; // -> SINGPASS_UNAVAILABLE
export const MOCK_ASSERTION_PREFIX = 'mock:';

export const MOCK_SINGPASS_PROFILES: readonly MockSingpassProfile[] = [
  {
    profileId: 'learner-35',
    sub: 'S-MOCK-LEARNER-35',
    name: 'Tan Wei Ming',
    dateOfBirth: '1991-03-14',
    label: 'Learner, age 35',
    suggestedRegisterAs: 'LEARNER',
  },
  {
    profileId: 'senior-49-edge',
    sub: 'S-MOCK-EDGE-49',
    name: 'Lim Hui Ling',
    dateOfBirth: '1977-06-30',
    label: 'Age 49 (just under senior threshold)',
    suggestedRegisterAs: 'LEARNER',
  },
  {
    profileId: 'senior-50',
    sub: 'S-MOCK-SENIOR-50',
    name: 'Ong Siew Hoon',
    dateOfBirth: '1976-01-05',
    label: 'Senior, age 50 (just eligible)',
    suggestedRegisterAs: 'LEARNER',
  },
  {
    profileId: 'senior-62',
    sub: 'S-MOCK-SENIOR-62',
    name: 'Ahmad bin Yusof',
    dateOfBirth: '1964-09-21',
    label: 'Senior Instructor, age 62',
    suggestedRegisterAs: 'LEARNER',
  },
  {
    profileId: 'senior-72',
    sub: 'S-MOCK-SENIOR-72',
    name: 'Mary Goh Bee Lian',
    dateOfBirth: '1954-06-02',
    label: 'Senior, age 72',
    suggestedRegisterAs: 'LEARNER',
  },
  {
    profileId: 'volunteer-28',
    sub: 'S-MOCK-VOLUNTEER-28',
    name: 'Priya Nair',
    dateOfBirth: '1998-07-18',
    label: 'Volunteer, age 28',
    suggestedRegisterAs: 'VOLUNTEER',
  },
];

export const findMockProfile = (profileId: string) =>
  MOCK_SINGPASS_PROFILES.find((p) => p.profileId === profileId);
