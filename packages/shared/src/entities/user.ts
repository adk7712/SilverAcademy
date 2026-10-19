// UC #0-1 #0-2 #5-1 #5-5 users/ and instructorProfiles/ entities.
import type {
  AccountStatus,
  AppMode,
  AuthType,
  InstructorProfileStatus,
  Role,
  WorkshopCategory,
} from '../enums';
import type { FontScale, TimestampLike, Timestamps, Versioned } from './common';

export interface UserPrefs {
  fontScale: FontScale;
  lastMode?: AppMode;
}

export interface User extends Timestamps, Versioned {
  uid: string;
  authType: AuthType;
  displayName: string;
  displayNameLower: string;
  roles: Role[];
  status: AccountStatus;
  flagged: boolean;
  flagReason?: string;
  seniorEligible: boolean;
  ageVerifiedAt?: TimestampLike;
  staffUserId?: string;
  orgName?: string;
  prefs: UserPrefs;
}

export interface InstructorProfile extends Timestamps, Versioned {
  uid: string;
  displayName: string;
  bio: string;
  expertise: WorkshopCategory[];
  experienceYears: number;
  status: InstructorProfileStatus;
  reviewReason?: string;
  submittedAt: TimestampLike;
  reviewedAt?: TimestampLike;
  reviewedBy?: string;
  ratingSum: number;
  ratingCount: number;
}
