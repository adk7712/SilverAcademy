// Reusable zod building blocks for callable schemas (architecture.md 6, input validation). Cross-cutting.
import { z } from 'zod';
import {
  ACCOUNT_STATUSES,
  APP_MODES,
  ROLES,
  WORKSHOP_CATEGORIES,
  WORKSHOP_STATUSES,
} from '../enums';
import {
  DISPLAY_NAME_MAX,
  FONT_SCALES,
  ID_MAX_LENGTH,
  POSTAL_CODE_LENGTH,
  REASON_MAX,
} from '../constants';

export const idSchema = z.string().min(1).max(ID_MAX_LENGTH);
/** ISO-8601 string with optional offset (callable I/O time format). */
export const isoDateTimeSchema = z.iso.datetime({ offset: true });
export const reasonSchema = z.string().trim().min(1).max(REASON_MAX);
export const expectedVersionSchema = z.number().int().nonnegative();
export const nameSchema = z.string().trim().min(1).max(DISPLAY_NAME_MAX);
export const postalCodeSchema = z.string().regex(new RegExp(`^\\d{${POSTAL_CODE_LENGTH}}$`));
export const emptyObjectSchema = z.object({}).strict();

export const roleSchema = z.enum(ROLES);
export const appModeSchema = z.enum(APP_MODES);
export const accountStatusSchema = z.enum(ACCOUNT_STATUSES);
export const workshopCategorySchema = z.enum(WORKSHOP_CATEGORIES);
export const workshopStatusSchema = z.enum(WORKSHOP_STATUSES);
export const fontScaleSchema = z.literal([...FONT_SCALES]);

export const prefsSchema = z.object({
  fontScale: fontScaleSchema,
  lastMode: appModeSchema.optional(),
});

/** Flattens a ZodError into `{ field: messages[] }` for `INVALID_INPUT.details.fieldErrors`. */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
