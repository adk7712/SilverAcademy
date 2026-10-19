// UC #1-3 pure rules: venue options from facilities + slots, map pins, request status and allowed actions.
import {
  VENUE_REQUEST_MIN_LEAD_MIN,
  type AppErrorCode,
  type Facility,
  type TimeSlot,
  type VenueRequest,
  type VenueRequestStatus,
  type WorkshopStatus,
} from '@silveracademy/shared';
import { strings } from '../../../i18n';

const MS_PER_MIN = 60_000;
const PIN_MARGIN_PCT = 8;
const PIN_RANGE_PCT = 100 - 2 * PIN_MARGIN_PCT;

export interface VenueOption {
  facility: Facility;
  slots: TimeSlot[];
  /** False when the venue capacity is below the workshop capacity (server: VENUE_TOO_SMALL). */
  fits: boolean;
}

/** Groups free future slots by facility; venues that fit come first, then by name. */
export function buildVenueOptions(
  facilities: Facility[],
  slots: TimeSlot[],
  workshopCapacity: number,
  nowMs: number,
): VenueOption[] {
  const earliest = nowMs + VENUE_REQUEST_MIN_LEAD_MIN * MS_PER_MIN;
  const byFacility = new Map<string, TimeSlot[]>();
  for (const s of slots) {
    if (s.status !== 'AVAILABLE' || s.startAt.toDate().getTime() <= earliest) continue;
    byFacility.set(s.facilityId, [...(byFacility.get(s.facilityId) ?? []), s]);
  }
  const options: VenueOption[] = [];
  for (const facility of facilities) {
    const list = byFacility.get(facility.id);
    if (!list) continue;
    list.sort((a, b) => a.startAt.toDate().getTime() - b.startAt.toDate().getTime());
    options.push({ facility, slots: list, fits: facility.capacity >= workshopCapacity });
  }
  return options.sort(
    (a, b) => Number(b.fits) - Number(a.fits) || a.facility.name.localeCompare(b.facility.name),
  );
}

export function formatSlot(slot: Pick<TimeSlot, 'startAt' | 'endAt'>): string {
  const start = slot.startAt.toDate();
  const end = slot.endAt.toDate();
  const day = start.toLocaleDateString('en-SG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const time = (d: Date) => d.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' });
  return `${day}, ${time(start)} to ${time(end)}`;
}

export interface MapPin {
  facilityId: string;
  name: string;
  /** Percent of the map box, origin top-left, north up. */
  xPct: number;
  yPct: number;
}

/** Plots venues on a simple schematic map (no tiles): min/max lat/lng scaled into the box. */
export function projectPins(facilities: Pick<Facility, 'id' | 'name' | 'lat' | 'lng'>[]): MapPin[] {
  if (facilities.length === 0) return [];
  const lats = facilities.map((f) => f.lat);
  const lngs = facilities.map((f) => f.lng);
  const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
  const [minLng, maxLng] = [Math.min(...lngs), Math.max(...lngs)];
  const scale = (v: number, lo: number, hi: number) =>
    hi === lo ? 50 : PIN_MARGIN_PCT + ((v - lo) / (hi - lo)) * PIN_RANGE_PCT;
  return facilities.map((f) => ({
    facilityId: f.id,
    name: f.name,
    xPct: scale(f.lng, minLng, maxLng),
    yPct: 100 - scale(f.lat, minLat, maxLat),
  }));
}

const OPEN_STATUSES: VenueRequestStatus[] = ['PENDING', 'AWAITING_INFO'];

export const isOpenRequest = (r: Pick<VenueRequest, 'status'>) => OPEN_STATUSES.includes(r.status);
export const canRespondToInfo = (r: Pick<VenueRequest, 'status'>) => r.status === 'AWAITING_INFO';
export const canWithdraw = isOpenRequest;

/** Latest request first (callers sort); the one the screen reports on. */
export function latestRequest(requests: VenueRequest[]): VenueRequest | null {
  return (
    [...requests].sort(
      (a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime(),
    )[0] ?? null
  );
}

/** A new request may be made only for a DRAFT workshop (server: WORKSHOP_NOT_EDITABLE otherwise). */
export const canPickVenue = (status: WorkshopStatus, latest: VenueRequest | null) =>
  status === 'DRAFT' && !(latest && isOpenRequest(latest));

export function requestStatusInfo(status: VenueRequestStatus) {
  const t = strings.venuesInstructor;
  const map: Record<
    VenueRequestStatus,
    { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }
  > = {
    PENDING: { label: t.statusPending, tone: 'warning' },
    AWAITING_INFO: { label: t.statusAwaitingInfo, tone: 'warning' },
    APPROVED: { label: t.statusApproved, tone: 'success' },
    REJECTED: { label: t.statusRejected, tone: 'danger' },
    CONFLICTED: { label: t.statusConflicted, tone: 'danger' },
    WITHDRAWN: { label: t.statusWithdrawn, tone: 'neutral' },
  };
  return map[status];
}

const SLOT_RETRY_CODES: AppErrorCode[] = ['SLOT_CONFLICT', 'SLOT_UNAVAILABLE', 'SLOT_IN_PAST'];
/** True when the chosen slot is gone and the instructor must pick another (#1-3 Ex1). */
export const isSlotGoneError = (code: AppErrorCode) => SLOT_RETRY_CODES.includes(code);

export function validateReply(message: string): { ok: boolean; error?: string; message: string } {
  const trimmed = message.trim();
  return trimmed
    ? { ok: true, message: trimmed }
    : { ok: false, error: strings.venuesInstructor.infoReplyRequired, message: trimmed };
}
