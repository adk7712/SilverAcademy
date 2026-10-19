// UC #5-5 InstructorReview: pure decision for users-reviewInstructorProfile. No Firebase imports.
import {
  AppError,
  type InstructorProfile,
  type InstructorProfileStatus,
  type InstructorReviewDecision,
} from '@silveracademy/shared';

export interface ReviewInput {
  decision: InstructorReviewDecision;
  reason?: string | undefined;
  expectedVersion: number;
}

export interface ReviewDecision {
  status: Exclude<InstructorProfileStatus, 'PENDING'>;
  /** null = clear any stored reviewReason (approval). */
  reviewReason: string | null;
  version: number;
  notice: { title: string; body: string };
}

const STATUS_FOR: Record<InstructorReviewDecision, ReviewDecision['status']> = {
  APPROVE: 'APPROVED',
  REJECT: 'REJECTED',
  REQUEST_REVISION: 'REQUIRES_REVISION',
};
const HEADLINE: Record<InstructorReviewDecision, string> = {
  APPROVE: 'Your instructor profile was approved.',
  REJECT: 'Your instructor profile was rejected.',
  REQUEST_REVISION: 'Your instructor profile needs changes.',
};

/** Check order: missing -> NOT_FOUND; status != PENDING -> NOT_PENDING; REJECT / REQUEST_REVISION without reason -> REASON_REQUIRED; version -> STALE_VERSION. */
export function decideInstructorReview(
  profile: InstructorProfile | undefined,
  input: ReviewInput,
): ReviewDecision {
  if (!profile) throw new AppError('NOT_FOUND');
  if (profile.status !== 'PENDING')
    throw new AppError('NOT_PENDING', undefined, { status: profile.status });
  const reason = input.reason?.trim();
  if (input.decision !== 'APPROVE' && !reason) throw new AppError('REASON_REQUIRED');
  if (profile.version !== input.expectedVersion) {
    throw new AppError('STALE_VERSION', undefined, { currentVersion: profile.version });
  }
  const approve = input.decision === 'APPROVE';
  return {
    status: STATUS_FOR[input.decision],
    reviewReason: approve ? null : (reason ?? null),
    version: profile.version + 1,
    notice: {
      title: 'Instructor profile reviewed',
      body: approve ? HEADLINE.APPROVE : `${HEADLINE[input.decision]} Reason: ${reason}`,
    },
  };
}
