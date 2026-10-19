// UC #5-1 #5-5 gap #17 schemas for users-* callables.
import { z } from 'zod';
import {
  ACCOUNT_ACTIONS,
  INSTRUCTOR_REVIEW_DECISIONS,
  INSTRUCTOR_REVIEW_RESULT_STATUSES,
  STAFF_ROLES,
  WORKSHOP_CATEGORIES,
} from '../enums';
import {
  EXPERIENCE_YEARS_MAX,
  INSTRUCTOR_BIO_MAX,
  ORG_NAME_MAX,
  STAFF_PASSWORD_MIN,
  STAFF_USER_ID_MAX,
} from '../constants';
import {
  accountStatusSchema,
  appModeSchema,
  expectedVersionSchema,
  fontScaleSchema,
  idSchema,
  nameSchema,
  prefsSchema,
  reasonSchema,
} from './common';

export const updatePreferencesInput = z
  .object({ fontScale: fontScaleSchema.optional(), lastMode: appModeSchema.optional() })
  .strict();
export const updatePreferencesOutput = z.object({ prefs: prefsSchema });

export const submitInstructorProfileInput = z.object({
  bio: z.string().trim().min(1).max(INSTRUCTOR_BIO_MAX),
  expertise: z.array(z.enum(WORKSHOP_CATEGORIES)).min(1),
  experienceYears: z.number().int().min(0).max(EXPERIENCE_YEARS_MAX),
});
export const submitInstructorProfileOutput = z.object({ status: z.literal('PENDING') });

/** REJECT / REQUEST_REVISION without `reason` is REASON_REQUIRED, checked by the handler. */
export const reviewInstructorProfileInput = z.object({
  uid: idSchema,
  decision: z.enum(INSTRUCTOR_REVIEW_DECISIONS),
  reason: reasonSchema.optional(),
  expectedVersion: expectedVersionSchema,
});
export const reviewInstructorProfileOutput = z.object({
  status: z.enum(INSTRUCTOR_REVIEW_RESULT_STATUSES),
  version: expectedVersionSchema,
});

/** FLAG / SUSPEND without `reason` is REASON_REQUIRED, checked by the handler. */
export const setAccountStatusInput = z.object({
  uid: idSchema,
  action: z.enum(ACCOUNT_ACTIONS),
  reason: reasonSchema.optional(),
  expectedVersion: expectedVersionSchema,
});
export const setAccountStatusOutput = z.object({
  status: accountStatusSchema,
  flagged: z.boolean(),
  version: expectedVersionSchema,
});

export const createStaffAccountInput = z
  .object({
    userId: z
      .string()
      .trim()
      .toLowerCase() // staff ids are case-insensitive (review L2)
      .min(1)
      .max(STAFF_USER_ID_MAX)
      .regex(/^[A-Za-z0-9._-]+$/),
    displayName: nameSchema,
    role: z.enum(STAFF_ROLES),
    orgName: z.string().trim().min(1).max(ORG_NAME_MAX).optional(),
    initialPassword: z.string().min(STAFF_PASSWORD_MIN),
  })
  .refine((v) => v.role !== 'COMMUNITY_PARTNER' || !!v.orgName, {
    path: ['orgName'],
    message: 'orgName required for COMMUNITY_PARTNER',
  });
export const createStaffAccountOutput = z.object({ uid: idSchema });

export const markNotificationReadInput = z.object({ notificationId: idSchema });
export const markNotificationReadOutput = z.object({}).strict();
