// UC #2-5 #5-3 schemas for reports-* callables.
import { z } from 'zod';
import { INCIDENT_CATEGORIES, INCIDENT_STATUSES } from '../enums';
import {
  INCIDENT_DESCRIPTION_MAX,
  INCIDENT_DESCRIPTION_MIN,
  INCIDENT_REF_REGEX,
  INCIDENT_TEXT_MAX,
  MAX_ATTACHMENTS,
} from '../constants';
import { expectedVersionSchema, idSchema } from './common';

export const submitReportInput = z.object({
  category: z.enum(INCIDENT_CATEGORIES),
  description: z.string().trim().min(INCIDENT_DESCRIPTION_MIN).max(INCIDENT_DESCRIPTION_MAX),
  relatedWorkshopId: idSchema.optional(),
  relatedUserId: idSchema.optional(),
  attachmentPaths: z.array(z.string().min(1)).max(MAX_ATTACHMENTS).optional(),
});
export const submitReportOutput = z.object({ referenceNo: z.string().regex(INCIDENT_REF_REGEX) });

const incidentText = z.string().trim().min(1).max(INCIDENT_TEXT_MAX);

/** AWAITING_INFO without infoRequest / RESOLVED without resolution is REASON_REQUIRED, checked by the handler. */
export const updateIncidentInput = z.object({
  incidentId: idSchema,
  status: z.enum(INCIDENT_STATUSES).optional(),
  resolution: incidentText.optional(),
  infoRequest: incidentText.optional(),
  expectedVersion: expectedVersionSchema,
});
export const updateIncidentOutput = z.object({
  status: z.enum(INCIDENT_STATUSES),
  version: expectedVersionSchema,
});
