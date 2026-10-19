// UC #5-3: unit tests for incident transitions, update validation and deep links.
import { describe, expect, it } from 'vitest';
import { INCIDENT_STATUSES } from '@silveracademy/shared';
import { buildUpdate, followUpLinks, isClosed, nextStatuses } from './incidentRules';
import type { IncidentView } from '../types';

const incident = (over: Partial<IncidentView> = {}): IncidentView => ({
  id: 'SA-261019-ABCDE',
  version: 3,
  category: 'WORKSHOP',
  description: 'something happened',
  reporterId: 'u1',
  reporterRole: 'LEARNER',
  attachments: [],
  status: 'UNDER_REVIEW',
  ...over,
});

describe('transitions', () => {
  it('follows the functions.md table', () => {
    expect(nextStatuses('SUBMITTED')).toEqual(['UNDER_REVIEW', 'CLOSED']);
    expect(nextStatuses('UNDER_REVIEW')).toEqual(['AWAITING_INFO', 'RESOLVED', 'CLOSED']);
    expect(nextStatuses('AWAITING_INFO')).toEqual(['UNDER_REVIEW', 'CLOSED']);
    expect(nextStatuses('RESOLVED')).toEqual(['CLOSED']);
    expect(nextStatuses('CLOSED')).toEqual([]);
  });
  it('never offers the current status or SUBMITTED', () => {
    for (const s of INCIDENT_STATUSES) {
      expect(nextStatuses(s)).not.toContain(s);
      expect(nextStatuses(s)).not.toContain('SUBMITTED');
    }
    expect(isClosed('CLOSED')).toBe(true);
  });
});

describe('buildUpdate', () => {
  const form = { status: '' as const, infoRequest: '', resolution: '' };
  it('needs a valid next status', () => {
    expect(buildUpdate(incident(), form)).toEqual({ ok: false, field: 'status' });
    expect(buildUpdate(incident(), { ...form, status: 'SUBMITTED' })).toEqual({
      ok: false,
      field: 'status',
    });
  });
  it('requires infoRequest for AWAITING_INFO and resolution for RESOLVED', () => {
    expect(
      buildUpdate(incident(), { ...form, status: 'AWAITING_INFO', infoRequest: '  ' }),
    ).toEqual({ ok: false, field: 'infoRequest' });
    expect(buildUpdate(incident(), { ...form, status: 'RESOLVED' })).toEqual({
      ok: false,
      field: 'resolution',
    });
  });
  it('builds input with trimmed text and the doc version', () => {
    expect(
      buildUpdate(incident(), {
        ...form,
        status: 'RESOLVED',
        resolution: ' fixed ',
        infoRequest: 'ignored',
      }),
    ).toEqual({
      ok: true,
      input: {
        incidentId: 'SA-261019-ABCDE',
        status: 'RESOLVED',
        resolution: 'fixed',
        expectedVersion: 3,
      },
    });
    expect(buildUpdate(incident(), { ...form, status: 'CLOSED' })).toEqual({
      ok: true,
      input: { incidentId: 'SA-261019-ABCDE', status: 'CLOSED', expectedVersion: 3 },
    });
  });
});

describe('followUpLinks', () => {
  it('links to accounts and workshops pages with the incident id', () => {
    const links = followUpLinks(incident({ relatedUserId: 'u 2', relatedWorkshopId: 'w1' }));
    expect(links).toEqual([
      { kind: 'account', to: '/admin/accounts/u%202?incident=SA-261019-ABCDE' },
      { kind: 'workshop', to: '/admin/workshops/w1?incident=SA-261019-ABCDE' },
    ]);
    expect(followUpLinks(incident())).toEqual([]);
  });
});
