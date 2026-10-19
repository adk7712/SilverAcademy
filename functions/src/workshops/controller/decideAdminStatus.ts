// UC #5-2 / #5-3 FR 6.20: pure decision for workshops-adminSetStatus (archive / unarchive / complete / cancel). No Firebase imports.
import {
  AppError,
  type Workshop,
  type WorkshopAdminAction,
  type WorkshopStatus,
} from '@silveracademy/shared';

export interface AdminStatusInput {
  status: WorkshopAdminAction;
  reason?: string | undefined;
  confirmImpact?: boolean | undefined;
  expectedVersion: number;
}

export interface AdminStatusDecision {
  nextStatus: WorkshopStatus;
  /** string = store, null = delete the field. */
  statusBeforeArchive: WorkshopStatus | null;
  /** CANCELLED: cancel CONFIRMED bookings, free the slot, withdraw a pending venue request, notify. */
  cancel: boolean;
  cancelReason: string | null;
  /** CANCELLED or ARCHIVED of a DRAFT / PENDING_VENUE workshop: withdraw the pending venue request, clear the link (M4). */
  withdrawRequest: boolean;
  /** ARCHIVED of an upcoming OPEN workshop with bookings: tell the booked learners (L4). */
  notifyLearners: boolean;
  version: number;
}

const ARCHIVABLE: readonly WorkshopStatus[] = [
  'DRAFT',
  'PENDING_VENUE',
  'OPEN',
  'COMPLETED',
  'CANCELLED',
];
const CANCELLABLE: readonly WorkshopStatus[] = ['DRAFT', 'PENDING_VENUE', 'OPEN'];
/** Fallback when an archived workshop has no stored `statusBeforeArchive`. */
const UNARCHIVE_FALLBACK: WorkshopStatus = 'COMPLETED';

const isUpcoming = (w: Workshop, now: Date): boolean =>
  !w.startAt || w.startAt.toDate().getTime() > now.getTime();

/**
 * Check order: missing -> NOT_FOUND; version -> STALE_VERSION; transition not allowed -> INVALID_TRANSITION;
 * CANCELLED without reason -> REASON_REQUIRED; impact needs confirming -> ACTIVE_BOOKINGS_CONFIRM_REQUIRED
 * (CANCELLED with seatsTaken > 0; ARCHIVED of an upcoming OPEN workshop with seatsTaken > 0; details `{ seatsTaken }`).
 * Transitions: OPEN -> COMPLETED | CANCELLED | ARCHIVED; DRAFT / PENDING_VENUE -> CANCELLED | ARCHIVED;
 * COMPLETED / CANCELLED -> ARCHIVED; ARCHIVED -> UNARCHIVE (restores statusBeforeArchive).
 */
export function decideAdminStatus(
  workshop: Workshop | undefined,
  input: AdminStatusInput,
  now: Date,
): AdminStatusDecision {
  if (!workshop) throw new AppError('NOT_FOUND');
  if (workshop.version !== input.expectedVersion) {
    throw new AppError('STALE_VERSION', undefined, { currentVersion: workshop.version });
  }
  const from = workshop.status;
  const base = {
    cancel: false,
    cancelReason: null,
    withdrawRequest: false,
    notifyLearners: false,
    version: workshop.version + 1,
  };
  const invalid = (): never => {
    throw new AppError('INVALID_TRANSITION', undefined, { from, action: input.status });
  };

  switch (input.status) {
    case 'UNARCHIVE':
      if (from !== 'ARCHIVED') invalid();
      return {
        ...base,
        nextStatus: workshop.statusBeforeArchive ?? UNARCHIVE_FALLBACK,
        statusBeforeArchive: null,
      };
    case 'COMPLETED':
      if (from !== 'OPEN') invalid();
      return { ...base, nextStatus: 'COMPLETED', statusBeforeArchive: null };
    case 'ARCHIVED': {
      if (!ARCHIVABLE.includes(from)) invalid();
      const impactsLearners =
        from === 'OPEN' && workshop.seatsTaken > 0 && isUpcoming(workshop, now);
      if (impactsLearners && !input.confirmImpact) {
        throw new AppError('ACTIVE_BOOKINGS_CONFIRM_REQUIRED', undefined, {
          seatsTaken: workshop.seatsTaken,
        });
      }
      if (from === 'PENDING_VENUE') {
        // The pending request is withdrawn, so unarchive must restore DRAFT (not a dead PENDING_VENUE).
        return {
          ...base,
          nextStatus: 'ARCHIVED',
          statusBeforeArchive: 'DRAFT',
          withdrawRequest: true,
        };
      }
      return {
        ...base,
        nextStatus: 'ARCHIVED',
        statusBeforeArchive: from,
        notifyLearners: impactsLearners,
      };
    }
    case 'CANCELLED': {
      if (!CANCELLABLE.includes(from)) invalid();
      const reason = input.reason?.trim();
      if (!reason) throw new AppError('REASON_REQUIRED');
      if (workshop.seatsTaken > 0 && !input.confirmImpact) {
        throw new AppError('ACTIVE_BOOKINGS_CONFIRM_REQUIRED', undefined, {
          seatsTaken: workshop.seatsTaken,
        });
      }
      return {
        ...base,
        nextStatus: 'CANCELLED',
        statusBeforeArchive: null,
        cancel: true,
        cancelReason: reason,
        withdrawRequest: true,
      };
    }
  }
}
