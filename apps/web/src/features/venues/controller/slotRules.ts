// UC #4-1 slot form validation, lock rule, grouping and date helpers (pure).
import { MAX_SLOT_HOURS } from '@silveracademy/shared';
import type { SlotEditableStatus } from '@silveracademy/shared';
import { venueStrings } from '../strings';
import type { SlotDraft, SlotView } from '../types';

const MS_PER_HOUR = 3_600_000;
const PAD = 2;

export const SLOT_STATUS_OPTIONS: readonly SlotEditableStatus[] = [
  'AVAILABLE',
  'UNAVAILABLE',
  'MAINTENANCE',
];

/** BOOKED slots cannot be edited or deleted (UC #4-1 alt flow). */
export const isSlotLocked = (slot: Pick<SlotView, 'status'>): boolean => slot.status === 'BOOKED';

/** True when saving this change will conflict open requests (slot leaves AVAILABLE). */
export const leavesAvailable = (before: SlotView | undefined, next: SlotDraft['status']): boolean =>
  before?.status === 'AVAILABLE' && next !== 'AVAILABLE';

const pad = (n: number) => String(n).padStart(PAD, '0');

/** Epoch ms -> `YYYY-MM-DDTHH:mm` in local time for datetime-local inputs. */
export function toLocalInput(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `datetime-local` string -> epoch ms (NaN when empty/invalid). */
export const fromLocalInput = (value: string): number =>
  value ? new Date(value).getTime() : Number.NaN;

export const emptySlotDraft = (): SlotDraft => ({ start: '', end: '', status: 'AVAILABLE' });

export const draftFromSlot = (s: SlotView): SlotDraft => ({
  id: s.id,
  start: toLocalInput(s.startMs),
  end: toLocalInput(s.endMs),
  status: s.status === 'BOOKED' ? 'AVAILABLE' : s.status,
});

export interface SlotValidation {
  errors: Partial<Record<'start' | 'end', string>>;
  startAt?: string;
  endAt?: string;
}

export function validateSlotDraft(draft: SlotDraft, nowMs: number): SlotValidation {
  const s = strings();
  const startMs = fromLocalInput(draft.start);
  const endMs = fromLocalInput(draft.end);
  const errors: SlotValidation['errors'] = {};
  if (Number.isNaN(startMs)) errors.start = s.required;
  if (Number.isNaN(endMs)) errors.end = s.required;
  if (!errors.start && !errors.end) {
    if (endMs <= startMs) errors.end = s.endAfterStart;
    else if (endMs - startMs > MAX_SLOT_HOURS * MS_PER_HOUR) errors.end = s.tooLong(MAX_SLOT_HOURS);
    if (startMs <= nowMs) errors.start = s.startInPast;
  }
  if (errors.start || errors.end) return { errors };
  return {
    errors,
    startAt: new Date(startMs).toISOString(),
    endAt: new Date(endMs).toISOString(),
  };
}

function strings() {
  return venueStrings.slots;
}

const DAY_FORMAT = new Intl.DateTimeFormat('en-SG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const TIME_FORMAT = new Intl.DateTimeFormat('en-SG', { hour: 'numeric', minute: '2-digit' });
const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-SG', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export const formatDay = (ms: number): string => DAY_FORMAT.format(ms);
export const formatTimeRange = (startMs: number, endMs: number): string =>
  `${TIME_FORMAT.format(startMs)} to ${TIME_FORMAT.format(endMs)}`;
export const formatDateTime = (ms: number): string => DATE_TIME_FORMAT.format(ms);

/** Other AVAILABLE future slots, for "suggest another slot". */
export const suggestableSlots = (
  slots: readonly SlotView[],
  excludeSlotId: string,
  nowMs: number,
): SlotView[] =>
  slots.filter((s) => s.status === 'AVAILABLE' && s.startMs > nowMs && s.id !== excludeSlotId);

export interface SlotDayGroup {
  day: string;
  slots: SlotView[];
}

/** Sorted by start, grouped by calendar day (list-style calendar). */
export function groupSlotsByDay(slots: readonly SlotView[]): SlotDayGroup[] {
  const sorted = [...slots].sort((a, b) => a.startMs - b.startMs);
  const groups: SlotDayGroup[] = [];
  for (const slot of sorted) {
    const day = formatDay(slot.startMs);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.slots.push(slot);
    else groups.push({ day, slots: [slot] });
  }
  return groups;
}
