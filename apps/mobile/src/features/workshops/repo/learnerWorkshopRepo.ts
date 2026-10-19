// UC #2-1 #2-2 direct Firestore read of OPEN workshops (ADR-018) and the bookWorkshop callable.
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { SEARCH_FETCH_LIMIT, type Workshop } from '@silveracademy/shared';
import { firestore } from '../../../services/firebase';
import { callFunction } from '../../../services/callables';

export async function fetchOpenWorkshops(): Promise<Workshop[]> {
  const q = query(
    collection(firestore, 'workshops'),
    where('status', '==', 'OPEN'),
    orderBy('startAt', 'asc'),
    limit(SEARCH_FETCH_LIMIT),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as Workshop), id: d.id }));
}

/** Null when the doc does not exist or rules hide it (e.g. DRAFT). */
export async function fetchWorkshop(id: string): Promise<Workshop | null> {
  try {
    const snap = await getDoc(doc(firestore, 'workshops', id));
    return snap.exists() ? { ...(snap.data() as Workshop), id: snap.id } : null;
  } catch (e) {
    if ((e as { code?: string }).code === 'permission-denied') return null;
    throw e;
  }
}

export const bookWorkshop = (workshopId: string) =>
  callFunction('bookings-bookWorkshop', { workshopId });
