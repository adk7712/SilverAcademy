// UC #5-5 ReviewInstructorAndCurriculum (submission side, requirements-map gap 17) SubmitInstructorProfile: pure decision for users-submitInstructorProfile. No Firebase imports.
import { AppError, type InstructorProfile, type User } from '@silveracademy/shared';

/**
 * Allowed when no profile exists or it is REJECTED / REQUIRES_REVISION.
 * Check order: not senior-eligible -> NOT_SENIOR_ELIGIBLE; APPROVED -> PROFILE_ALREADY_APPROVED;
 * PENDING (already awaiting review) -> INVALID_TRANSITION.
 */
export function decideInstructorSubmit(user: User, existing: InstructorProfile | undefined): void {
  if (!user.seniorEligible) throw new AppError('NOT_SENIOR_ELIGIBLE');
  if (existing?.status === 'APPROVED') throw new AppError('PROFILE_ALREADY_APPROVED');
  if (existing?.status === 'PENDING') {
    throw new AppError('INVALID_TRANSITION', undefined, { status: existing.status });
  }
}
