// UC #5-1 #5-5 reason validation shown as a field error before any submit.
import { REASON_MAX } from '@silveracademy/shared';
import { userStrings } from '../strings';

export type ReasonCheck = { ok: true; reason?: string } | { ok: false; message: string };

export function checkReason(raw: string, required: boolean): ReasonCheck {
  const reason = raw.trim();
  if (!reason) return required ? { ok: false, message: userStrings.reason.required } : { ok: true };
  if (reason.length > REASON_MAX)
    return { ok: false, message: userStrings.reason.tooLong(REASON_MAX) };
  return { ok: true, reason };
}
