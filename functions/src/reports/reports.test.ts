// Unit tests for the pure reports rules (UC #2-5, #5-3, ADR-020): no Firebase, no emulator.
import { INCIDENT_REF_REGEX, MAX_ATTACHMENT_BYTES, type Incident } from '@silveracademy/shared';
import { buildReferenceNo } from './controller/referenceNo';
import {
  assertOwnAttachmentPaths,
  decideAttachments,
  isOwnAttachmentPath,
  reporterRoleOf,
} from './controller/decideReport';
import { decideIncidentUpdate, INCIDENT_TRANSITIONS } from './controller/decideIncidentUpdate';

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return (e as { code?: string }).code;
  }
};

describe('buildReferenceNo', () => {
  it('matches SA-YYMMDD-XXXXX and uses the Singapore date', () => {
    const ref = buildReferenceNo(new Date('2026-10-19T17:30:00Z'), [0, 1, 31, 32, 255]);
    expect(ref).toBe('SA-261020-01Z0Z');
    expect(ref).toMatch(INCIDENT_REF_REGEX);
  });
  it('never emits ambiguous letters I L O U', () => {
    const bytes = Array.from({ length: 32 }, (_, i) => i);
    let all = '';
    for (let i = 0; i < 32; i += 5) all += buildReferenceNo(new Date(), bytes.slice(i)).slice(10);
    expect(all).not.toMatch(/[ILOU]/);
  });
});

describe('attachments', () => {
  it('accepts only reportUploads/{uid}/{file}', () => {
    expect(isOwnAttachmentPath('u1', 'reportUploads/u1/a.png')).toBe(true);
    expect(isOwnAttachmentPath('u1', 'reportUploads/u2/a.png')).toBe(false);
    expect(isOwnAttachmentPath('u1', 'reportUploads/u1/x/a.png')).toBe(false);
    expect(isOwnAttachmentPath('u1', 'reportUploads/u1/')).toBe(false);
    expect(isOwnAttachmentPath('u1', 'reportUploads/u1/..')).toBe(false);
    expect(codeOf(() => assertOwnAttachmentPaths('u1', ['reportUploads/u2/a.png']))).toBe(
      'ATTACHMENT_INVALID',
    );
  });
  const meta = (over: object = {}) => ({
    path: 'p',
    contentType: 'image/png',
    sizeBytes: 100,
    ...over,
  });
  it('requires existing, allowed type and size', () => {
    expect(decideAttachments(['p'], [meta()])).toEqual([
      { path: 'p', contentType: 'image/png', sizeBytes: 100 },
    ]);
    expect(codeOf(() => decideAttachments(['p'], [null]))).toBe('ATTACHMENT_INVALID');
    expect(codeOf(() => decideAttachments(['p'], [meta({ contentType: 'text/html' })]))).toBe(
      'ATTACHMENT_INVALID',
    );
    expect(
      codeOf(() => decideAttachments(['p'], [meta({ sizeBytes: MAX_ATTACHMENT_BYTES + 1 })])),
    ).toBe('ATTACHMENT_INVALID');
    expect(decideAttachments(['p'], [meta({ sizeBytes: MAX_ATTACHMENT_BYTES })])).toHaveLength(1);
  });
});

describe('reporterRoleOf', () => {
  it('picks the first reporting role', () => {
    expect(reporterRoleOf(['SENIOR_INSTRUCTOR', 'LEARNER'])).toBe('LEARNER');
    expect(reporterRoleOf(['VOLUNTEER'])).toBe('VOLUNTEER');
    expect(codeOf(() => reporterRoleOf(['ADMIN']))).toBe('PERMISSION_DENIED');
  });
});

const incident = (status: Incident['status'], version = 1): Incident =>
  ({ id: 'SA-1', status, version, reporterId: 'r' }) as Incident;
const upd = (inc: Incident | undefined, input: object) =>
  decideIncidentUpdate(inc, { expectedVersion: 1, ...input });

describe('decideIncidentUpdate', () => {
  it('follows the documented transitions', () => {
    expect(INCIDENT_TRANSITIONS.SUBMITTED).toEqual(['UNDER_REVIEW', 'CLOSED']);
    expect(upd(incident('SUBMITTED'), { status: 'UNDER_REVIEW' })).toMatchObject({
      status: 'UNDER_REVIEW',
      version: 2,
    });
    expect(
      upd(incident('UNDER_REVIEW'), { status: 'RESOLVED', resolution: 'fixed' }),
    ).toMatchObject({
      status: 'RESOLVED',
      resolution: 'fixed',
    });
    expect(upd(incident('RESOLVED'), { status: 'CLOSED' }).status).toBe('CLOSED');
    expect(upd(incident('AWAITING_INFO'), { status: 'UNDER_REVIEW' }).status).toBe('UNDER_REVIEW');
  });
  it('invalid transitions', () => {
    expect(codeOf(() => upd(incident('SUBMITTED'), { status: 'RESOLVED', resolution: 'x' }))).toBe(
      'INVALID_TRANSITION',
    );
    expect(codeOf(() => upd(incident('UNDER_REVIEW'), { status: 'UNDER_REVIEW' }))).toBe(
      'INVALID_TRANSITION',
    );
  });
  it('closed and resolved incidents are final except RESOLVED -> CLOSED', () => {
    expect(codeOf(() => upd(incident('CLOSED'), { status: 'UNDER_REVIEW' }))).toBe(
      'INCIDENT_CLOSED',
    );
    expect(codeOf(() => upd(incident('CLOSED'), { status: 'CLOSED' }))).toBe('INCIDENT_CLOSED');
    expect(codeOf(() => upd(incident('RESOLVED'), { status: 'UNDER_REVIEW' }))).toBe(
      'INCIDENT_CLOSED',
    );
    expect(codeOf(() => upd(incident('RESOLVED'), { resolution: 'edit' }))).toBe('INCIDENT_CLOSED');
  });
  it('REASON_REQUIRED for AWAITING_INFO without infoRequest and RESOLVED without resolution', () => {
    expect(codeOf(() => upd(incident('UNDER_REVIEW'), { status: 'AWAITING_INFO' }))).toBe(
      'REASON_REQUIRED',
    );
    expect(
      codeOf(() => upd(incident('UNDER_REVIEW'), { status: 'RESOLVED', resolution: ' ' })),
    ).toBe('REASON_REQUIRED');
    const d = upd(incident('UNDER_REVIEW'), { status: 'AWAITING_INFO', infoRequest: 'photo?' });
    expect(d.infoRequest).toBe('photo?');
    expect(d.notice.body).toContain('photo?');
  });
  it('NOT_FOUND, STALE_VERSION, empty update', () => {
    expect(codeOf(() => upd(undefined, { status: 'UNDER_REVIEW' }))).toBe('NOT_FOUND');
    expect(codeOf(() => upd(incident('SUBMITTED', 5), { status: 'UNDER_REVIEW' }))).toBe(
      'STALE_VERSION',
    );
    expect(codeOf(() => upd(incident('SUBMITTED'), {}))).toBe('INVALID_INPUT');
  });
  it('text-only update keeps the status', () => {
    expect(upd(incident('UNDER_REVIEW'), { infoRequest: 'more' })).toMatchObject({
      status: 'UNDER_REVIEW',
      infoRequest: 'more',
    });
  });
});
