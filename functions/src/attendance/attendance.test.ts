// Unit tests for the pure attendance rules (UC #1-4, #3-4): no Firebase, no emulator.
import type {
  Attendance,
  Booking,
  Role,
  TimestampLike,
  User,
  VolunteerAssignment,
  Workshop,
} from '@silveracademy/shared';
import type { Firestore } from 'firebase-admin/firestore';
import { fixedClock, runCallable } from '../common';
import {
  decideAttendance,
  isSessionActive,
  methodOf,
  type AttendanceRequest,
  type AttendanceSnapshots,
} from './controller/decideAttendance';

const ts = (iso: string): TimestampLike => {
  const d = new Date(iso);
  return { seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0, toDate: () => d };
};
const START = '2026-10-20T02:00:00Z';
const END = '2026-10-20T04:00:00Z';
const NOW = new Date('2026-10-20T02:10:00Z');
const W = 'ws-1';
const B = `${W}_learner1`;

const workshop = (over: Partial<Workshop> = {}): Workshop =>
  ({
    id: W,
    instructorId: 'si1',
    title: 'Watercolour',
    status: 'OPEN',
    startAt: ts(START),
    endAt: ts(END),
    attendedCount: 0,
    ...over,
  }) as Workshop;
const booking = (over: Partial<Booking> = {}): Booking =>
  ({
    id: B,
    workshopId: W,
    learnerId: 'learner1',
    learnerName: 'Lena',
    status: 'CONFIRMED',
    ...over,
  }) as Booking;
const assignment = (over: Partial<VolunteerAssignment> = {}): VolunteerAssignment =>
  ({
    id: `${W}_vol1`,
    workshopId: W,
    volunteerId: 'vol1',
    status: 'ASSIGNED',
    ...over,
  }) as VolunteerAssignment;

const snaps = (over: Partial<AttendanceSnapshots> = {}): AttendanceSnapshots => ({
  workshop: workshop(),
  booking: booking(),
  attendance: undefined,
  assignment: undefined,
  ...over,
});
const req = (over: Partial<AttendanceRequest> = {}): AttendanceRequest => ({
  workshopId: W,
  bookingId: B,
  method: 'QR',
  scanner: { uid: 'si1', roles: ['LEARNER', 'SENIOR_INSTRUCTOR'] },
  ignoreCheckInWindow: false,
  ...over,
});
const volunteer = { uid: 'vol1', roles: ['VOLUNTEER'] as Role[] };
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return 'NO_ERROR';
};

describe('methodOf', () => {
  it('QR for qrPayload, MANUAL for ticketCode', () => {
    expect(methodOf({ qrPayload: 'x' })).toBe('QR');
    expect(methodOf({ ticketCode: 'x' })).toBe('MANUAL');
  });
});

describe('decideAttendance: success', () => {
  it('instructor scan: SI role, 1 point to the instructor', () => {
    const d = decideAttendance(snaps(), req(), NOW);
    expect(d).toMatchObject({
      scannedByRole: 'SENIOR_INSTRUCTOR',
      instructorId: 'si1',
      pointsAwarded: 1,
      learnerName: 'Lena',
      workshopTitle: 'Watercolour',
    });
    expect(d.record).toEqual({
      bookingId: B,
      workshopId: W,
      learnerId: 'learner1',
      learnerName: 'Lena',
      instructorId: 'si1',
      scannedBy: 'si1',
      scannedByRole: 'SENIOR_INSTRUCTOR',
      method: 'QR',
      pointsAwarded: 1,
    });
  });
  it('assigned volunteer scan: points still go to the instructor (ADR-010)', () => {
    const d = decideAttendance(
      snaps({ assignment: assignment() }),
      req({ scanner: volunteer, method: 'MANUAL' }),
      NOW,
    );
    expect(d.scannedByRole).toBe('VOLUNTEER');
    expect(d.instructorId).toBe('si1');
    expect(d.record).toMatchObject({ scannedBy: 'vol1', method: 'MANUAL', instructorId: 'si1' });
  });
  it('COMPLETED workshop inside the window is still active', () => {
    expect(
      codeOf(() =>
        decideAttendance(snaps({ workshop: workshop({ status: 'COMPLETED' }) }), req(), NOW),
      ),
    ).toBe('NO_ERROR');
  });
});

describe('decideAttendance: errors', () => {
  const code = (s: Partial<AttendanceSnapshots>, r: Partial<AttendanceRequest> = {}, now = NOW) =>
    codeOf(() => decideAttendance(snaps(s), req(r), now));

  it('missing workshop -> NOT_FOUND', () => {
    expect(code({ workshop: undefined })).toBe('NOT_FOUND');
  });
  it('not the instructor and not assigned -> NOT_AUTHORISED_FOR_WORKSHOP', () => {
    expect(code({}, { scanner: { uid: 'si2', roles: ['SENIOR_INSTRUCTOR'] } })).toBe(
      'NOT_AUTHORISED_FOR_WORKSHOP',
    );
    expect(code({}, { scanner: volunteer })).toBe('NOT_AUTHORISED_FOR_WORKSHOP');
    expect(code({ assignment: assignment({ status: 'WITHDRAWN' }) }, { scanner: volunteer })).toBe(
      'NOT_AUTHORISED_FOR_WORKSHOP',
    );
    expect(code({ assignment: assignment({ workshopId: 'other' }) }, { scanner: volunteer })).toBe(
      'NOT_AUTHORISED_FOR_WORKSHOP',
    );
  });
  it('assignment without VOLUNTEER role -> NOT_AUTHORISED_FOR_WORKSHOP', () => {
    expect(
      code({ assignment: assignment() }, { scanner: { uid: 'vol1', roles: ['LEARNER'] } }),
    ).toBe('NOT_AUTHORISED_FOR_WORKSHOP');
  });
  it('workshop not OPEN/COMPLETED -> SESSION_NOT_ACTIVE', () => {
    for (const status of ['DRAFT', 'PENDING_VENUE', 'CANCELLED', 'ARCHIVED'] as const) {
      expect(code({ workshop: workshop({ status }) }, { ignoreCheckInWindow: true })).toBe(
        'SESSION_NOT_ACTIVE',
      );
    }
  });
  it('check-in window: opens 60 min before start, closes 30 min after end (inclusive)', () => {
    expect(code({}, {}, new Date('2026-10-20T00:59:59Z'))).toBe('SESSION_NOT_ACTIVE');
    expect(code({}, {}, new Date('2026-10-20T01:00:00Z'))).toBe('NO_ERROR');
    expect(code({}, {}, new Date('2026-10-20T04:30:00Z'))).toBe('NO_ERROR');
    expect(code({}, {}, new Date('2026-10-20T04:30:01Z'))).toBe('SESSION_NOT_ACTIVE');
  });
  it('demo override ignores the window but not the status', () => {
    const late = new Date('2026-12-01T00:00:00Z');
    expect(code({}, { ignoreCheckInWindow: true }, late)).toBe('NO_ERROR');
    expect(isSessionActive(workshop({ startAt: null, endAt: null }), NOW, false)).toBe(false);
    expect(isSessionActive(workshop({ startAt: null, endAt: null }), NOW, true)).toBe(true);
  });
  it('missing or cancelled booking -> NO_BOOKING', () => {
    expect(code({ booking: undefined })).toBe('NO_BOOKING');
    expect(code({ booking: booking({ status: 'CANCELLED' }) })).toBe('NO_BOOKING');
  });
  it('booking for another workshop -> WRONG_WORKSHOP', () => {
    expect(code({ booking: booking({ workshopId: 'ws-2' }) })).toBe('WRONG_WORKSHOP');
  });
  it('already attended -> ALREADY_ATTENDED with learnerName and attendedAt', () => {
    const at = '2026-10-20T02:05:00.000Z';
    const attendance = { createdAt: ts(at) } as Attendance;
    try {
      decideAttendance(snaps({ attendance }), req(), NOW);
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toMatchObject({
        code: 'ALREADY_ATTENDED',
        details: { learnerName: 'Lena', attendedAt: at },
      });
    }
    expect(code({ booking: booking({ status: 'ATTENDED', attendedAt: ts(at) }) })).toBe(
      'ALREADY_ATTENDED',
    );
  });
});

describe('decideAttendance: check order (architecture.md 4.3)', () => {
  const allBad: Partial<AttendanceSnapshots> = {
    workshop: workshop({ status: 'DRAFT' }),
    booking: booking({ workshopId: 'ws-2', status: 'ATTENDED' }),
    attendance: { createdAt: ts(START) } as Attendance,
  };
  const code = (s: Partial<AttendanceSnapshots>, r: Partial<AttendanceRequest> = {}) =>
    codeOf(() => decideAttendance(snaps({ ...allBad, ...s }), req(r), NOW));

  it('NOT_FOUND > NOT_AUTHORISED > SESSION_NOT_ACTIVE > NO_BOOKING > WRONG_WORKSHOP > ALREADY_ATTENDED', () => {
    expect(code({ workshop: undefined }, { scanner: volunteer })).toBe('NOT_FOUND');
    expect(code({}, { scanner: volunteer })).toBe('NOT_AUTHORISED_FOR_WORKSHOP');
    expect(code({ booking: undefined })).toBe('SESSION_NOT_ACTIVE');
    expect(code({ workshop: workshop(), booking: undefined })).toBe('NO_BOOKING');
    expect(code({ workshop: workshop() })).toBe('WRONG_WORKSHOP');
    expect(code({ workshop: workshop(), booking: booking({ status: 'ATTENDED' }) })).toBe(
      'ALREADY_ATTENDED',
    );
  });
});

describe('attendance-recordAttendance wrapper', () => {
  const user = (roles: Role[]) => ({ uid: 'u', roles, status: 'ACTIVE' }) as unknown as User;
  const run = (roles: Role[], data: unknown) =>
    runCallable(
      {
        name: 'attendance-recordAttendance',
        access: { roles: ['SENIOR_INSTRUCTOR', 'VOLUNTEER'] },
        handler: async () => {
          throw new Error('handler must not run');
        },
      },
      { auth: { uid: 'u' }, data },
      {
        db: {} as Firestore,
        clock: fixedClock(NOW.toISOString()),
        loadUser: async () => user(roles),
      },
    );

  it('learners and admins are refused before the handler', async () => {
    await expect(run(['LEARNER'], { workshopId: W, qrPayload: 'x' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    await expect(run(['ADMIN'], { workshopId: W, qrPayload: 'x' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });
  it('both qrPayload and ticketCode -> INVALID_INPUT', async () => {
    await expect(
      run(['VOLUNTEER'], { workshopId: W, qrPayload: 'x', ticketCode: 'y' }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});
