// UC #1-4, #3-4 ScanAttendance: the attendance transaction (architecture.md 4.2, 4.3).
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import type {
  Attendance,
  AttendanceMethod,
  Role,
  VolunteerAssignment,
} from '@silveracademy/shared';
import {
  COL,
  ids,
  refs,
  runTx,
  writeAuditTx,
  writeLedgerTx,
  type CallableResultOf,
  type WalletSnapshot,
} from '../../common';
import { decideAttendance } from '../controller/decideAttendance';

export interface RecordAttendanceArgs {
  workshopId: string;
  bookingId: string;
  method: AttendanceMethod;
  scanner: { uid: string; roles: readonly Role[] };
  /** Learner who checked in with the session code; `scanner` is then the instructor who set it. */
  learnerId?: string;
  ignoreCheckInWindow: boolean;
  now: Date;
}

/**
 * One transaction: read workshop, booking, attendance, assignment (non-instructor only), instructor wallet;
 * decide; create attendance/{bookingId} (once-only), mark booking ATTENDED, bump attendedCount, earn ledger + wallet,
 * audit. Concurrent scans of one ticket collide on the attendance doc; the loser re-runs and gets ALREADY_ATTENDED.
 */
export async function recordAttendanceTx(
  db: Firestore,
  args: RecordAttendanceArgs,
): Promise<CallableResultOf<'attendance-recordAttendance'>> {
  const workshopRef = refs.workshops(db).doc(args.workshopId);
  const bookingRef = refs.bookings(db).doc(args.bookingId);
  const attendanceRef = refs.raw(db, COL.attendance).doc(args.bookingId);
  return runTx(db, async (tx) => {
    const [workshopSnap, bookingSnap, attendanceSnap] = await Promise.all([
      tx.get(workshopRef),
      tx.get(bookingRef),
      tx.get(attendanceRef),
    ]);
    const workshop = workshopSnap.data();
    const needsAssignment = !!workshop && workshop.instructorId !== args.scanner.uid;
    const assignmentSnap = needsAssignment
      ? await tx.get(
          refs
            .raw(db, COL.volunteerAssignments)
            .doc(ids.volunteerAssignment(args.workshopId, args.scanner.uid)),
        )
      : undefined;
    const walletSnap = workshop
      ? await tx.get(refs.wallets(db).doc(workshop.instructorId))
      : undefined;

    const decision = decideAttendance(
      {
        workshop,
        booking: bookingSnap.data(),
        attendance: attendanceSnap.data() as Attendance | undefined,
        assignment: assignmentSnap?.data() as VolunteerAssignment | undefined,
      },
      args,
      args.now,
    );

    const at = Timestamp.fromDate(args.now);
    tx.create(attendanceRef, { ...decision.record, createdAt: at });
    tx.update(bookingRef, {
      status: 'ATTENDED',
      attendedAt: at,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(workshopRef, {
      attendedCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeLedgerTx(db, tx, decision.instructorId, walletSnap?.data() as WalletSnapshot | undefined, {
      entryId: ids.earnEntry(args.bookingId),
      type: 'EARN_ATTENDANCE',
      amount: decision.pointsAwarded,
      description: `Attendance: ${decision.workshopTitle}`,
      workshopId: args.workshopId,
      workshopTitle: decision.workshopTitle,
      bookingId: args.bookingId,
    });
    writeAuditTx(db, tx, {
      actorId: args.learnerId ?? args.scanner.uid,
      actorRole: args.learnerId ? 'LEARNER' : decision.scannedByRole,
      action: 'ATTENDANCE_RECORD',
      outcome: 'SUCCESS',
      targetType: 'WORKSHOP',
      targetId: args.workshopId,
      details: {
        bookingId: args.bookingId,
        method: args.method,
        pointsAwarded: decision.pointsAwarded,
        instructorId: decision.instructorId,
      },
    });
    return {
      bookingId: args.bookingId,
      learnerName: decision.learnerName,
      workshopTitle: decision.workshopTitle,
      attendedAt: args.now.toISOString(),
      method: args.method,
      pointsAwarded: decision.pointsAwarded,
    };
  });
}
