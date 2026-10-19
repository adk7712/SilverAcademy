// UC #1-2 reads the instructor's own workshops (rules: instructorId == uid) and calls workshops-createWorkshop.
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import type { Workshop } from '@silveracademy/shared';
import { callFunction } from '../../../services/callables';
import { firestore } from '../../../services/firebase';

export async function fetchMyWorkshops(uid: string): Promise<Workshop[]> {
  const q = query(
    collection(firestore, 'workshops'),
    where('instructorId', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as Workshop), id: d.id }));
}

export const createWorkshop = (
  input: Parameters<typeof callFunction<'workshops-createWorkshop'>>[1],
) => callFunction('workshops-createWorkshop', input);
