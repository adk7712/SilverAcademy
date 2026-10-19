// Admin workshop writes (UC #5-2 edit, #5-3 status/cancel). Admin SDK only; rules live in ../controller.
// Bookings and attendance are never deleted: archive keeps them, cancel only flips CONFIRMED -> CANCELLED.
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type {
  Booking,
  TimeSlot,
  VenueRequest,
  VolunteerAssignment,
  Workshop,
} from '@silveracademy/shared';
import { COL, notifyTx, paths, runTx, writeAuditTx, type Caller } from '../../common';
import { decideAdminEdit, type AdminEditPatch } from '../controller/decideAdminEdit';
import { decideAdminStatus, type AdminStatusInput } from '../controller/decideAdminStatus';
import { archiveNotice, cancellationNotice } from '../controller/cancellationNotices';

type AdminCaller = Pick<Caller, 'uid'>;

/** Edits title / description / category / materials / capacity with stale-version and capacity rules. */
export async function adminUpdateWorkshop(
  db: Firestore,
  caller: AdminCaller,
  input: { workshopId: string; patch: AdminEditPatch; expectedVersion: number },
  now: Date,
): Promise<{ version: number }> {
  const ref = db.collection(COL.workshops).doc(input.workshopId);
  return runTx(db, async (tx) => {
    const snap = await tx.get(ref);
    const d = decideAdminEdit(
      snap.exists ? (snap.data() as Workshop) : undefined,
      input.patch,
      input.expectedVersion,
      now,
    );
    if (d.changedFields.length === 0) return { version: d.version };
    tx.update(ref, { ...d.changes, version: d.version, updatedAt: FieldValue.serverTimestamp() });
    writeAuditTx(db, tx, {
      actorId: caller.uid,
      actorRole: 'ADMIN',
      action: 'WORKSHOP_ADMIN_EDIT',
      outcome: 'SUCCESS',
      targetType: 'WORKSHOP',
      targetId: input.workshopId,
      details: { fields: d.changedFields.join(',') },
    });
    return { version: d.version };
  });
}

/**
 * Archive / unarchive / complete / cancel. CANCELLED (arch 4.7) in one transaction: workshop CANCELLED +
 * `cancelReason`, CONFIRMED bookings -> CANCELLED (`seatsTaken` reduced), slot back to AVAILABLE, a pending venue
 * request withdrawn, notifications to learners / assigned volunteers / the instructor, audit.
 * `affectedBookings` = bookings cancelled (0 for other actions).
 */
export async function adminSetStatus(
  db: Firestore,
  caller: AdminCaller,
  input: AdminStatusInput & { workshopId: string; incidentId?: string | undefined },
  now: Date,
): Promise<{ status: Workshop['status']; version: number; affectedBookings: number }> {
  const wRef = db.collection(COL.workshops).doc(input.workshopId);
  return runTx(db, async (tx) => {
    const wSnap = await tx.get(wRef);
    const workshop = wSnap.exists ? (wSnap.data() as Workshop) : undefined;
    const d = decideAdminStatus(workshop, input, now);
    const w = workshop as Workshop;

    let bookings: Booking[] = [];
    let volunteers: VolunteerAssignment[] = [];
    let slot: { ref: FirebaseFirestore.DocumentReference; data: TimeSlot } | undefined;
    let request: { ref: FirebaseFirestore.DocumentReference; data: VenueRequest } | undefined;
    let notifyBookings: Booking[] = [];
    if (d.cancel || d.notifyLearners) {
      const [bSnap, vSnap] = await Promise.all([
        tx.get(
          db
            .collection(COL.bookings)
            .where('workshopId', '==', w.id)
            .where('status', '==', 'CONFIRMED'),
        ),
        tx.get(
          db
            .collection(COL.volunteerAssignments)
            .where('workshopId', '==', w.id)
            .where('status', '==', 'ASSIGNED'),
        ),
      ]);
      if (d.cancel) {
        bookings = bSnap.docs.map((s) => s.data() as Booking);
        volunteers = vSnap.docs.map((s) => s.data() as VolunteerAssignment);
      } else {
        notifyBookings = bSnap.docs.map((s) => s.data() as Booking);
      }
    }
    if (d.cancel || d.withdrawRequest) {
      if (d.cancel && w.venue && w.slotId) {
        const ref = db.doc(paths.slot(w.venue.facilityId, w.slotId));
        const s = await tx.get(ref);
        if (s.exists) slot = { ref, data: s.data() as TimeSlot };
      }
      if (w.activeVenueRequestId) {
        const ref = db.doc(paths.venueRequest(w.activeVenueRequestId));
        const s = await tx.get(ref);
        if (s.exists) request = { ref, data: s.data() as VenueRequest };
      }
    }

    tx.update(wRef, {
      status: d.nextStatus,
      statusBeforeArchive: d.statusBeforeArchive ?? FieldValue.delete(),
      ...(d.cancel
        ? {
            cancelReason: d.cancelReason,
            seatsTaken: Math.max(0, w.seatsTaken - bookings.length),
            activeVenueRequestId: null,
          }
        : {}),
      ...(d.withdrawRequest ? { activeVenueRequestId: null } : {}),
      version: d.version,
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (d.cancel) {
      const reason = d.cancelReason ?? '';
      const notify = (userId: string, audience: Parameters<typeof cancellationNotice>[0]) =>
        notifyTx(db, tx, {
          userId,
          type: 'WORKSHOP_CANCELLED',
          ...cancellationNotice(audience, w.title, reason),
          refPath: paths.workshop(w.id),
        });
      for (const b of bookings) {
        tx.update(db.collection(COL.bookings).doc(b.id), {
          status: 'CANCELLED',
          updatedAt: FieldValue.serverTimestamp(),
        });
        notify(b.learnerId, 'LEARNER');
      }
      for (const v of volunteers) notify(v.volunteerId, 'VOLUNTEER');
      notify(w.instructorId, 'INSTRUCTOR');
      if (slot && slot.data.bookedWorkshopId === w.id) {
        tx.update(slot.ref, {
          status: 'AVAILABLE',
          bookedWorkshopId: null,
          bookedRequestId: null,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
    if (
      d.withdrawRequest &&
      request &&
      ['PENDING', 'AWAITING_INFO'].includes(request.data.status)
    ) {
      tx.update(request.ref, { status: 'WITHDRAWN', updatedAt: FieldValue.serverTimestamp() });
    }
    for (const b of notifyBookings) {
      notifyTx(db, tx, {
        userId: b.learnerId,
        type: 'WORKSHOP_CANCELLED',
        ...archiveNotice(w.title),
        refPath: paths.workshop(w.id),
      });
    }

    writeAuditTx(db, tx, {
      actorId: caller.uid,
      actorRole: 'ADMIN',
      action: 'WORKSHOP_STATUS_CHANGE',
      outcome: 'SUCCESS',
      targetType: 'WORKSHOP',
      targetId: w.id,
      details: {
        from: w.status,
        to: d.nextStatus,
        affectedBookings: bookings.length,
        ...(d.cancelReason ? { reason: d.cancelReason } : {}),
        ...(input.incidentId ? { incidentId: input.incidentId } : {}),
      },
    });
    return { status: d.nextStatus, version: d.version, affectedBookings: bookings.length };
  });
}
