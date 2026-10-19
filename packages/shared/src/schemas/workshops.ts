// UC #1-2 #2-4 #3-2 #5-2 FR 6.20 schemas for workshops-* callables.
import { z } from 'zod';
import { WORKSHOP_ADMIN_ACTIONS } from '../enums';
import {
  FEEDBACK_COMMENT_MAX,
  FEEDBACK_RATING_MAX,
  FEEDBACK_RATING_MIN,
  FEEDBACK_TAGS_MAX,
  FEEDBACK_TAG_MAX_LENGTH,
  VOLUNTEER_SLOTS_MAX,
  WORKSHOP_CAPACITY_MAX,
  WORKSHOP_CAPACITY_MIN,
  WORKSHOP_DESCRIPTION_MAX,
  WORKSHOP_MATERIALS_MAX,
  WORKSHOP_TITLE_MAX,
} from '../constants';
import {
  expectedVersionSchema,
  idSchema,
  reasonSchema,
  workshopCategorySchema,
  workshopStatusSchema,
} from './common';

const workshopFields = {
  title: z.string().trim().min(1).max(WORKSHOP_TITLE_MAX),
  description: z.string().trim().min(1).max(WORKSHOP_DESCRIPTION_MAX),
  category: workshopCategorySchema,
  capacity: z.number().int().min(WORKSHOP_CAPACITY_MIN).max(WORKSHOP_CAPACITY_MAX),
  materials: z.string().trim().max(WORKSHOP_MATERIALS_MAX),
  needsVolunteers: z.boolean(),
  volunteerSlots: z.number().int().min(0).max(VOLUNTEER_SLOTS_MAX),
};

export const createWorkshopInput = z
  .object(workshopFields)
  .refine((v) => (v.needsVolunteers ? v.volunteerSlots >= 1 : v.volunteerSlots === 0), {
    path: ['volunteerSlots'],
    message: 'volunteerSlots must be 0 unless needsVolunteers, else >= 1',
  });
export const createWorkshopOutput = z.object({ workshopId: idSchema, status: z.literal('DRAFT') });

export const updateWorkshopInput = z.object({
  workshopId: idSchema,
  patch: z.object(workshopFields).partial().strict(),
});
export const updateWorkshopOutput = z.object({ workshopId: idSchema });

export const adminUpdateWorkshopInput = z.object({
  workshopId: idSchema,
  patch: z
    .object(workshopFields)
    .pick({
      title: true,
      description: true,
      category: true,
      materials: true,
      capacity: true,
    })
    .partial()
    .strict(),
  expectedVersion: expectedVersionSchema,
});
export const adminUpdateWorkshopOutput = z.object({ version: expectedVersionSchema });

/** CANCELLED without `reason` is REASON_REQUIRED, checked by the handler. */
export const adminSetStatusInput = z.object({
  workshopId: idSchema,
  status: z.enum(WORKSHOP_ADMIN_ACTIONS),
  reason: reasonSchema.optional(),
  confirmImpact: z.boolean().optional(),
  incidentId: idSchema.optional(),
  expectedVersion: expectedVersionSchema,
});
export const adminSetStatusOutput = z.object({
  status: workshopStatusSchema,
  version: expectedVersionSchema,
  affectedBookings: z.number().int().nonnegative(),
});

export const optInVolunteerInput = z.object({ workshopId: idSchema });
export const optInVolunteerOutput = z.object({
  assignmentId: idSchema,
  status: z.literal('ASSIGNED'),
});
export const withdrawVolunteerInput = z.object({ workshopId: idSchema });
export const withdrawVolunteerOutput = z.object({ status: z.literal('WITHDRAWN') });

export const submitFeedbackInput = z.object({
  workshopId: idSchema,
  rating: z.number().int().min(FEEDBACK_RATING_MIN).max(FEEDBACK_RATING_MAX),
  comment: z.string().max(FEEDBACK_COMMENT_MAX).optional(),
  tags: z.array(z.string().min(1).max(FEEDBACK_TAG_MAX_LENGTH)).max(FEEDBACK_TAGS_MAX).optional(),
});
export const submitFeedbackOutput = z.object({ feedbackId: idSchema });
