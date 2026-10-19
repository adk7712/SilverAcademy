// UC #4-1 slots of one facility: load, add/update, remove (BOOKED locked in the UI and by the server).
import { useCallback, useMemo } from 'react';
import { fetchSlots, removeSlot, saveSlot } from '../repo/venuesRepo';
import type { SlotView } from '../types';
import { toSlotView } from './mappers';
import { suggestableSlots } from './slotRules';
import { useGuardedAction } from './useGuarded';
import { useLoad } from './useLoad';
import type { SlotEditableStatus } from '@silveracademy/shared';

const NONE: SlotView[] = [];

export interface SlotSaveInput {
  slotId?: string;
  startAt: string;
  endAt: string;
  status: SlotEditableStatus;
}

export function useSlots(facilityId: string | null) {
  const guard = useGuardedAction();
  const load = useMemo(
    () => (facilityId ? async () => (await fetchSlots(facilityId)).map(toSlotView) : null),
    [facilityId],
  );
  const list = useLoad<SlotView[]>(load, NONE);
  const { reload } = list;

  const save = useCallback(
    async (input: SlotSaveInput) => {
      if (!facilityId) throw new Error('No facility selected');
      const res = await guard(() => saveSlot({ facilityId, ...input }));
      if (res.ok) reload();
      return res;
    },
    [facilityId, guard, reload],
  );
  const remove = useCallback(
    async (slotId: string) => {
      if (!facilityId) throw new Error('No facility selected');
      const res = await guard(() => removeSlot({ facilityId, slotId }));
      if (res.ok) reload();
      return res;
    },
    [facilityId, guard, reload],
  );
  return { ...list, save, remove };
}

/** Other AVAILABLE future slots at a facility, for "suggest another slot". */
export function useSuggestableSlots(facilityId: string | null, excludeSlotId: string) {
  const load = useMemo(
    () =>
      facilityId
        ? async () => {
            return suggestableSlots(
              (await fetchSlots(facilityId)).map(toSlotView),
              excludeSlotId,
              Date.now(),
            );
          }
        : null,
    [facilityId, excludeSlotId],
  );
  return useLoad<SlotView[]>(load, NONE);
}
