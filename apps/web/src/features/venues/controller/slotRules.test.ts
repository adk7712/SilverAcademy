// UC #4-1 slot rules tests.
import { describe, expect, it } from 'vitest';
import { MAX_SLOT_HOURS } from '@silveracademy/shared';
import {
  draftFromSlot,
  fromLocalInput,
  groupSlotsByDay,
  isSlotLocked,
  leavesAvailable,
  suggestableSlots,
  toLocalInput,
  validateSlotDraft,
} from './slotRules';
import type { SlotView } from '../types';

const NOW = new Date('2030-01-01T00:00:00').getTime();
const slot = (over: Partial<SlotView>): SlotView => ({
  id: 's',
  facilityId: 'f',
  startMs: NOW + 1000,
  endMs: NOW + 2000,
  status: 'AVAILABLE',
  locked: false,
  ...over,
});

describe('slot rules', () => {
  it('locks BOOKED slots only', () => {
    expect(isSlotLocked({ status: 'BOOKED' })).toBe(true);
    expect(isSlotLocked({ status: 'AVAILABLE' })).toBe(false);
    expect(isSlotLocked({ status: 'MAINTENANCE' })).toBe(false);
  });

  it('round-trips datetime-local values', () => {
    const v = '2030-03-04T09:30';
    expect(toLocalInput(fromLocalInput(v))).toBe(v);
    expect(fromLocalInput('')).toBeNaN();
  });

  it('accepts a valid future slot and returns ISO strings', () => {
    const r = validateSlotDraft(
      { start: '2030-01-02T09:00', end: '2030-01-02T11:00', status: 'AVAILABLE' },
      NOW,
    );
    expect(r.errors).toEqual({});
    expect(r.startAt).toBe(new Date('2030-01-02T09:00').toISOString());
    expect(r.endAt).toBe(new Date('2030-01-02T11:00').toISOString());
  });

  it('rejects missing, reversed, past and too-long ranges', () => {
    expect(validateSlotDraft({ start: '', end: '', status: 'AVAILABLE' }, NOW).errors).toEqual({
      start: expect.any(String),
      end: expect.any(String),
    });
    expect(
      validateSlotDraft(
        { start: '2030-01-02T11:00', end: '2030-01-02T09:00', status: 'AVAILABLE' },
        NOW,
      ).errors.end,
    ).toBeDefined();
    expect(
      validateSlotDraft(
        { start: '2029-12-31T09:00', end: '2029-12-31T10:00', status: 'AVAILABLE' },
        NOW,
      ).errors.start,
    ).toBeDefined();
    const endHour = String(9 + MAX_SLOT_HOURS + 1).padStart(2, '0');
    const long = validateSlotDraft(
      { start: '2030-01-02T09:00', end: `2030-01-02T${endHour}:00`, status: 'AVAILABLE' },
      NOW,
    );
    expect(long.errors.end).toContain(String(MAX_SLOT_HOURS));
    expect(long.startAt).toBeUndefined();
  });

  it('warns only when an AVAILABLE slot is moved off AVAILABLE', () => {
    expect(leavesAvailable(slot({}), 'MAINTENANCE')).toBe(true);
    expect(leavesAvailable(slot({}), 'AVAILABLE')).toBe(false);
    expect(leavesAvailable(slot({ status: 'UNAVAILABLE' }), 'MAINTENANCE')).toBe(false);
    expect(leavesAvailable(undefined, 'UNAVAILABLE')).toBe(false);
  });

  it('groups by day in start order', () => {
    const day2 = new Date('2030-01-02T09:00').getTime();
    const day1a = new Date('2030-01-01T14:00').getTime();
    const day1b = new Date('2030-01-01T09:00').getTime();
    const groups = groupSlotsByDay([
      slot({ id: 'c', startMs: day2, endMs: day2 + 1 }),
      slot({ id: 'a', startMs: day1a, endMs: day1a + 1 }),
      slot({ id: 'b', startMs: day1b, endMs: day1b + 1 }),
    ]);
    expect(groups.map((g) => g.slots.map((s) => s.id))).toEqual([['b', 'a'], ['c']]);
  });

  it('builds an editable draft from a slot', () => {
    expect(draftFromSlot(slot({ id: 'x', status: 'MAINTENANCE' })).status).toBe('MAINTENANCE');
    expect(draftFromSlot(slot({ id: 'x' })).id).toBe('x');
  });
});

describe('suggestableSlots', () => {
  it('keeps only other AVAILABLE future slots', () => {
    const keep = slot({ id: 'a' });
    const list = [
      keep,
      slot({ id: 'self' }),
      slot({ id: 'past', startMs: NOW - 1 }),
      slot({ id: 'booked', status: 'BOOKED' }),
      slot({ id: 'maint', status: 'MAINTENANCE' }),
    ];
    expect(suggestableSlots(list, 'self', NOW)).toEqual([keep]);
  });
});
