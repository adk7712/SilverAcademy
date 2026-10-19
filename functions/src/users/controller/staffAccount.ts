// UC #5-1 ManageAccounts (admin onboarding, requirements-map gap 17) CreateStaffAccount: pure helpers for users-createStaffAccount. No Firebase imports.
import { AppError, type StaffRole, type User } from '@silveracademy/shared';

export const STAFF_EMAIL_DOMAIN = 'staff.silveracademy.test';

/** users/{uid} id for a staff account (architecture 2.2). */
export const staffUid = (userId: string): string => `st_${userId}`;
export const staffEmail = (userId: string): string =>
  `${userId}@${STAFF_EMAIL_DOMAIN}`.toLowerCase();

/** Existing users/{uid} doc -> USER_ID_TAKEN. */
export function decideStaffAccountCreate(existing: User | undefined): void {
  if (existing) throw new AppError('USER_ID_TAKEN');
}

export const staffRolesFor = (role: StaffRole): StaffRole[] => [role];
