// UC #5-5 ReviewInstructorAndCurriculum: pending list and decision submit.
import { useCallback, useState } from 'react';
import type { InstructorProfile, InstructorReviewDecision } from '@silveracademy/shared';
import { useSession } from '../../auth';
import { getInstructorProfile, listPendingProfiles, reviewProfile } from '../repo/usersRepo';
import type { DecisionOutcome } from '../types';
import { decisionNeedsReason } from './accountRules';
import { submitWithReason } from './decision';
import { useLoad } from '../../../services/useLoad';

export function usePendingProfiles() {
  const pending = useLoad(listPendingProfiles, []);
  const rows = [...(pending.data ?? [])].sort(
    (a, b) => a.submittedAt.seconds - b.submittedAt.seconds,
  );
  return { rows, loading: pending.loading, error: pending.error, reload: pending.reload };
}

export function useProfileDecision(profile: InstructorProfile, onDecided: () => void) {
  const { logout } = useSession();
  const [busy, setBusy] = useState(false);

  const decide = useCallback(
    async (
      decision: InstructorReviewDecision,
      reasonText: string,
    ): Promise<DecisionOutcome<void>> => {
      setBusy(true);
      const outcome = await submitWithReason({
        reasonText,
        reasonRequired: decisionNeedsReason(decision),
        call: async (reason) => {
          await reviewProfile(profile.uid, decision, profile.version, reason);
        },
      });
      setBusy(false);
      if (outcome.kind === 'done' || (outcome.kind === 'failed' && outcome.refresh)) onDecided();
      if (outcome.kind === 'failed' && outcome.endSession) void logout();
      return outcome;
    },
    [profile, onDecided, logout],
  );

  return { busy, decide };
}

export function useProfile(uid: string) {
  return useLoad(() => getInstructorProfile(uid), [uid]);
}
