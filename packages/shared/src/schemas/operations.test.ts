// Tests for workshops, venues and vouchers schemas (UC #1-2 #1-3 #4-1 #4-2 #1-7 #5-2 #5-4).
import { MAX_UPLOAD_ROWS } from '../constants';
import * as w from './workshops';
import * as ve from './venues';
import * as v from './vouchers';
import { bad, ok } from './schemaTestHelpers';

const workshop = {
  title: 'Phone basics',
  description: 'Learn',
  category: 'DIGITAL_SKILLS',
  capacity: 10,
  materials: '',
  needsVolunteers: false,
  volunteerSlots: 0,
};

describe('workshops', () => {
  it('create enforces capacity and volunteer slot rules', () => {
    ok(w.createWorkshopInput, workshop);
    bad(w.createWorkshopInput, { ...workshop, capacity: 0 });
    bad(w.createWorkshopInput, { ...workshop, capacity: 51 });
    bad(w.createWorkshopInput, { ...workshop, title: 'x'.repeat(81) });
    bad(w.createWorkshopInput, { ...workshop, volunteerSlots: 2 });
    ok(w.createWorkshopInput, { ...workshop, needsVolunteers: true, volunteerSlots: 2 });
    bad(w.createWorkshopInput, { ...workshop, needsVolunteers: true, volunteerSlots: 6 });
  });
  it('update patch is partial and strict', () => {
    ok(w.updateWorkshopInput, { workshopId: 'w', patch: { title: 'New' } });
    bad(w.updateWorkshopInput, { workshopId: 'w', patch: { status: 'OPEN' } });
  });
  it('admin update cannot touch volunteer fields', () => {
    ok(w.adminUpdateWorkshopInput, { workshopId: 'w', patch: { capacity: 5 }, expectedVersion: 2 });
    bad(w.adminUpdateWorkshopInput, {
      workshopId: 'w',
      patch: { needsVolunteers: true },
      expectedVersion: 2,
    });
  });
  it('admin set status accepts CANCELLED without reason (handler raises REASON_REQUIRED)', () => {
    const base = { workshopId: 'w', expectedVersion: 1 };
    ok(w.adminSetStatusInput, { ...base, status: 'CANCELLED' });
    ok(w.adminSetStatusInput, { ...base, status: 'CANCELLED', reason: 'r', confirmImpact: true });
    ok(w.adminSetStatusInput, { ...base, status: 'UNARCHIVE' });
    bad(w.adminSetStatusInput, { ...base, status: 'OPEN' });
  });
  it('feedback bounds', () => {
    ok(w.submitFeedbackInput, { workshopId: 'w', rating: 5, tags: ['fun'] });
    bad(w.submitFeedbackInput, { workshopId: 'w', rating: 6 });
    bad(w.submitFeedbackInput, {
      workshopId: 'w',
      rating: 3,
      tags: ['1', '2', '3', '4', '5', '6'],
    });
    bad(w.submitFeedbackInput, { workshopId: 'w', rating: 3, comment: 'x'.repeat(1001) });
  });
});

describe('venues', () => {
  const facility = {
    name: 'CC',
    address: '1 Road',
    postalCode: '123456',
    lat: 1.3,
    lng: 103.8,
    capacity: 30,
    amenities: [],
  };
  it('facility postal code is 6 digits', () => {
    ok(ve.upsertFacilityInput, facility);
    bad(ve.upsertFacilityInput, { ...facility, postalCode: '12345' });
    bad(ve.upsertFacilityInput, { ...facility, postalCode: '12345a' });
  });
  it('slot status excludes BOOKED and times must be ISO', () => {
    const slot = {
      facilityId: 'f',
      startAt: '2026-11-01T10:00:00Z',
      endAt: '2026-11-01T12:00:00Z',
      status: 'AVAILABLE',
    };
    ok(ve.upsertSlotInput, slot);
    bad(ve.upsertSlotInput, { ...slot, status: 'BOOKED' });
    bad(ve.upsertSlotInput, { ...slot, startAt: '2026-11-01' });
  });
  it('REQUEST_INFO without message passes the schema (handler raises REASON_REQUIRED)', () => {
    ok(ve.decideVenueRequestInput, { requestId: 'r', decision: 'REQUEST_INFO' });
    ok(ve.decideVenueRequestInput, { requestId: 'r', decision: 'REQUEST_INFO', message: 'm' });
    ok(ve.decideVenueRequestInput, { requestId: 'r', decision: 'REJECT' });
  });
});

describe('vouchers', () => {
  const row = { provider: 'NTUC', denomination: 10, code: 'ABCD-1234' };
  it('upload rows need at least one (over-limit is a handler UPLOAD_TOO_LARGE)', () => {
    bad(v.uploadVouchersInput, { rows: [] });
    ok(v.uploadVouchersInput, { rows: [row] });
    ok(v.uploadVouchersInput, { rows: Array(MAX_UPLOAD_ROWS).fill(row) });
    ok(v.uploadVouchersInput, { rows: Array(MAX_UPLOAD_ROWS + 1).fill(row) });
  });
  it('setVoucherStatus allows only INVALID/REMOVED (missing reason is a handler error)', () => {
    ok(v.setVoucherStatusInput, { voucherId: 'v', status: 'REMOVED', reason: 'bad' });
    ok(v.setVoucherStatusInput, { voucherId: 'v', status: 'REMOVED' });
    bad(v.setVoucherStatusInput, { voucherId: 'v', status: 'CLAIMED', reason: 'x' });
  });
  it('listInventory limit capped', () => {
    ok(v.listInventoryInput, { limit: 100 });
    bad(v.listInventoryInput, { limit: 101 });
  });
  it('listMyVouchers takes empty object', () => {
    ok(v.listMyVouchersInput, {});
    bad(v.listMyVouchersInput, { x: 1 });
  });
});
