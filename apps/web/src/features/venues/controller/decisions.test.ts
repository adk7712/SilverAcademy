// UC #4-2 decision outcome tests (callable injected).
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@silveracademy/shared';
import { buildDecideInput, submitDecision } from './decisions';
import { isSlotConflict, venueErrorMessage } from './venueErrors';
import { venueStrings } from '../strings';

const ok = { status: 'APPROVED' as const, workshopId: 'w', conflictedRequestIds: [] };

describe('decisions', () => {
  it('builds input without empty optional fields', () => {
    expect(buildDecideInput({ requestId: 'r', action: 'APPROVE', reason: 'x' })).toEqual({
      requestId: 'r',
      decision: 'APPROVE',
    });
    expect(buildDecideInput({ requestId: 'r', action: 'REJECT', reason: '  ' })).toEqual({
      requestId: 'r',
      decision: 'REJECT',
    });
    expect(
      buildDecideInput({
        requestId: 'r',
        action: 'REJECT',
        reason: 'Closed',
        suggestedSlotId: 's2',
      }),
    ).toEqual({
      requestId: 'r',
      decision: 'REJECT',
      reason: 'Closed',
      suggestedSlotId: 's2',
    });
    expect(
      buildDecideInput({ requestId: 'r', action: 'REQUEST_INFO', message: ' Need X ' }),
    ).toEqual({
      requestId: 'r',
      decision: 'REQUEST_INFO',
      message: 'Need X',
    });
  });

  it('returns ok messages per action', async () => {
    const decide = vi.fn().mockResolvedValue(ok);
    expect(await submitDecision(decide, { requestId: 'r', action: 'APPROVE' })).toEqual({
      kind: 'ok',
      message: venueStrings.requests.approved,
    });
    expect((await submitDecision(decide, { requestId: 'r', action: 'REJECT' })).kind).toBe('ok');
  });

  it('blocks REQUEST_INFO without a message and never calls the server', async () => {
    const decide = vi.fn();
    const out = await submitDecision(decide, {
      requestId: 'r',
      action: 'REQUEST_INFO',
      message: ' ',
    });
    expect(out.kind).toBe('error');
    expect(decide).not.toHaveBeenCalled();
  });

  it('maps SLOT_CONFLICT to the conflict outcome', async () => {
    const decide = vi
      .fn()
      .mockRejectedValue(new AppError('SLOT_CONFLICT', undefined, { requestId: 'r' }));
    const out = await submitDecision(decide, { requestId: 'r', action: 'APPROVE' });
    expect(out).toEqual({ kind: 'conflict', message: venueStrings.requests.conflictBody });
  });

  it('maps other errors to readable messages', async () => {
    const decide = vi.fn().mockRejectedValue(new AppError('REQUEST_NOT_PENDING'));
    const out = await submitDecision(decide, { requestId: 'r', action: 'REJECT' });
    expect(out).toMatchObject({ kind: 'error', message: venueStrings.errors.requestNotPending });
  });

  it('classifies errors', () => {
    expect(isSlotConflict(new AppError('SLOT_CONFLICT'))).toBe(true);
    expect(venueErrorMessage(new AppError('SLOT_BOOKED_LOCKED'))).toBe(
      venueStrings.errors.slotBookedLocked,
    );
    expect(venueErrorMessage(new AppError('SLOT_IN_PAST'))).toMatch(/past/);
    expect(venueErrorMessage({ code: 'functions/unavailable' })).toMatch(/server/i);
  });
});
