// UC #5-2 ManageWorkshops: pure decision for workshops-adminUpdateWorkshop. No Firebase imports.
import { AppError, type Workshop } from '@silveracademy/shared';

export interface AdminEditPatch {
  title?: string | undefined;
  description?: string | undefined;
  category?: Workshop['category'] | undefined;
  materials?: string | undefined;
  capacity?: number | undefined;
}

export interface AdminEditDecision {
  /** Only fields whose value actually changes. */
  changes: Partial<Pick<Workshop, 'title' | 'description' | 'category' | 'materials' | 'capacity'>>;
  changedFields: string[];
  version: number;
}

const EDITABLE = ['title', 'description', 'category', 'materials', 'capacity'] as const;

/**
 * Check order: missing -> NOT_FOUND; version -> STALE_VERSION; capacity change when `startAt <= now` or status
 * COMPLETED / CANCELLED -> WORKSHOP_LOCKED_FIELDS; capacity < seatsTaken -> CAPACITY_BELOW_BOOKINGS.
 * No effective change returns the current version (no write needed, `changedFields` empty).
 */
export function decideAdminEdit(
  workshop: Workshop | undefined,
  patch: AdminEditPatch,
  expectedVersion: number,
  now: Date,
): AdminEditDecision {
  if (!workshop) throw new AppError('NOT_FOUND');
  if (workshop.version !== expectedVersion) {
    throw new AppError('STALE_VERSION', undefined, { currentVersion: workshop.version });
  }
  const changes: AdminEditDecision['changes'] = {};
  for (const key of EDITABLE) {
    const value = patch[key];
    if (value !== undefined && value !== workshop[key]) Object.assign(changes, { [key]: value });
  }
  const changedFields = Object.keys(changes);
  if (changes.capacity !== undefined) {
    const started = !!workshop.startAt && workshop.startAt.toDate().getTime() <= now.getTime();
    if (started || workshop.status === 'COMPLETED' || workshop.status === 'CANCELLED') {
      throw new AppError('WORKSHOP_LOCKED_FIELDS', undefined, { fields: ['capacity'] });
    }
    if (changes.capacity < workshop.seatsTaken) {
      throw new AppError('CAPACITY_BELOW_BOOKINGS', undefined, { seatsTaken: workshop.seatsTaken });
    }
  }
  return {
    changes,
    changedFields,
    version: changedFields.length ? workshop.version + 1 : workshop.version,
  };
}
