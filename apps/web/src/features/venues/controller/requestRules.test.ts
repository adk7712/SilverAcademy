// UC #4-2 request rules tests.
import { describe, expect, it } from 'vitest';
import {
  availableActions,
  needsAlternativeSlot,
  splitQueues,
  validateInfoMessage,
} from './requestRules';
import type { RequestView } from '../types';

const req = (
  id: string,
  status: RequestView['status'],
  createdMs = 0,
  startMs = 0,
): RequestView => ({
  id,
  status,
  createdMs,
  startMs,
  endMs: startMs + 1,
  workshopId: 'w',
  workshopTitle: 't',
  description: 'd',
  category: 'DIGITAL_SKILLS' as RequestView['category'],
  workshopCapacity: 10,
  materials: '',
  instructorName: 'i',
  facilityId: 'f',
  facilityName: 'F',
  slotId: 's',
});

describe('request rules', () => {
  it('allows decisions only on PENDING', () => {
    expect(availableActions('PENDING')).toEqual(['APPROVE', 'REJECT', 'REQUEST_INFO']);
    for (const s of ['AWAITING_INFO', 'APPROVED', 'REJECTED', 'CONFLICTED', 'WITHDRAWN'] as const) {
      expect(availableActions(s)).toEqual([]);
    }
  });

  it('prompts for an alternative slot only when CONFLICTED', () => {
    expect(needsAlternativeSlot('CONFLICTED')).toBe(true);
    expect(needsAlternativeSlot('PENDING')).toBe(false);
  });

  it('splits queues: open oldest first, conflicted first in history', () => {
    const q = splitQueues([
      req('new', 'PENDING', 20),
      req('old', 'AWAITING_INFO', 10),
      req('done', 'APPROVED', 0, 500),
      req('conf', 'CONFLICTED', 0, 100),
      req('rej', 'REJECTED', 0, 900),
    ]);
    expect(q.open.map((r) => r.id)).toEqual(['old', 'new']);
    expect(q.history.map((r) => r.id)).toEqual(['conf', 'rej', 'done']);
  });

  it('requires a non-blank info message', () => {
    expect(validateInfoMessage('  ')).toBeDefined();
    expect(validateInfoMessage('Need projector?')).toBeUndefined();
  });
});
