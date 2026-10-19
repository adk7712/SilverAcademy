// UC #1-2 / #5-5 loads the signed-in instructor's profile and submits it for approval.
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { InstructorProfile } from '@silveracademy/shared';
import { errorMessage } from '../../../services/errors/errorMessage';
import { useSession } from '../../auth';
import { fetchInstructorProfile, submitInstructorProfile } from '../repo/instructorProfileRepo';
import type { ProfileStatus } from './instructorProfileLogic';

type SubmitInput = Parameters<typeof submitInstructorProfile>[0];

export function useInstructorProfile() {
  const { state } = useSession();
  const uid = state.status === 'signedIn' ? state.uid : null;
  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    try {
      setProfile(await fetchInstructorProfile(uid));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  /** Resolves true on success; failure text lands in `error`. */
  const submit = useCallback(
    async (input: SubmitInput): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        await submitInstructorProfile(input);
        await load();
        return true;
      } catch (e) {
        setError(errorMessage(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  const status: ProfileStatus = profile?.status ?? null;
  return { profile, status, loading, error, saving, reload: load, submit };
}
