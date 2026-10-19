// UC #1-2 / #5-5 pure rules for the Instructor profile form and approval gate.
import {
  EXPERIENCE_YEARS_MAX,
  INSTRUCTOR_BIO_MAX,
  usersSchemas,
  type InstructorProfileStatus,
  type WorkshopCategory,
} from '@silveracademy/shared';
import { format, strings } from '../../../i18n';

export interface ProfileForm {
  bio: string;
  expertise: WorkshopCategory[];
  experienceYears: string;
}
export type ProfileFormErrors = Partial<Record<keyof ProfileForm, string>>;
/** `null` = no profile document yet. */
export type ProfileStatus = InstructorProfileStatus | null;

export const EMPTY_PROFILE_FORM: ProfileForm = { bio: '', expertise: [], experienceYears: '' };

const WHOLE_NUMBER = /^\d+$/;

export function validateProfileForm(form: ProfileForm) {
  const t = strings.usersInstructor;
  const errors: ProfileFormErrors = {};
  const bio = form.bio.trim();
  if (!bio) errors.bio = t.errBioRequired;
  else if (bio.length > INSTRUCTOR_BIO_MAX) {
    errors.bio = format(t.errBioTooLong, { max: INSTRUCTOR_BIO_MAX });
  }
  if (form.expertise.length === 0) errors.expertise = t.errExpertiseRequired;
  const years = form.experienceYears.trim();
  const yearsNumber = Number(years);
  if (!WHOLE_NUMBER.test(years) || yearsNumber > EXPERIENCE_YEARS_MAX) {
    errors.experienceYears = format(t.errExperienceInvalid, { max: EXPERIENCE_YEARS_MAX });
  }
  if (Object.keys(errors).length > 0) return { ok: false as const, errors };
  const parsed = usersSchemas.submitInstructorProfileInput.safeParse({
    bio,
    expertise: form.expertise,
    experienceYears: yearsNumber,
  });
  if (!parsed.success) return { ok: false as const, errors: { bio: strings.errors.INVALID_INPUT } };
  return { ok: true as const, input: parsed.data };
}

/** Submit is allowed when none, REJECTED or REQUIRES_REVISION (functions.md). */
export const canSubmitProfile = (status: ProfileStatus): boolean =>
  status === null || status === 'REJECTED' || status === 'REQUIRES_REVISION';

/** Workshop creation and venue requests need an APPROVED profile (functions.md). */
export const isProfileApproved = (status: ProfileStatus): boolean => status === 'APPROVED';

export function toggleExpertise(list: WorkshopCategory[], c: WorkshopCategory): WorkshopCategory[] {
  return list.includes(c) ? list.filter((x) => x !== c) : [...list, c];
}

export type ProfileBadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export function profileStatusInfo(status: ProfileStatus): {
  label: string;
  tone: ProfileBadgeTone;
} {
  const t = strings.usersInstructor;
  switch (status) {
    case 'APPROVED':
      return { label: t.statusApproved, tone: 'success' };
    case 'PENDING':
      return { label: t.statusPending, tone: 'warning' };
    case 'REJECTED':
      return { label: t.statusRejected, tone: 'danger' };
    case 'REQUIRES_REVISION':
      return { label: t.statusRevision, tone: 'warning' };
    default:
      return { label: t.statusNone, tone: 'neutral' };
  }
}
