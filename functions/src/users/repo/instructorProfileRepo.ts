// instructorProfiles/{uid} writes: submit (gap #17) and admin review (UC #5-5).
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { InstructorProfile, User } from '@silveracademy/shared';
import { COL, notifyTx, paths, runTx, writeAuditTx, type Caller } from '../../common';
import { decideInstructorReview, type ReviewInput } from '../controller/decideInstructorReview';
import { decideInstructorSubmit } from '../controller/decideInstructorSubmit';

export interface SubmitProfileInput {
  bio: string;
  expertise: InstructorProfile['expertise'];
  experienceYears: number;
}

/** Creates or resubmits the caller's profile as PENDING. Keeps rating aggregates on resubmission. */
export async function submitInstructorProfile(
  db: Firestore,
  caller: Pick<Caller, 'uid' | 'user'>,
  input: SubmitProfileInput,
): Promise<{ status: 'PENDING' }> {
  const ref = db.collection(COL.instructorProfiles).doc(caller.uid);
  const userRef = db.collection(COL.users).doc(caller.uid);
  await runTx(db, async (tx) => {
    const [snap, userSnap] = await Promise.all([tx.get(ref), tx.get(userRef)]);
    const user = userSnap.exists ? (userSnap.data() as User) : caller.user;
    const existing = snap.exists ? (snap.data() as InstructorProfile) : undefined;
    decideInstructorSubmit(user, existing);
    const fields = {
      displayName: user.displayName,
      bio: input.bio,
      expertise: input.expertise,
      experienceYears: input.experienceYears,
      status: 'PENDING',
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (existing) {
      tx.update(ref, {
        ...fields,
        reviewReason: FieldValue.delete(),
        version: existing.version + 1,
      });
    } else {
      tx.create(ref, {
        uid: caller.uid,
        ...fields,
        ratingSum: 0,
        ratingCount: 0,
        version: 1,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  });
  return { status: 'PENDING' };
}

/** Admin decision on a PENDING profile: update profile, audit INSTRUCTOR_REVIEW, notify the instructor. */
export async function reviewInstructorProfile(
  db: Firestore,
  caller: Pick<Caller, 'uid'>,
  input: ReviewInput & { uid: string },
): Promise<{ status: 'APPROVED' | 'REJECTED' | 'REQUIRES_REVISION'; version: number }> {
  const ref = db.collection(COL.instructorProfiles).doc(input.uid);
  return runTx(db, async (tx) => {
    const snap = await tx.get(ref);
    const d = decideInstructorReview(
      snap.exists ? (snap.data() as InstructorProfile) : undefined,
      input,
    );
    tx.update(ref, {
      status: d.status,
      reviewReason: d.reviewReason ?? FieldValue.delete(),
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedBy: caller.uid,
      version: d.version,
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeAuditTx(db, tx, {
      actorId: caller.uid,
      actorRole: 'ADMIN',
      action: 'INSTRUCTOR_REVIEW',
      outcome: 'SUCCESS',
      targetType: 'INSTRUCTOR_PROFILE',
      targetId: input.uid,
      details: {
        decision: input.decision,
        status: d.status,
        ...(d.reviewReason ? { reason: d.reviewReason } : {}),
      },
    });
    notifyTx(db, tx, {
      userId: input.uid,
      type: 'PROFILE_REVIEWED',
      title: d.notice.title,
      body: d.notice.body,
      refPath: paths.user(input.uid),
    });
    return { status: d.status, version: d.version };
  });
}
