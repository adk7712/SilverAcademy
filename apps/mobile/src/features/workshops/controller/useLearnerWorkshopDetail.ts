// UC #2-2 BookWorkshops: detail controller (load workshop, book, map failures to clear messages).
import { useCallback, useEffect, useState } from 'react';
import type { Workshop } from '@silveracademy/shared';
import { errorMessage } from '../../../services/errors/errorMessage';
import { bookWorkshop, fetchWorkshop } from '../repo/learnerWorkshopRepo';
import { describeBookFailure, type BookFailure } from './learnerDetailLogic';

export interface BookedInfo {
  bookingId: string;
  ticketCode: string;
  seatsRemaining: number;
}

export function useLearnerWorkshopDetail(workshopId: string) {
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [failure, setFailure] = useState<BookFailure | null>(null);
  const [booked, setBooked] = useState<BookedInfo | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetchWorkshop(workshopId)
      .then((w) => {
        if (!live) return;
        setWorkshop(w);
        setLoadError(null);
      })
      .catch((e) => live && setLoadError(errorMessage(e)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [workshopId, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  const book = useCallback(async (): Promise<boolean> => {
    setBooking(true);
    setFailure(null);
    try {
      const out = await bookWorkshop(workshopId);
      setBooked({
        bookingId: out.bookingId,
        ticketCode: out.ticketCode,
        seatsRemaining: out.seatsRemaining,
      });
      reload();
      return true;
    } catch (e) {
      const f = describeBookFailure(e);
      setFailure(f);
      if (f.refresh) reload();
      return false;
    } finally {
      setBooking(false);
    }
  }, [workshopId, reload]);

  return { workshop, loading, loadError, booking, failure, booked, book, reload };
}
