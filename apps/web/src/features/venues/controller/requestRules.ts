// UC #4-2 request queue rules: which actions apply, queue split, conflict prompt (pure).
import type { VenueRequestStatus } from '@silveracademy/shared';
import type { RequestView } from '../types';
import { venueStrings } from '../strings';
import type { Tone } from '../../../design';

export type RequestAction = 'APPROVE' | 'REJECT' | 'REQUEST_INFO';

/** Only PENDING requests can be decided (server: REQUEST_NOT_PENDING otherwise). */
export function availableActions(status: VenueRequestStatus): readonly RequestAction[] {
  return status === 'PENDING' ? ['APPROVE', 'REJECT', 'REQUEST_INFO'] : [];
}

/** CONFLICTED requests prompt the partner to offer another slot. */
export const needsAlternativeSlot = (status: VenueRequestStatus): boolean =>
  status === 'CONFLICTED';

const OPEN: readonly VenueRequestStatus[] = ['PENDING', 'AWAITING_INFO'];

export interface RequestQueues {
  open: RequestView[];
  history: RequestView[];
}

/** Open = PENDING and AWAITING_INFO, oldest first. History = rest, newest slot first. Conflicted stays visible at the top of history. */
export function splitQueues(requests: readonly RequestView[]): RequestQueues {
  const open = requests
    .filter((r) => OPEN.includes(r.status))
    .sort((a, b) => a.createdMs - b.createdMs);
  const history = requests
    .filter((r) => !OPEN.includes(r.status))
    .sort((a, b) => {
      const ca = a.status === 'CONFLICTED' ? 0 : 1;
      const cb = b.status === 'CONFLICTED' ? 0 : 1;
      return ca - cb || b.startMs - a.startMs;
    });
  return { open, history };
}

const TONES: Record<VenueRequestStatus, Tone> = {
  PENDING: 'info',
  AWAITING_INFO: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CONFLICTED: 'warning',
  WITHDRAWN: 'neutral',
};
export const requestTone = (s: VenueRequestStatus): Tone => TONES[s];
export const requestLabel = (s: VenueRequestStatus): string => venueStrings.requestStatus[s];

/** REQUEST_INFO needs a non-empty message (REASON_REQUIRED server-side). */
export const validateInfoMessage = (message: string): string | undefined =>
  message.trim() ? undefined : venueStrings.requests.infoRequired;

export const emptyToUndefined = (v: string): string | undefined => v.trim() || undefined;
