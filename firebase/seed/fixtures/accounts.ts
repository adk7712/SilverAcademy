// Seed accounts and instructor profiles (task 0.5). UC #0-1, #0-2, #5-5.
// Singpass users come from MOCK_SINGPASS_PROFILES. Roles follow architecture.md 5.1: LEARNER, plus SENIOR_INSTRUCTOR when
// age >= SENIOR_MIN_AGE; volunteers are VOLUNTEER only. Staff login email is <staffUserId>@staff.silveracademy.test.
// Names and profile text are fictional demo data.
import {
  MOCK_SINGPASS_PROFILES,
  findMockProfile,
  isSeniorEligible,
  type InstructorProfile,
  type MockSingpassProfile,
  type Role,
  type User,
  type WorkshopCategory,
} from '@silveracademy/shared';
import type { SeedConfig } from '../guard';
import { COLLECTIONS, singpassUid, staffEmail, staffUid } from '../ids';
import { shiftDays, toTs } from '../time';
import { seedDoc, type AuthUserSpec, type SeedDoc } from '../types';

/** Keys name people in fixtures; each maps to a mock Singpass profile (volunteer and instructors included). */
export const PROFILE_IDS = {
  learner: 'learner-35',
  learnerEdge: 'senior-49-edge',
  instructorAhmad: 'senior-62',
  instructorMary: 'senior-72',
  instructorOng: 'senior-50',
  volunteerPriya: 'volunteer-28',
} as const;
export type PersonKey = keyof typeof PROFILE_IDS;

export const STAFF_IDS = { admin: 'admin01', partner: 'partner01' } as const;
export const PARTNER_ORG_NAME = 'Demo Community Partner Pte Ltd';
const ADMIN_DISPLAY_NAME = 'Demo Admin';
const PARTNER_DISPLAY_NAME = 'Demo Partner Coordinator';
const DEFAULT_FONT_SCALE = 1;

export function profileOf(profileId: string): MockSingpassProfile {
  const profile = findMockProfile(profileId);
  if (!profile) throw new Error(`Unknown mock Singpass profile: ${profileId}`);
  return profile;
}

const uidOfProfile = (profileId: string): string => singpassUid(profileOf(profileId).sub);

export const UID = {
  learner: uidOfProfile(PROFILE_IDS.learner),
  learnerEdge: uidOfProfile(PROFILE_IDS.learnerEdge),
  instructorAhmad: uidOfProfile(PROFILE_IDS.instructorAhmad),
  instructorMary: uidOfProfile(PROFILE_IDS.instructorMary),
  instructorOng: uidOfProfile(PROFILE_IDS.instructorOng),
  volunteerPriya: uidOfProfile(PROFILE_IDS.volunteerPriya),
  admin: staffUid(STAFF_IDS.admin),
  partner: staffUid(STAFF_IDS.partner),
} as const;

/** Uid and display name for a fixture person. */
export const person = (key: PersonKey): { uid: string; name: string } => ({
  uid: UID[key],
  name: profileOf(PROFILE_IDS[key]).name,
});

/** Roles a Singpass user gets at registration (architecture.md 5.1 `auth-exchangeSingpass`). */
export function rolesFor(profile: MockSingpassProfile, senior: boolean): Role[] {
  if (profile.suggestedRegisterAs === 'VOLUNTEER') return ['VOLUNTEER'];
  return senior ? ['LEARNER', 'SENIOR_INSTRUCTOR'] : ['LEARNER'];
}

export function buildAccounts(
  config: SeedConfig,
  now: Date,
): { authUsers: AuthUserSpec[]; docs: SeedDoc[] } {
  const authUsers: AuthUserSpec[] = [];
  const docs: SeedDoc[] = [];
  const stamp = toTs(now);

  for (const profile of MOCK_SINGPASS_PROFILES) {
    const uid = singpassUid(profile.sub);
    const senior = isSeniorEligible(profile.dateOfBirth, now);
    const roles = rolesFor(profile, senior);
    authUsers.push({ uid, displayName: profile.name, roles });
    const user: User = {
      uid,
      authType: 'SINGPASS',
      displayName: profile.name,
      displayNameLower: profile.name.toLowerCase(),
      roles,
      status: 'ACTIVE',
      flagged: false,
      seniorEligible: senior,
      ageVerifiedAt: stamp,
      prefs: { fontScale: DEFAULT_FONT_SCALE },
      version: 1,
      createdAt: stamp,
      updatedAt: stamp,
    };
    docs.push(seedDoc(`${COLLECTIONS.users}/${uid}`, user));
  }

  const staffUsers: Array<{
    uid: string;
    staffUserId: string;
    displayName: string;
    roles: Role[];
    password: string;
    orgName?: string;
  }> = [
    {
      uid: UID.admin,
      staffUserId: STAFF_IDS.admin,
      displayName: ADMIN_DISPLAY_NAME,
      roles: ['ADMIN'],
      password: config.adminPassword,
    },
    {
      uid: UID.partner,
      staffUserId: STAFF_IDS.partner,
      displayName: PARTNER_DISPLAY_NAME,
      roles: ['COMMUNITY_PARTNER'],
      password: config.partnerPassword,
      orgName: PARTNER_ORG_NAME,
    },
  ];
  for (const staff of staffUsers) {
    authUsers.push({
      uid: staff.uid,
      displayName: staff.displayName,
      roles: staff.roles,
      email: staffEmail(staff.staffUserId),
      password: staff.password,
    });
    const user: User = {
      uid: staff.uid,
      authType: 'STAFF',
      displayName: staff.displayName,
      displayNameLower: staff.displayName.toLowerCase(),
      roles: staff.roles,
      status: 'ACTIVE',
      flagged: false,
      seniorEligible: false,
      staffUserId: staff.staffUserId,
      ...(staff.orgName ? { orgName: staff.orgName } : {}),
      prefs: { fontScale: DEFAULT_FONT_SCALE },
      version: 1,
      createdAt: stamp,
      updatedAt: stamp,
    };
    docs.push(seedDoc(`${COLLECTIONS.users}/${staff.uid}`, user));
  }
  return { authUsers, docs };
}

export interface RatingTally {
  ratingSum: number;
  ratingCount: number;
}

interface ProfileSpec {
  key: PersonKey;
  bio: string;
  expertise: WorkshopCategory[];
  experienceYears: number;
  status: 'APPROVED' | 'PENDING';
}

const PROFILE_SPECS: readonly ProfileSpec[] = [
  {
    key: 'instructorAhmad',
    bio: 'Retired engineer who teaches phone, music and language basics at a relaxed pace.',
    expertise: ['DIGITAL_SKILLS', 'MUSIC', 'LANGUAGES', 'GARDENING'],
    experienceYears: 12,
    status: 'APPROVED',
  },
  {
    key: 'instructorMary',
    bio: 'Home cook and fitness volunteer who runs group sessions for seniors.',
    expertise: ['COOKING', 'FITNESS_WELLNESS', 'ARTS_CRAFTS'],
    experienceYears: 20,
    status: 'APPROVED',
  },
  {
    key: 'instructorOng',
    bio: 'New instructor who shares gardening and balcony greening tips.',
    expertise: ['GARDENING'],
    experienceYears: 3,
    status: 'PENDING',
  },
];

const PROFILE_SUBMITTED_DAYS_AGO = 30;
const PROFILE_REVIEWED_DAYS_AGO = 20;

/** instructorProfiles/{uid}: two approved instructors and one pending review. Ratings come from seeded feedback. */
export function buildInstructorProfileDocs(
  now: Date,
  ratings: Record<string, RatingTally>,
): SeedDoc[] {
  const stamp = toTs(now);
  return PROFILE_SPECS.map((spec) => {
    const uid = UID[spec.key];
    const approved = spec.status === 'APPROVED';
    const tally = ratings[uid] ?? { ratingSum: 0, ratingCount: 0 };
    const profile: InstructorProfile = {
      uid,
      displayName: person(spec.key).name,
      bio: spec.bio,
      expertise: spec.expertise,
      experienceYears: spec.experienceYears,
      status: spec.status,
      submittedAt: toTs(shiftDays(now, -PROFILE_SUBMITTED_DAYS_AGO)),
      ...(approved
        ? {
            reviewedAt: toTs(shiftDays(now, -PROFILE_REVIEWED_DAYS_AGO)),
            reviewedBy: UID.admin,
          }
        : {}),
      ratingSum: tally.ratingSum,
      ratingCount: tally.ratingCount,
      version: 1,
      createdAt: stamp,
      updatedAt: stamp,
    };
    return seedDoc(`${COLLECTIONS.instructorProfiles}/${uid}`, profile);
  });
}
