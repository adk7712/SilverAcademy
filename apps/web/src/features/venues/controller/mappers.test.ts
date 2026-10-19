// UC #4-1 #4-2 mapper tests.
import { describe, expect, it } from 'vitest';
import type { TimeSlot } from '@silveracademy/shared';
import { toSlotView } from './mappers';

const ts = (ms: number) => ({ seconds: ms / 1000, nanoseconds: 0, toDate: () => new Date(ms) });

describe('toSlotView', () => {
  it('converts timestamps and locks BOOKED', () => {
    const base = {
      id: 's',
      facilityId: 'f',
      startAt: ts(1000),
      endAt: ts(5000),
      partnerId: 'p',
      bookedWorkshopId: null,
      bookedRequestId: null,
      createdAt: ts(0),
      updatedAt: ts(0),
    };
    const booked = toSlotView({ ...base, status: 'BOOKED' } as TimeSlot);
    expect(booked).toMatchObject({ startMs: 1000, endMs: 5000, locked: true });
    expect(toSlotView({ ...base, status: 'AVAILABLE' } as TimeSlot).locked).toBe(false);
  });
});
