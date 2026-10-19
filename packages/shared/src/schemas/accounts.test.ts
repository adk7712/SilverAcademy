// Tests for auth, users, bookings, attendance and reports schemas (UC #0-1 #0-2 #2-2 #1-4 #2-5 #5-1 #5-3 #5-5).
import { CALLABLES, CALLABLE_NAMES } from '../callables';
import * as au from './auth';
import * as u from './users';
import * as b from './bookings';
import * as a from './attendance';
import * as r from './reports';
import { toFieldErrors } from './common';
import { createWorkshopInput } from './workshops';
import { bad, ok } from './schemaTestHelpers';

describe('registry', () => {
  it('has every functions.md callable with input and output schemas', () => {
    expect(CALLABLE_NAMES).toHaveLength(33);
    for (const n of CALLABLE_NAMES) {
      expect(CALLABLES[n].input).toBeDefined();
      expect(CALLABLES[n].output).toBeDefined();
      expect(n).toMatch(/^[a-z]+-[a-zA-Z]+$/);
    }
  });
});

describe('auth', () => {
  it('exchangeSingpass', () => {
    ok(au.exchangeSingpassInput, { assertion: 'mock:senior-62', registerAs: 'VOLUNTEER' });
    bad(au.exchangeSingpassInput, { assertion: '' });
    bad(au.exchangeSingpassInput, { assertion: 'x', registerAs: 'ADMIN' });
  });
  it('recordStaffLogin', () => {
    ok(au.recordStaffLoginInput, { userId: 'admin01', outcome: 'BLOCKED' });
    bad(au.recordStaffLoginInput, { userId: 'admin01', outcome: 'MAYBE' });
    ok(au.recordStaffLoginOutput, {});
  });
});

describe('users', () => {
  it('leaves REASON_REQUIRED for REJECT to the handler (schema accepts)', () => {
    ok(u.reviewInstructorProfileInput, { uid: 'a', decision: 'APPROVE', expectedVersion: 1 });
    ok(u.reviewInstructorProfileInput, { uid: 'a', decision: 'REJECT', expectedVersion: 1 });
    ok(u.reviewInstructorProfileInput, {
      uid: 'a',
      decision: 'REQUEST_REVISION',
      reason: 'x',
      expectedVersion: 1,
    });
  });
  it('leaves REASON_REQUIRED for FLAG/SUSPEND to the handler (schema accepts)', () => {
    ok(u.setAccountStatusInput, { uid: 'a', action: 'SUSPEND', expectedVersion: 0 });
    ok(u.setAccountStatusInput, { uid: 'a', action: 'FLAG', expectedVersion: 0 });
    bad(u.setAccountStatusInput, { uid: 'a', action: 'BAN', expectedVersion: 0 });
    ok(u.setAccountStatusInput, { uid: 'a', action: 'REACTIVATE', expectedVersion: 0 });
  });
  it('preferences accept only allowed font scales', () => {
    ok(u.updatePreferencesInput, { fontScale: 1.25, lastMode: 'LEARNER' });
    bad(u.updatePreferencesInput, { fontScale: 2 });
    bad(u.updatePreferencesInput, { other: 1 });
  });
  it('staff account needs orgName for COMMUNITY_PARTNER and a long-enough password', () => {
    const base = { userId: 'partner02', displayName: 'P', initialPassword: 'password1' };
    bad(u.createStaffAccountInput, { ...base, role: 'COMMUNITY_PARTNER' });
    ok(u.createStaffAccountInput, { ...base, role: 'COMMUNITY_PARTNER', orgName: 'CC' });
    ok(u.createStaffAccountInput, { ...base, role: 'ADMIN' });
    bad(u.createStaffAccountInput, { ...base, role: 'ADMIN', initialPassword: 'short' });
  });
  it('instructor profile needs expertise', () => {
    bad(u.submitInstructorProfileInput, { bio: 'b', expertise: [], experienceYears: 3 });
    ok(u.submitInstructorProfileInput, { bio: 'b', expertise: ['MUSIC'], experienceYears: 3 });
  });
});

describe('bookings and attendance', () => {
  it('bookWorkshop input', () => {
    ok(b.bookWorkshopInput, { workshopId: 'w' });
    bad(b.bookWorkshopInput, {});
  });
  it('bookWorkshop output validates ISO times', () => {
    const snap = {
      title: 't',
      startAt: '2026-11-01T10:00:00+08:00',
      endAt: '2026-11-01T12:00:00Z',
      venueName: 'v',
      venueAddress: 'a',
      instructorName: 'i',
    };
    const out = {
      bookingId: 'w_u',
      ticketCode: 'ABCD1234',
      qrPayload: 'SA1.x.y',
      seatsRemaining: 3,
      workshopSnapshot: snap,
    };
    ok(b.bookWorkshopOutput, out);
    bad(b.bookWorkshopOutput, { ...out, workshopSnapshot: { ...snap, startAt: 'tomorrow' } });
  });
  it('recordAttendance takes exactly one of qrPayload or ticketCode', () => {
    ok(a.recordAttendanceInput, { workshopId: 'w', qrPayload: 'SA1.a.b' });
    ok(a.recordAttendanceInput, { workshopId: 'w', ticketCode: 'ABCD-1234' });
    bad(a.recordAttendanceInput, { workshopId: 'w' });
    bad(a.recordAttendanceInput, { workshopId: 'w', qrPayload: 'a', ticketCode: 'b' });
  });
});

describe('reports', () => {
  it('submitReport bounds', () => {
    const base = { category: 'WORKSHOP', description: 'long enough text' };
    ok(r.submitReportInput, base);
    bad(r.submitReportInput, { ...base, description: 'short' });
    bad(r.submitReportInput, { ...base, attachmentPaths: ['a', 'b', 'c', 'd'] });
    ok(r.submitReportOutput, { referenceNo: 'SA-261019-ABCDE' });
    bad(r.submitReportOutput, { referenceNo: 'SA-261019-ABCDI' });
  });
  it('updateIncident accepts missing text (handler raises REASON_REQUIRED)', () => {
    const base = { incidentId: 'i', expectedVersion: 1 };
    ok(r.updateIncidentInput, { ...base, status: 'AWAITING_INFO' });
    ok(r.updateIncidentInput, { ...base, status: 'RESOLVED' });
    ok(r.updateIncidentInput, { ...base, status: 'RESOLVED', resolution: 'done' });
    ok(r.updateIncidentInput, { ...base, status: 'UNDER_REVIEW' });
  });
});

describe('toFieldErrors', () => {
  it('groups issues by path', () => {
    const res = createWorkshopInput.safeParse({
      title: '',
      description: 'd',
      category: 'MUSIC',
      capacity: 0,
      materials: '',
      needsVolunteers: false,
      volunteerSlots: 0,
    });
    if (res.success) throw new Error('expected failure');
    expect(Object.keys(toFieldErrors(res.error)).sort()).toEqual(['capacity', 'title']);
  });
});
