// UC #2-4 feedback data access: attended bookings and submitted feedback (direct reads) + workshops-submitFeedback.
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { callFunction } from '../../../services/callables';
import { firestore } from '../../../services/firebase';
import type { AttendedWorkshop } from '../feedbackTypes';

/** Bookings the learner attended (client-side filter: status + createdAt order would need another index). */
export async function listAttendedWorkshops(uid: string): Promise<AttendedWorkshop[]> {
  const snap = await getDocs(
    query(
      collection(firestore, 'bookings'),
      where('learnerId', '==', uid),
      orderBy('createdAt', 'desc'),
    ),
  );
  return snap.docs
    .filter((d) => d.data().status === 'ATTENDED')
    .map((d) => {
      const data = d.data();
      return {
        workshopId: data.workshopId as string,
        title: (data.workshopSnapshot?.title as string) ?? '',
        endAt: (data.workshopSnapshot.endAt as { toDate: () => Date }).toDate(),
      };
    });
}

export async function listSubmittedWorkshopIds(uid: string): Promise<Set<string>> {
  const snap = await getDocs(
    query(collection(firestore, 'feedback'), where('learnerId', '==', uid)),
  );
  return new Set(snap.docs.map((d) => d.data().workshopId as string));
}

export const submitFeedback = (input: {
  workshopId: string;
  rating: number;
  comment?: string;
  tags?: string[];
}) => callFunction('workshops-submitFeedback', input);
