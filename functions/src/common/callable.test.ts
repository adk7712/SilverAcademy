import { z } from 'zod';
import type { Firestore } from 'firebase-admin/firestore';
import type { User } from '@silveracademy/shared';
import { fixedClock } from './clock';
import { parseInput, runCallable, type RunDeps } from './callable';

const NOW = '2026-10-19T00:00:00.000Z';
const db = {} as Firestore;
const deps = (user?: Partial<User>): RunDeps & { auditDenied: jest.Mock; loadUser: jest.Mock } => ({
  db,
  clock: fixedClock(NOW),
  loadUser: jest
    .fn()
    .mockResolvedValue(user ? { status: 'ACTIVE', roles: ['LEARNER'], ...user } : undefined),
  auditDenied: jest.fn().mockResolvedValue(undefined),
});

const book = (
  handler: jest.Mock,
  access: 'public' | { roles: ['LEARNER'] } | { roles: ['ADMIN']; auditOnDeny: true },
) => ({ name: 'bookings-bookWorkshop' as const, access, handler }) as never;

describe('runCallable', () => {
  it('parses input, injects caller/now/db and validates output', async () => {
    const handler = jest.fn().mockResolvedValue({
      bookingId: 'b',
      ticketCode: 'ABCD1234',
      qrPayload: 'SA1.b.' + 'x'.repeat(22),
      workshopSnapshot: {
        title: 't',
        startAt: NOW,
        endAt: NOW,
        venueName: 'v',
        venueAddress: 'a',
        instructorName: 'i',
      },
      seatsRemaining: 3,
    });
    const d = deps({ roles: ['LEARNER'] });
    const out = await runCallable(
      book(handler, { roles: ['LEARNER'] }),
      { auth: { uid: 'u1' }, data: { workshopId: 'w' } },
      d,
    );
    expect((out as { bookingId: string }).bookingId).toBe('b');
    const ctx = handler.mock.calls[0]?.[0];
    expect(ctx.input).toEqual({ workshopId: 'w' });
    expect(ctx.caller.uid).toBe('u1');
    expect(ctx.now).toEqual(new Date(NOW));
    expect(ctx.db).toBe(db);
  });
  it('INVALID_INPUT carries fieldErrors and never reaches the handler', async () => {
    const handler = jest.fn();
    await expect(
      runCallable(
        book(handler, { roles: ['LEARNER'] }),
        { auth: { uid: 'u1' }, data: {} },
        deps({ roles: ['LEARNER'] }),
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      details: { fieldErrors: { workshopId: expect.any(Array) } },
    });
    expect(handler).not.toHaveBeenCalled();
  });
  it('auth/role checks run before input validation (no schema leak to strangers)', async () => {
    const handler = jest.fn();
    await expect(
      runCallable(book(handler, { roles: ['LEARNER'] }), { data: {} }, deps()),
    ).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    await expect(
      runCallable(
        book(handler, { roles: ['LEARNER'] }),
        { auth: { uid: 'u' }, data: {} },
        deps({ status: 'SUSPENDED' }),
      ),
    ).rejects.toMatchObject({ code: 'ACCOUNT_SUSPENDED' });
    expect(handler).not.toHaveBeenCalled();
  });
  it('auditOnDeny reports the callable name', async () => {
    const d = deps({ roles: ['LEARNER'] });
    await expect(
      runCallable(
        book(jest.fn(), { roles: ['ADMIN'], auditOnDeny: true }),
        { auth: { uid: 'u' }, data: {} },
        d,
      ),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(d.auditDenied).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'u',
        code: 'PERMISSION_DENIED',
        name: 'bookings-bookWorkshop',
      }),
    );
  });
  it('public access skips the user lookup', async () => {
    const d = deps();
    const handler = jest.fn().mockRejectedValue(new Error('boom'));
    await expect(
      runCallable(book(handler, 'public'), { data: { workshopId: 'w' } }, d),
    ).rejects.toThrow('boom');
    expect(d.loadUser).not.toHaveBeenCalled();
    expect(handler.mock.calls[0]?.[0].caller).toBeNull();
  });
  it('a handler result that violates the output schema becomes INTERNAL', async () => {
    const handler = jest.fn().mockResolvedValue({ bookingId: 1 });
    await expect(
      runCallable(book(handler, 'public'), { data: { workshopId: 'w' } }, deps()),
    ).rejects.toMatchObject({ code: 'INTERNAL' });
  });
});

describe('parseInput', () => {
  it('treats null/undefined data as {}', () => {
    expect(() => parseInput(z.object({}), undefined)).not.toThrow();
  });
});
