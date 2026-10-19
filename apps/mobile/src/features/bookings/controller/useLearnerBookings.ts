// UC #2-3 ViewTicket: loads own bookings; serves the AsyncStorage mirror when the network fails (ADR-019).
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../auth';
import { errorMessage } from '../../../services/errors/errorMessage';
import { cacheTickets, fetchOwnBookings, readCachedTickets } from '../repo/learnerBookingRepo';
import type { BookingView } from './learnerBookingModel';

export interface LearnerBookingsState {
  bookings: BookingView[];
  loading: boolean;
  error: string | null;
  /** Set when the list comes from the local copy; the time that copy was saved. */
  cachedAt: Date | null;
  reload: () => void;
}

export function useLearnerBookings(): LearnerBookingsState {
  const { state } = useSession();
  const uid = state.status === 'signedIn' ? state.uid : null;
  const [bookings, setBookings] = useState<BookingView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!uid) return;
    let live = true;
    setLoading(true);
    (async () => {
      try {
        const fresh = await fetchOwnBookings(uid);
        if (!live) return;
        setBookings(fresh);
        setCachedAt(null);
        setError(null);
        void cacheTickets(uid, fresh);
      } catch (e) {
        const cached = await readCachedTickets(uid);
        if (!live) return;
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
  }, [uid, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { bookings, loading, error, cachedAt, reload };
}
