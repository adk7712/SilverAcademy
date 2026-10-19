// UC #1-3 RequestVenue: Admin SDK transactions for requestVenue / respondToInfoRequest / withdrawVenueRequest.
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type {
  Facility,
  InstructorProfile,
  TimeSlot,
  VenueRequest,
  Workshop,
} from '@silveracademy/shared';
import { COL, notifyTx, paths, refs, runTx } from '../../common';
import {
  decideRequestVenue,
  decideRespondToInfo,
  decideWithdrawRequest,
} from '../controller/decideVenueRequest';

const data = <T>(snap: { exists: boolean; data(): unknown }): T | undefined =>
  snap.exists ? (snap.data() as T) : undefined;

export function requestVenueTx(
  db: Firestore,
  args: {
    uid: string;
    instructorName: string;
    workshopId: string;
    facilityId: string;
    slotId: string;
    now: Date;
  },
): Promise<{ requestId: string }> {
  const { uid, workshopId, facilityId, slotId } = args;
  const requestRef = db.collection(COL.venueRequests).doc();
  const workshopRef = db.collection(COL.workshops).doc(workshopId);
  return runTx(db, async (tx) => {
    const [profileSnap, wSnap, fSnap, sSnap] = await Promise.all([
      tx.get(db.collection(COL.instructorProfiles).doc(uid)),
      tx.get(workshopRef),
      tx.get(db.collection(COL.facilities).doc(facilityId)),
      tx.get(refs.slots(db, facilityId).doc(slotId)),
    ]);
    const workshop = data<Workshop>(wSnap);
    const facility = data<Facility>(fSnap);
    const slot = data<TimeSlot>(sSnap);
    decideRequestVenue(
      { profile: data<InstructorProfile>(profileSnap), workshop, facility, slot },
      uid,
      args.now,
    );
    if (!workshop || !facility || !slot) throw new Error('unreachable: decideRequestVenue checked');
    tx.create(requestRef, {
      id: requestRef.id,
      workshopId,
      instructorId: uid,
      instructorName: args.instructorName,
      facilityId,
      facilityName: facility.name,
      partnerId: facility.partnerId,
      slotId,
      slotStartAt: slot.startAt,
      slotEndAt: slot.endAt,
      workshopSummary: {
        title: workshop.title,
        description: workshop.description,
        category: workshop.category,
        capacity: workshop.capacity,
        materials: workshop.materials,
      },
      status: 'PENDING',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(workshopRef, {
      status: 'PENDING_VENUE',
      activeVenueRequestId: requestRef.id,
      version: workshop.version + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
    notifyTx(db, tx, {
      userId: facility.partnerId,
      type: 'VENUE_REQUEST_NEW',
      title: 'New venue request',
      body: `${args.instructorName} requested ${facility.name} for "${workshop.title}".`,
      refPath: paths.venueRequest(requestRef.id),
    });
    return { requestId: requestRef.id };
  });
}

/** AWAITING_INFO -> PENDING with the instructor's reply; notifies the partner. */
export function respondToInfoTx(
  db: Firestore,
  args: { uid: string; requestId: string; message: string },
): Promise<void> {
  const ref = db.collection(COL.venueRequests).doc(args.requestId);
  return runTx(db, async (tx) => {
    const request = data<VenueRequest>(await tx.get(ref));
    decideRespondToInfo(request, args.uid);
    if (!request) return;
    tx.update(ref, {
      status: 'PENDING',
      infoResponse: args.message,
      updatedAt: FieldValue.serverTimestamp(),
    });
    notifyTx(db, tx, {
      userId: request.partnerId,
      type: 'VENUE_REQUEST_INFO',
      title: 'Instructor replied',
      body: `${request.instructorName} replied about "${request.workshopSummary.title}": ${args.message}`,
      refPath: paths.venueRequest(request.id),
    });
  });
}

/** PENDING / AWAITING_INFO -> WITHDRAWN; the workshop returns to DRAFT. */
export function withdrawRequestTx(
  db: Firestore,
  args: { uid: string; requestId: string },
): Promise<void> {
  const ref = db.collection(COL.venueRequests).doc(args.requestId);
  return runTx(db, async (tx) => {
    const request = data<VenueRequest>(await tx.get(ref));
    const wRef = request ? db.collection(COL.workshops).doc(request.workshopId) : undefined;
    const workshop = wRef ? data<Workshop>(await tx.get(wRef)) : undefined;
    decideWithdrawRequest(request, args.uid);
    tx.update(ref, { status: 'WITHDRAWN', updatedAt: FieldValue.serverTimestamp() });
    if (
      wRef &&
      workshop?.activeVenueRequestId === args.requestId &&
      workshop.status === 'PENDING_VENUE'
    ) {
      tx.update(wRef, {
        status: 'DRAFT',
        activeVenueRequestId: null,
        version: workshop.version + 1,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
}
