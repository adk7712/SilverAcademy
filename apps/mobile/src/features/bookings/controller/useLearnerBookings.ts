// UC #2-3 ViewTicket: loads own bookings; serves the AsyncStorage mirror when the network fails (ADR-019).
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSession } from '../../auth';
import { errorMessage } from '../../../services/errors/errorMessage';
import {
  cacheTickets,
  cancelOwnBooking,
  fetchOwnBookings,
  readCachedTickets,
} from '../repo/learnerBookingRepo';
import { markBookingCancelled, type BookingView } from './learnerBookingModel';

export interface LearnerBookingsState {
  bookings: BookingView[];
  loading: boolean;
  error: string | null;
  /** Set when the list comes from the local copy; the time that copy was saved. */
  cachedAt: Date | null;
  reload: () => void;
  cancelling: boolean;
  cancelError: string | null;
  cancel: (workshopId: string) => Promise<boolean>;
}

export function useLearnerBookings(): LearnerBookingsState {
  const { state } = useSession();
  const uid = state.status === 'signedIn' ? state.uid : null;
  const [bookings, setBookings] = useState<BookingView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const busy = useRef(false);
  // A read started before cancellation must not restore the old ticket afterwards.
  const revision = useRef(0);
  const currentBookings = useRef(bookings);
  currentBookings.current = bookings;

  useFocusEffect(
    useCallback(() => {
      if (!uid) return;
      let live = true;
      const readRevision = revision.current;
      setLoading(true);
      (async () => {
        try {
          const fresh = await fetchOwnBookings(uid);
          if (!live || readRevision !== revision.current) return;
          setBookings(fresh);
          setCachedAt(null);
          setError(null);
          void cacheTickets(uid, fresh);
        } catch (e) {
          const cached = await readCachedTickets(uid);
          if (!live || readRevision !== revision.current) return;
          if (cached) {
            setBookings(cached.bookings);
            setCachedAt(cached.savedAt);
            setError(null);
          } else {
            setError(errorMessage(e));
          }
        } finally {
          if (live) setLoading(false);
        }
      })();
      return () => {
        live = false;
      };
    }, [uid, tick]),
  );

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const cancel = useCallback(
    async (workshopId: string): Promise<boolean> => {
      if (!uid || busy.current) return false;
      busy.current = true;
      setCancelling(true);
      setCancelError(null);
      try {
        const result = await cancelOwnBooking(workshopId);
        revision.current += 1;
        const updated = markBookingCancelled(currentBookings.current, result.bookingId);
        currentBookings.current = updated;
        setBookings(updated);
        await cacheTickets(uid, updated);
        return true;
      } catch (e) {
        setCancelError(errorMessage(e));
        return false;
      } finally {
        busy.current = false;
        setCancelling(false);
      }
    },
    [uid],
  );

  return { bookings, loading, error, cachedAt, reload, cancelling, cancelError, cancel };
}
