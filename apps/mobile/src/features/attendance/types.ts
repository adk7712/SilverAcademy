// UC #1-4 #3-4 local view models for attendance; entity types come from @silveracademy/shared.
import type { AppError } from '@silveracademy/shared';

export type WorkshopSource = 'OWNED' | 'ASSIGNED';

/** A workshop the signed-in user may scan for (owned as instructor, or assigned as volunteer). */
export interface ScanWorkshop {
  id: string;
  title: string;
  startAtMs: number | null;
  endAtMs: number | null;
  source: WorkshopSource;
}

export type ScanErrorKind =
  | 'INVALID_QR'
  | 'TICKET_NOT_FOUND'
  | 'WRONG_WORKSHOP'
  | 'NO_BOOKING'
  | 'ALREADY_ATTENDED'
  | 'NOT_AUTHORISED'
  | 'WINDOW_CLOSED'
  | 'WORKSHOP_NOT_FOUND'
  | 'NETWORK'
  | 'OTHER';

export interface ScanSuccess {
  status: 'success';
  bookingId: string;
  learnerName: string;
  workshopTitle: string;
  attendedAt: string;
  method: 'QR' | 'MANUAL';
  pointsAwarded: number;
}

export interface ScanFailure {
  status: 'error';
  kind: ScanErrorKind;
  error: AppError | undefined;
  learnerName?: string;
  attendedAt?: string;
}

export type ScanOutcome = ScanSuccess | ScanFailure;

export type ScanInput = { qrPayload: string } | { ticketCode: string };
