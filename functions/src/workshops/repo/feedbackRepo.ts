// feedback/{bookingId} write (UC #2-4, ADR-022): attendance-gated, once per booking, aggregates in the same tx.
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Attendance, Workshop } from '@silveracademy/shared';
import { COL, ids, runTx, type Caller } from '../../common';
import { decideFeedback } from '../controller/decideFeedback';

export interface SubmitFeedbackInput {
  workshopId: string;
  rating: number;
  comment?: string | undefined;
  tags?: string[] | undefined;
}

/**
 * Reads workshop + attendance + existing feedback + instructor profile, decides, then creates the feedback doc and
 * increments `ratingSum` / `ratingCount` on the workshop and (if it exists) the instructor profile.
 */
export async function submitFeedback(
  db: Firestore,
  caller: Pick<Caller, 'uid'>,
  input: SubmitFeedbackInput,
  now: Date,
): Promise<{ feedbackId: string }> {
  const bookingId = ids.booking(input.workshopId, caller.uid);
  const wRef = db.collection(COL.workshops).doc(input.workshopId);
  const aRef = db.collection(COL.attendance).doc(bookingId);
  const fRef = db.collection(COL.feedback).doc(bookingId);
  await runTx(db, async (tx) => {
    const [wSnap, aSnap, fSnap] = await Promise.all([tx.get(wRef), tx.get(aRef), tx.get(fRef)]);
    const workshop = wSnap.exists ? (wSnap.data() as Workshop) : undefined;
    const attendance = aSnap.exists ? (aSnap.data() as Attendance) : undefined;
    decideFeedback(
      {
        workshop,
        attended:
          !!attendance &&
          attendance.learnerId === caller.uid &&
          attendance.workshopId === input.workshopId,
        alreadySubmitted: fSnap.exists,
      },
      now,
    );
    const w = workshop as Workshop;
    const pRef = db.collection(COL.instructorProfiles).doc(w.instructorId);
    const pSnap = await tx.get(pRef);

    tx.create(fRef, {
      bookingId,
      workshopId: input.workshopId,
      learnerId: caller.uid,
      instructorId: w.instructorId,
      rating: input.rating,
      comment: input.comment ?? '',
      tags: input.tags ?? [],
      createdAt: FieldValue.serverTimestamp(),
    });
    const bump = {
      ratingSum: FieldValue.increment(input.rating),
      ratingCount: FieldValue.increment(1),
    };
    tx.update(wRef, bump);
    if (pSnap.exists) tx.update(pRef, bump);
  });
  return { feedbackId: bookingId };
}
