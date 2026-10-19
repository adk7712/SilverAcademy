// UC #1-2 pure rules: create-workshop form validation, dashboard status and next-step action.
import {
  VOLUNTEER_SLOTS_MAX,
  WORKSHOP_CAPACITY_MAX,
  WORKSHOP_CAPACITY_MIN,
  WORKSHOP_DESCRIPTION_MAX,
  WORKSHOP_MATERIALS_MAX,
  WORKSHOP_TITLE_MAX,
  workshopsSchemas,
  type WorkshopCategory,
  type WorkshopStatus,
} from '@silveracademy/shared';
import { format, strings } from '../../../i18n';

export interface WorkshopForm {
  title: string;
  description: string;
  category: WorkshopCategory | null;
  capacity: string;
  materials: string;
  needsVolunteers: boolean;
  volunteerSlots: string;
}
export type WorkshopFormErrors = Partial<Record<keyof WorkshopForm, string>>;

export const EMPTY_WORKSHOP_FORM: WorkshopForm = {
  title: '',
  description: '',
  category: null,
  capacity: '',
  materials: '',
  needsVolunteers: false,
  volunteerSlots: '',
};

const WHOLE_NUMBER = /^\d+$/;
const wholeInRange = (raw: string, min: number, max: number) => {
  const v = raw.trim();
  const n = Number(v);
  return WHOLE_NUMBER.test(v) && n >= min && n <= max;
};

export function validateWorkshopForm(form: WorkshopForm) {
  const t = strings.workshopsInstructor;
  const errors: WorkshopFormErrors = {};
  const title = form.title.trim();
  if (!title) errors.title = t.errTitleRequired;
  else if (title.length > WORKSHOP_TITLE_MAX) {
    errors.title = format(t.errTitleTooLong, { max: WORKSHOP_TITLE_MAX });
  }
  const description = form.description.trim();
  if (!description) errors.description = t.errDescriptionRequired;
  else if (description.length > WORKSHOP_DESCRIPTION_MAX) {
    errors.description = format(t.errDescriptionTooLong, { max: WORKSHOP_DESCRIPTION_MAX });
  }
  if (!form.category) errors.category = t.errCategoryRequired;
  if (!wholeInRange(form.capacity, WORKSHOP_CAPACITY_MIN, WORKSHOP_CAPACITY_MAX)) {
    errors.capacity = format(t.errCapacityInvalid, {
      min: WORKSHOP_CAPACITY_MIN,
      max: WORKSHOP_CAPACITY_MAX,
    });
  }
  if (form.materials.trim().length > WORKSHOP_MATERIALS_MAX) {
    errors.materials = format(t.errMaterialsTooLong, { max: WORKSHOP_MATERIALS_MAX });
  }
  if (form.needsVolunteers && !wholeInRange(form.volunteerSlots, 1, VOLUNTEER_SLOTS_MAX)) {
    errors.volunteerSlots = format(t.errVolunteerSlotsInvalid, { max: VOLUNTEER_SLOTS_MAX });
  }
  if (Object.keys(errors).length > 0) return { ok: false as const, errors };
  const parsed = workshopsSchemas.createWorkshopInput.safeParse({
    title,
    description,
    category: form.category,
    capacity: Number(form.capacity),
    materials: form.materials.trim(),
    needsVolunteers: form.needsVolunteers,
    volunteerSlots: form.needsVolunteers ? Number(form.volunteerSlots) : 0,
  });
  if (!parsed.success)
    return { ok: false as const, errors: { title: strings.errors.INVALID_INPUT } };
  return { ok: true as const, input: parsed.data };
}

export type NextStep =
  | { kind: 'REQUEST_VENUE'; label: string }
  | { kind: 'VIEW_REQUEST'; label: string }
  | { kind: 'ROSTER'; label: string }
  | { kind: 'NONE' };

/** Next action shown on a dashboard row (UC #1-3 starts from a DRAFT workshop). */
export function nextStepFor(status: WorkshopStatus): NextStep {
  const t = strings.workshopsInstructor;
  switch (status) {
    case 'DRAFT':
      return { kind: 'REQUEST_VENUE', label: t.actionRequestVenue };
    case 'PENDING_VENUE':
      return { kind: 'VIEW_REQUEST', label: t.actionViewRequest };
    case 'OPEN':
    case 'COMPLETED':
      return { kind: 'ROSTER', label: t.actionRoster };
    default:
      return { kind: 'NONE' };
  }
}

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export function workshopStatusInfo(status: WorkshopStatus): { label: string; tone: StatusTone } {
  const tone: Record<WorkshopStatus, StatusTone> = {
    DRAFT: 'neutral',
    PENDING_VENUE: 'warning',
    OPEN: 'success',
    COMPLETED: 'info',
    CANCELLED: 'danger',
    ARCHIVED: 'neutral',
  };
  return { label: strings.workshopsInstructor.statusLabels[status], tone: tone[status] };
}
