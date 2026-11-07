// UC #1-4 the instructor sets the session code that learners type on their ticket to check in (ADR-030).
import { useState } from 'react';
import { errorMessage } from '../../../services/errors/errorMessage';
import { setCheckInCode } from '../repo/attendanceRepo';

export function useSessionCode(workshopId: string) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const save = async (raw: string) => {
    const code = raw.trim().toUpperCase();
    setBusy(true);
    setError(null);
    try {
      await setCheckInCode(workshopId, code);
      setSaved(code);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, saved, error, save };
}
