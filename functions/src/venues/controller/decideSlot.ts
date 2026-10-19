// UC #4-1 ManageAvailability: pure rules for venues-upsertSlot / venues-deleteSlot (architecture 4.6, FR 5.4). No Firebase imports.
import {
  AppError,
  MAX_SLOT_HOURS,
  type Facility,
  type SlotEditableStatus,
  type TimeSlot,
} from '@silveracademy/shared';

const MS_PER_HOUR = 3_600_000;

type FacilityOwner = Pick<Facility, 'partnerId'> | undefined;
type SlotForEdit = Pick<TimeSlot, 'status' | 'startAt' | 'endAt'> | undefined;
export interface SlotWindow {
  id: string;
  startAt: Date;
  endAt: Date;
}

export interface UpsertSlotDecision {
  startAt: Date;
  endAt: Date;
  status: SlotEditableStatus;
  /** Existing AVAILABLE slot that is now unavailable or moved: pending requests on it become CONFLICTED. */
  conflictsRequests: boolean;
}

function assertOwner(facility: FacilityOwner, uid: string): void {
  if (!facility) throw new AppError('NOT_FOUND');
  if (facility.partnerId !== uid) throw new AppError('NOT_FACILITY_OWNER');
}

/**
 * Order: facility missing NOT_FOUND -> not owner NOT_FACILITY_OWNER -> slotId given but slot missing NOT_FOUND
 * -> slot BOOKED SLOT_BOOKED_LOCKED -> end <= start or longer than MAX_SLOT_HOURS INVALID_TIME_RANGE
 * -> start <= now SLOT_IN_PAST -> overlap with a sibling slot SLOT_OVERLAP.
 * `siblings` = slots of the same facility that may overlap (the caller may include the edited slot; it is excluded).
 */
export function decideUpsertSlot(args: {
  facility: FacilityOwner;
  slotId: string | undefined;
  slot: SlotForEdit;
  input: { startAt: string; endAt: string; status: SlotEditableStatus };
  siblings: SlotWindow[];
  uid: string;
  now: Date;
}): UpsertSlotDecision {
  assertOwner(args.facility, args.uid);
  if (args.slotId && !args.slot) throw new AppError('NOT_FOUND');
  if (args.slot?.status === 'BOOKED') throw new AppError('SLOT_BOOKED_LOCKED');
  const startAt = new Date(args.input.startAt);
  const endAt = new Date(args.input.endAt);
  const span = endAt.getTime() - startAt.getTime();
  if (!(span > 0) || span > MAX_SLOT_HOURS * MS_PER_HOUR) throw new AppError('INVALID_TIME_RANGE');
  if (startAt.getTime() <= args.now.getTime()) throw new AppError('SLOT_IN_PAST');
  const overlaps = args.siblings.some(
    (s) => s.id !== args.slotId && s.startAt < endAt && s.endAt > startAt,
  );
  if (overlaps) throw new AppError('SLOT_OVERLAP');
  const moved =
    !!args.slot &&
    (args.slot.startAt.toDate().getTime() !== startAt.getTime() ||
      args.slot.endAt.toDate().getTime() !== endAt.getTime());
  return {
    startAt,
    endAt,
    status: args.input.status,
    conflictsRequests:
      args.slot?.status === 'AVAILABLE' && (args.input.status !== 'AVAILABLE' || moved),
  };
}

/** Order: NOT_FOUND (facility or slot) -> NOT_FACILITY_OWNER -> BOOKED slots are locked (SLOT_BOOKED_LOCKED). */
export function decideDeleteSlot(
  facility: FacilityOwner,
  slot: Pick<TimeSlot, 'status'> | undefined,
  uid: string,
): void {
  assertOwner(facility, uid);
  if (!slot) throw new AppError('NOT_FOUND');
  if (slot.status === 'BOOKED') throw new AppError('SLOT_BOOKED_LOCKED');
}
