// Unit tests for the pure venue rules (UC #1-3, #4-1, #4-2): no Firebase, no emulator.
import type { Facility, TimeSlot, VenueRequest, Workshop } from '@silveracademy/shared';
import { decideUpsertFacility } from './controller/decideFacility';
import { decideDeleteSlot, decideUpsertSlot } from './controller/decideSlot';
import {
  decideRequestVenue,
  decideRespondToInfo,
  decideWithdrawRequest,
} from './controller/decideVenueRequest';
import { decideVenueDecision, type DecisionSnapshot } from './controller/decideVenueDecision';
import { planConflicts } from './controller/conflicts';

const NOW = new Date('2026-10-19T04:00:00Z');
const ts = (iso: string) => ({ seconds: 0, nanoseconds: 0, toDate: () => new Date(iso) });
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as { code?: string }).code;
  }
};

describe('decideUpsertFacility', () => {
  const sg = { lat: 1.3, lng: 103.8 };
  it('create vs update', () => {
    expect(decideUpsertFacility(undefined, false, sg, 'p1')).toBe('create');
    expect(decideUpsertFacility({ partnerId: 'p1' }, true, sg, 'p1')).toBe('update');
  });
  it('order: NOT_FOUND, NOT_FACILITY_OWNER, LOCATION_OUT_OF_BOUNDS', () => {
    expect(codeOf(() => decideUpsertFacility(undefined, true, sg, 'p1'))).toBe('NOT_FOUND');
    expect(codeOf(() => decideUpsertFacility({ partnerId: 'p2' }, true, sg, 'p1'))).toBe(
      'NOT_FACILITY_OWNER',
    );
    expect(codeOf(() => decideUpsertFacility(undefined, false, { lat: 51, lng: 0 }, 'p1'))).toBe(
      'LOCATION_OUT_OF_BOUNDS',
    );
  });
});

describe('decideUpsertSlot', () => {
  const base = {
    facility: { partnerId: 'p1' },
    slotId: undefined as string | undefined,
    slot: undefined as Pick<TimeSlot, 'status' | 'startAt' | 'endAt'> | undefined,
    input: {
      startAt: '2026-10-25T02:00:00Z',
      endAt: '2026-10-25T04:00:00Z',
      status: 'AVAILABLE' as const,
    },
    siblings: [] as { id: string; startAt: Date; endAt: Date }[],
    uid: 'p1',
    now: NOW,
  };
  it('accepts a valid new slot', () => {
    expect(decideUpsertSlot(base)).toMatchObject({ status: 'AVAILABLE', conflictsRequests: false });
  });
  it('NOT_FOUND / NOT_FACILITY_OWNER', () => {
    expect(codeOf(() => decideUpsertSlot({ ...base, facility: undefined }))).toBe('NOT_FOUND');
    expect(codeOf(() => decideUpsertSlot({ ...base, uid: 'p2' }))).toBe('NOT_FACILITY_OWNER');
    expect(codeOf(() => decideUpsertSlot({ ...base, slotId: 's1' }))).toBe('NOT_FOUND');
  });
  it('BOOKED slots are locked, before time validation', () => {
    const slot = {
      status: 'BOOKED' as const,
      startAt: ts('2026-10-25T02:00:00Z'),
      endAt: ts('2026-10-25T04:00:00Z'),
    };
    const bad = { ...base.input, endAt: base.input.startAt };
    expect(codeOf(() => decideUpsertSlot({ ...base, slotId: 's1', slot, input: bad }))).toBe(
      'SLOT_BOOKED_LOCKED',
    );
  });
  it('INVALID_TIME_RANGE: end <= start, or longer than MAX_SLOT_HOURS', () => {
    const range = (startAt: string, endAt: string) => ({
      ...base,
      input: { ...base.input, startAt, endAt },
    });
    expect(
      codeOf(() => decideUpsertSlot(range('2026-10-25T04:00:00Z', '2026-10-25T04:00:00Z'))),
    ).toBe('INVALID_TIME_RANGE');
    expect(
      codeOf(() => decideUpsertSlot(range('2026-10-25T04:00:00Z', '2026-10-25T02:00:00Z'))),
    ).toBe('INVALID_TIME_RANGE');
    expect(
      codeOf(() => decideUpsertSlot(range('2026-10-25T00:00:00Z', '2026-10-25T09:00:00Z'))),
    ).toBe('INVALID_TIME_RANGE');
  });
  it('SLOT_IN_PAST', () => {
    const input = { ...base.input, startAt: '2026-10-19T03:00:00Z', endAt: '2026-10-19T05:00:00Z' };
    expect(codeOf(() => decideUpsertSlot({ ...base, input }))).toBe('SLOT_IN_PAST');
  });
  it('SLOT_OVERLAP ignores the slot being edited and touching ends', () => {
    const other = {
      id: 'x',
      startAt: new Date('2026-10-25T03:00:00Z'),
      endAt: new Date('2026-10-25T05:00:00Z'),
    };
    expect(codeOf(() => decideUpsertSlot({ ...base, siblings: [other] }))).toBe('SLOT_OVERLAP');
    expect(() =>
      decideUpsertSlot({
        ...base,
        siblings: [{ ...other, startAt: new Date('2026-10-25T04:00:00Z') }],
      }),
    ).not.toThrow();
    const self = {
      status: 'AVAILABLE' as const,
      startAt: ts('2026-10-25T03:00:00Z'),
      endAt: ts('2026-10-25T05:00:00Z'),
    };
    expect(() =>
      decideUpsertSlot({ ...base, slotId: 'x', slot: self, siblings: [other] }),
    ).not.toThrow();
  });
  it('flags request conflicts when an AVAILABLE slot leaves AVAILABLE or moves', () => {
    const slot = {
      status: 'AVAILABLE' as const,
      startAt: ts('2026-10-25T02:00:00Z'),
      endAt: ts('2026-10-25T04:00:00Z'),
    };
    const unavailable = { ...base.input, status: 'UNAVAILABLE' as const };
    expect(
      decideUpsertSlot({ ...base, slotId: 's', slot, input: unavailable }).conflictsRequests,
    ).toBe(true);
    const moved = { ...base.input, endAt: '2026-10-25T05:00:00Z' };
    expect(decideUpsertSlot({ ...base, slotId: 's', slot, input: moved }).conflictsRequests).toBe(
      true,
    );
    expect(decideUpsertSlot({ ...base, slotId: 's', slot }).conflictsRequests).toBe(false);
  });
});

describe('decideDeleteSlot', () => {
  it('order and BOOKED lock', () => {
    expect(codeOf(() => decideDeleteSlot(undefined, { status: 'AVAILABLE' }, 'p1'))).toBe(
      'NOT_FOUND',
    );
    expect(codeOf(() => decideDeleteSlot({ partnerId: 'p2' }, { status: 'AVAILABLE' }, 'p1'))).toBe(
      'NOT_FACILITY_OWNER',
    );
    expect(codeOf(() => decideDeleteSlot({ partnerId: 'p1' }, undefined, 'p1'))).toBe('NOT_FOUND');
    expect(codeOf(() => decideDeleteSlot({ partnerId: 'p1' }, { status: 'BOOKED' }, 'p1'))).toBe(
      'SLOT_BOOKED_LOCKED',
    );
    expect(() =>
      decideDeleteSlot({ partnerId: 'p1' }, { status: 'MAINTENANCE' }, 'p1'),
    ).not.toThrow();
  });
});

describe('decideRequestVenue', () => {
  const ok = {
    profile: { status: 'APPROVED' as const },
    workshop: {
      instructorId: 'u1',
      status: 'DRAFT' as Workshop['status'],
      activeVenueRequestId: null as string | null,
      capacity: 10,
    },
    facility: { capacity: 20 },
    slot: { status: 'AVAILABLE' as TimeSlot['status'], startAt: ts('2026-10-25T02:00:00Z') },
  };
  const run = (over: Partial<typeof ok>) => () => decideRequestVenue({ ...ok, ...over }, 'u1', NOW);
  it('accepts a valid request', () => expect(run({})).not.toThrow());
  it('PROFILE_NOT_APPROVED first', () => {
    expect(codeOf(run({ profile: { status: 'PENDING' as never }, workshop: undefined }))).toBe(
      'PROFILE_NOT_APPROVED',
    );
  });
  it('NOT_FOUND / PERMISSION_DENIED', () => {
    expect(codeOf(run({ workshop: undefined }))).toBe('NOT_FOUND');
    expect(codeOf(run({ slot: undefined }))).toBe('NOT_FOUND');
    expect(codeOf(run({ workshop: { ...ok.workshop, instructorId: 'u2' } }))).toBe(
      'PERMISSION_DENIED',
    );
  });
  it('VENUE_REQUEST_EXISTS vs WORKSHOP_NOT_EDITABLE', () => {
    expect(
      codeOf(
        run({ workshop: { ...ok.workshop, status: 'PENDING_VENUE', activeVenueRequestId: 'r' } }),
      ),
    ).toBe('VENUE_REQUEST_EXISTS');
    expect(codeOf(run({ workshop: { ...ok.workshop, status: 'OPEN' } }))).toBe(
      'WORKSHOP_NOT_EDITABLE',
    );
  });
  it('SLOT_UNAVAILABLE / SLOT_IN_PAST (lead time) / VENUE_TOO_SMALL', () => {
    expect(codeOf(run({ slot: { ...ok.slot, status: 'BOOKED' } }))).toBe('SLOT_UNAVAILABLE');
    expect(codeOf(run({ slot: { ...ok.slot, startAt: ts('2026-10-19T04:30:00Z') } }))).toBe(
      'SLOT_IN_PAST',
    );
    expect(codeOf(run({ facility: { capacity: 5 } }))).toBe('VENUE_TOO_SMALL');
  });
});

describe('decideRespondToInfo / decideWithdrawRequest', () => {
  it('respond needs AWAITING_INFO and the owner', () => {
    expect(codeOf(() => decideRespondToInfo(undefined, 'u1'))).toBe('NOT_FOUND');
    expect(
      codeOf(() => decideRespondToInfo({ instructorId: 'u2', status: 'AWAITING_INFO' }, 'u1')),
    ).toBe('PERMISSION_DENIED');
    expect(codeOf(() => decideRespondToInfo({ instructorId: 'u1', status: 'PENDING' }, 'u1'))).toBe(
      'REQUEST_NOT_PENDING',
    );
    expect(() =>
      decideRespondToInfo({ instructorId: 'u1', status: 'AWAITING_INFO' }, 'u1'),
    ).not.toThrow();
  });
  it('withdraw works for PENDING and AWAITING_INFO only', () => {
    for (const status of ['PENDING', 'AWAITING_INFO'] as const) {
      expect(() => decideWithdrawRequest({ instructorId: 'u1', status }, 'u1')).not.toThrow();
    }
    for (const status of ['APPROVED', 'REJECTED', 'CONFLICTED', 'WITHDRAWN'] as const) {
      expect(codeOf(() => decideWithdrawRequest({ instructorId: 'u1', status }, 'u1'))).toBe(
        'REQUEST_NOT_PENDING',
      );
    }
    expect(
      codeOf(() => decideWithdrawRequest({ instructorId: 'u2', status: 'PENDING' }, 'u1')),
    ).toBe('PERMISSION_DENIED');
  });
});

const request = (over: Partial<VenueRequest> = {}) =>
  ({
    id: 'r1',
    workshopId: 'w1',
    instructorId: 'u1',
    instructorName: 'Ann',
    facilityId: 'f1',
    facilityName: 'Hall',
    partnerId: 'p1',
    slotId: 's1',
    status: 'PENDING',
    workshopSummary: { title: 'T' },
    ...over,
  }) as VenueRequest;
const workshop = (over: Partial<Workshop> = {}) =>
  ({ id: 'w1', status: 'PENDING_VENUE', activeVenueRequestId: 'r1', ...over }) as Workshop;
const snap = (over: Partial<DecisionSnapshot> = {}): DecisionSnapshot => ({
  request: request(),
  workshop: workshop(),
  slot: { status: 'AVAILABLE' },
  facility: { id: 'f1' } as Facility,
  competitors: [],
  ...over,
});
const approve = { decision: 'APPROVE' as const };

describe('decideVenueDecision', () => {
  it('NOT_FOUND, NOT_FACILITY_OWNER, REQUEST_NOT_PENDING in order', () => {
    expect(codeOf(() => decideVenueDecision(snap({ request: undefined }), approve, 'p1'))).toBe(
      'NOT_FOUND',
    );
    expect(
      codeOf(() =>
        decideVenueDecision(snap({ request: request({ status: 'APPROVED' }) }), approve, 'p2'),
      ),
    ).toBe('NOT_FACILITY_OWNER');
    expect(
      codeOf(() =>
        decideVenueDecision(snap({ request: request({ status: 'APPROVED' }) }), approve, 'p1'),
      ),
    ).toBe('REQUEST_NOT_PENDING');
  });
  it('APPROVE of an already CONFLICTED request is SLOT_CONFLICT, other decisions are REQUEST_NOT_PENDING', () => {
    const conflicted = snap({ request: request({ status: 'CONFLICTED' }) });
    expect(codeOf(() => decideVenueDecision(conflicted, approve, 'p1'))).toBe('SLOT_CONFLICT');
    expect(codeOf(() => decideVenueDecision(conflicted, { decision: 'REJECT' }, 'p1'))).toBe(
      'REQUEST_NOT_PENDING',
    );
  });
  it('REJECT: optional reason, workshop back to DRAFT', () => {
    const plain = decideVenueDecision(snap(), { decision: 'REJECT' }, 'p1');
    expect(plain).toMatchObject({ outcome: 'REJECTED', resetWorkshop: true });
    expect(plain).not.toHaveProperty('reason');
    expect(
      decideVenueDecision(snap(), { decision: 'REJECT', reason: ' too small ' }, 'p1'),
    ).toMatchObject({ reason: 'too small' });
  });
  it('REQUEST_INFO needs a message', () => {
    expect(codeOf(() => decideVenueDecision(snap(), { decision: 'REQUEST_INFO' }, 'p1'))).toBe(
      'REASON_REQUIRED',
    );
    expect(
      codeOf(() => decideVenueDecision(snap(), { decision: 'REQUEST_INFO', message: '  ' }, 'p1')),
    ).toBe('REASON_REQUIRED');
    expect(
      decideVenueDecision(snap(), { decision: 'REQUEST_INFO', message: 'Need ramp?' }, 'p1'),
    ).toMatchObject({ outcome: 'AWAITING_INFO', infoRequest: 'Need ramp?' });
  });
  it('APPROVE on a free slot also plans CONFLICTED for open competitors only', () => {
    const rival = request({ id: 'r2', workshopId: 'w2', instructorId: 'u2' });
    const done = request({ id: 'r3', workshopId: 'w3', status: 'REJECTED' });
    const plan = decideVenueDecision(
      snap({
        competitors: [
          { request: rival, workshop: workshop({ id: 'w2', activeVenueRequestId: 'r2' }) },
          { request: done, workshop: undefined },
          { request: request(), workshop: undefined },
        ],
      }),
      approve,
      'p1',
    );
    expect(plan.outcome).toBe('APPROVED');
    if (plan.outcome !== 'APPROVED') return;
    expect(plan.competitors.map((c) => [c.requestId, c.resetWorkshop])).toEqual([['r2', true]]);
  });
  it.each([
    ['slot BOOKED', { slot: { status: 'BOOKED' as const } }],
    ['slot missing', { slot: undefined }],
    [
      'workshop no longer pending',
      { workshop: workshop({ status: 'DRAFT', activeVenueRequestId: null }) },
    ],
    [
      'workshop waits on another request',
      { workshop: workshop({ activeVenueRequestId: 'other' }) },
    ],
  ])('APPROVE conflict path: %s', (_n, over) => {
    const plan = decideVenueDecision(snap(over), { ...approve, suggestedSlotId: 's9' }, 'p1');
    expect(plan).toMatchObject({ outcome: 'CONFLICTED', suggestedSlotId: 's9' });
  });
  it('REJECT never resets an ARCHIVED workshop (M4)', () => {
    const archived = snap({ workshop: workshop({ status: 'ARCHIVED' }) });
    expect(decideVenueDecision(archived, { decision: 'REJECT' }, 'p1')).toMatchObject({
      outcome: 'REJECTED',
      resetWorkshop: false,
    });
  });
  it('late APPROVE: past slot or too-small venue takes the conflict path (L3)', () => {
    const now = new Date('2026-10-19T00:00:00Z');
    const at = (iso: string) => ({ toDate: () => new Date(iso) }) as never;
    const past = snap({ slot: { status: 'AVAILABLE', startAt: at('2026-10-18T10:00:00Z') } });
    expect(decideVenueDecision(past, approve, 'p1', now)).toMatchObject({
      outcome: 'CONFLICTED',
      reason: 'the slot start time has passed',
      resetWorkshop: true,
    });
    const future = snap({ slot: { status: 'AVAILABLE', startAt: at('2026-10-25T10:00:00Z') } });
    expect(decideVenueDecision(future, approve, 'p1', now).outcome).toBe('APPROVED');
    const small = snap({
      facility: { id: 'f1', capacity: 5 } as Facility,
      workshop: workshop({ capacity: 10 }),
    });
    expect(decideVenueDecision(small, approve, 'p1', now)).toMatchObject({ outcome: 'CONFLICTED' });
  });
  it('conflict path only resets a workshop that waits on this request', () => {
    const waiting = decideVenueDecision(snap({ slot: { status: 'BOOKED' } }), approve, 'p1');
    expect(waiting).toMatchObject({ resetWorkshop: true });
    const other = decideVenueDecision(
      snap({ slot: { status: 'BOOKED' }, workshop: workshop({ activeVenueRequestId: 'x' }) }),
      approve,
      'p1',
    );
    expect(other).toMatchObject({ resetWorkshop: false });
  });
  it('notifies the instructor with the right type', () => {
    expect(decideVenueDecision(snap(), approve, 'p1').notice).toMatchObject({
      userId: 'u1',
      type: 'VENUE_REQUEST_DECIDED',
    });
    expect(
      decideVenueDecision(snap(), { decision: 'REQUEST_INFO', message: 'x' }, 'p1').notice.type,
    ).toBe('VENUE_REQUEST_INFO');
    expect(
      decideVenueDecision(snap({ slot: { status: 'BOOKED' } }), approve, 'p1').notice.type,
    ).toBe('VENUE_REQUEST_CONFLICTED');
  });
});

describe('planConflicts', () => {
  it('skips non-open requests', () => {
    const items = [{ request: request({ status: 'APPROVED' }), workshop: undefined }];
    expect(planConflicts(items, 'x')).toEqual([]);
  });
});
