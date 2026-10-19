// UC #1-2 CreateWorkshop: pure rules for creating and editing a DRAFT workshop. No Firebase imports.
import { AppError, type InstructorProfile, type Workshop } from '@silveracademy/shared';
import type { CallableInputOf } from '../../common';

export type WorkshopFields = Pick<
  Workshop,
  | 'title'
  | 'description'
  | 'category'
  | 'capacity'
  | 'materials'
  | 'needsVolunteers'
  | 'volunteerSlots'
>;
export type WorkshopPatch = Partial<WorkshopFields>;

/** needsVolunteers <=> volunteerSlots >= 1 (same rule as createWorkshopInput, re-checked after merging a patch). */
function assertVolunteerRule(f: Pick<WorkshopFields, 'needsVolunteers' | 'volunteerSlots'>): void {
  const ok = f.needsVolunteers ? f.volunteerSlots >= 1 : f.volunteerSlots === 0;
  if (!ok) {
    throw new AppError('INVALID_INPUT', 'Invalid input.', {
      fieldErrors: {
        volunteerSlots: ['volunteerSlots must be 0 unless needsVolunteers, else >= 1'],
      },
    });
  }
}

/** Creation needs an APPROVED instructor profile (ADR-009). Returns the fields to store. */
export function decideCreateWorkshop(
  profile: Pick<InstructorProfile, 'status'> | undefined,
  input: CallableInputOf<'workshops-createWorkshop'>,
): WorkshopFields {
  if (!profile || profile.status !== 'APPROVED') throw new AppError('PROFILE_NOT_APPROVED');
  assertVolunteerRule(input);
  return {
    title: input.title,
    description: input.description,
    category: input.category,
    capacity: input.capacity,
    materials: input.materials,
    needsVolunteers: input.needsVolunteers,
    volunteerSlots: input.needsVolunteers ? input.volunteerSlots : 0,
  };
}

/**
 * Order: workshop missing -> NOT_FOUND; not owner -> PERMISSION_DENIED; status != DRAFT -> WORKSHOP_NOT_EDITABLE;
 * merged needsVolunteers/volunteerSlots inconsistent -> INVALID_INPUT. Returns only the changed fields.
 */
export function decideUpdateWorkshop(
  workshop: Pick<Workshop, 'instructorId' | 'status' | keyof WorkshopFields> | undefined,
  patch: WorkshopPatch,
  uid: string,
): WorkshopPatch {
  if (!workshop) throw new AppError('NOT_FOUND');
  if (workshop.instructorId !== uid) throw new AppError('PERMISSION_DENIED');
  if (workshop.status !== 'DRAFT') throw new AppError('WORKSHOP_NOT_EDITABLE');
  const merged = { ...workshop, ...stripUndefined(patch) };
  assertVolunteerRule(merged);
  return stripUndefined(patch);
}

function stripUndefined(patch: WorkshopPatch): WorkshopPatch {
  return Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
}
