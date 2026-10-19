// UC #1-3 RequestVenue controller: load venues/slots/requests, submit, answer info request, withdraw.
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { Facility, TimeSlot, VenueRequest, Workshop } from '@silveracademy/shared';
import { errorMessage } from '../../../services/errors/errorMessage';
import { toAppError } from '../../../services/errors/toAppError';
import { strings } from '../../../i18n';
import { useSession } from '../../auth';
import {
  fetchAvailableSlots,
  fetchFacilities,
  fetchRequestsForWorkshop,
  fetchWorkshop,
  requestVenue,
  respondToInfoRequest,
  withdrawVenueRequest,
} from '../repo/venueRequestRepo';
import {
  buildVenueOptions,
  canPickVenue,
  isSlotGoneError,
  latestRequest,
  validateReply,
} from './venueRequestLogic';

export function useVenueRequest(workshopId: string) {
  const { state } = useSession();
  const uid = state.status === 'signedIn' ? state.uid : null;
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [requests, setRequests] = useState<VenueRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const w = await fetchWorkshop(workshopId);
      setWorkshop(w);
      const [reqs, facs, sl] = await Promise.all([
        fetchRequestsForWorkshop(uid, workshopId),
        fetchFacilities(),
        fetchAvailableSlots(new Date()),
      ]);
      setRequests(reqs);
      setFacilities(facs);
      setSlots(sl);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [uid, workshopId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const latest = useMemo(() => latestRequest(requests), [requests]);
  const options = useMemo(
    () => buildVenueOptions(facilities, slots, workshop?.capacity ?? 0, Date.now()),
    [facilities, slots, workshop],
  );
  const mayPick = workshop ? canPickVenue(workshop.status, latest) : false;
  const chosenFacility = options.find((o) => o.facility.id === facilityId) ?? null;

  const selectFacility = useCallback((id: string) => {
    setFacilityId(id);
    setSlotId(null);
    setNotice(null);
  }, []);

  /** Runs a mutation, then reloads; maps failures to text (slot-gone errors ask for another pick). */
  const run = useCallback(
    async (action: () => Promise<unknown>, success: string) => {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        await action();
        setNotice(success);
        setSlotId(null);
        await load();
        return true;
      } catch (e) {
        const appError = toAppError(e);
        if (isSlotGoneError(appError.code)) {
          setError(strings.venuesInstructor.slotTaken);
          setSlotId(null);
          await load();
        } else setError(errorMessage(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const submit = useCallback(async () => {
    if (!facilityId || !slotId) return false;
    return run(
      () => requestVenue(workshopId, facilityId, slotId),
      strings.venuesInstructor.submitted,
    );
  }, [facilityId, slotId, run, workshopId]);

  const reply = useCallback(
    async (message: string) => {
      const check = validateReply(message);
      setReplyError(check.error ?? null);
      if (!check.ok || !latest) return false;
      return run(
        () => respondToInfoRequest(latest.id, check.message),
        strings.venuesInstructor.infoReplySent,
      );
    },
    [latest, run],
  );

  const withdraw = useCallback(async () => {
    if (!latest) return false;
    return run(() => withdrawVenueRequest(latest.id), strings.venuesInstructor.withdrawn);
  }, [latest, run]);

  return {
    workshop,
    latest,
    options,
    mayPick,
    chosenFacility,
    facilityId,
    slotId,
    loading,
    busy,
    error,
    notice,
    replyError,
    selectFacility,
    selectSlot: setSlotId,
    submit,
    reply,
    withdraw,
    reload: load,
  };
}
