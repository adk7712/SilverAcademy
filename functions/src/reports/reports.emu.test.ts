// Emulator integration test for the reports handlers (UC #2-5 submit, #5-3 incident workflow). Run via `npm run test:emulator`.
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { INCIDENT_REF_REGEX, type Role } from '@silveracademy/shared';
import { submitReport, updateIncident, type AttachmentInspector } from './repo/incidentRepo';

if (getApps().length === 0) initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const db = getFirestore();
const NOW = new Date('2026-10-19T04:00:00Z');
const RUN = Date.now().toString(36);
const reporter = { uid: `sp_rep_${RUN}`, roles: ['LEARNER'] as Role[] };
const admin = { uid: `st_admin_${RUN}` };
const noFiles: AttachmentInspector = () => Promise.resolve([]);
const codeOf = async (p: Promise<unknown>): Promise<string | undefined> => {
  try {
    await p;
  } catch (e) {
    return (e as { code?: string }).code;
  }
};
const base = { category: 'WORKSHOP' as const, description: 'The venue door was locked.' };

describe('reports-submitReport (emulator)', () => {
  it('creates incidents/{refNo} as SUBMITTED v1 with a valid reference number', async () => {
    const { referenceNo } = await submitReport(
      db,
      reporter,
      { ...base, relatedWorkshopId: 'w1' },
      NOW,
      noFiles,
    );
    expect(referenceNo).toMatch(INCIDENT_REF_REGEX);
    const doc = (await db.doc(`incidents/${referenceNo}`).get()).data();
    expect(doc).toMatchObject({
      id: referenceNo,
      status: 'SUBMITTED',
      version: 1,
      reporterId: reporter.uid,
      reporterRole: 'LEARNER',
      relatedWorkshopId: 'w1',
      attachments: [],
    });
    expect(doc).not.toHaveProperty('relatedUserId');
  });

  it('reference numbers are unique across submissions', async () => {
    const refs = await Promise.all(
      Array.from({ length: 5 }, () => submitReport(db, reporter, base, NOW, noFiles)),
    );
    expect(new Set(refs.map((r) => r.referenceNo)).size).toBe(5);
  });

  it('a refNo collision retries with a new suffix and never overwrites', async () => {
    const first = await submitReport(db, reporter, base, NOW, noFiles, () => [1, 2, 3, 4, 5]);
    const seq = [
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
      [9, 9, 9, 9, 9],
    ];
    const random = () => seq.shift() ?? [7, 7, 7, 7, 7];
    const second = await submitReport(
      db,
      reporter,
      { ...base, description: 'Second report, different.' },
      NOW,
      noFiles,
      random,
    );
    expect(second.referenceNo).not.toBe(first.referenceNo);
    expect((await db.doc(`incidents/${first.referenceNo}`).get()).data()?.description).toBe(
      base.description,
    );
  });

  it('valid attachments are recorded; foreign / missing / oversize / wrong type write nothing', async () => {
    const own = `reportUploads/${reporter.uid}/a.png`;
    const ok: AttachmentInspector = (paths) =>
      Promise.resolve(paths.map((path) => ({ path, contentType: 'image/png', sizeBytes: 1000 })));
    const { referenceNo } = await submitReport(
      db,
      reporter,
      { ...base, attachmentPaths: [own] },
      NOW,
      ok,
    );
    expect((await db.doc(`incidents/${referenceNo}`).get()).data()?.attachments).toEqual([
      { path: own, contentType: 'image/png', sizeBytes: 1000 },
    ]);

    const before = (await db.collection('incidents').where('reporterId', '==', reporter.uid).get())
      .size;
    const missing: AttachmentInspector = (paths) => Promise.resolve(paths.map(() => null));
    const big: AttachmentInspector = (paths) =>
      Promise.resolve(
        paths.map((path) => ({ path, contentType: 'image/png', sizeBytes: 6 * 1024 * 1024 })),
      );
    expect(
      await codeOf(
        submitReport(
          db,
          reporter,
          { ...base, attachmentPaths: ['reportUploads/other/a.png'] },
          NOW,
          ok,
        ),
      ),
    ).toBe('ATTACHMENT_INVALID');
    expect(
      await codeOf(submitReport(db, reporter, { ...base, attachmentPaths: [own] }, NOW, missing)),
    ).toBe('ATTACHMENT_INVALID');
    expect(
      await codeOf(submitReport(db, reporter, { ...base, attachmentPaths: [own] }, NOW, big)),
    ).toBe('ATTACHMENT_INVALID');
    const after = (await db.collection('incidents').where('reporterId', '==', reporter.uid).get())
      .size;
    expect(after).toBe(before);
  });
});

describe('reports-updateIncident (emulator)', () => {
  it('walks the workflow with audit + reporter notification; closed is final', async () => {
    const { referenceNo: id } = await submitReport(db, reporter, base, NOW, noFiles);
    const step = (input: object) =>
      updateIncident(db, admin, { incidentId: id, expectedVersion: 0, ...input });
    expect(
      await updateIncident(db, admin, {
        incidentId: id,
        status: 'UNDER_REVIEW',
        expectedVersion: 1,
      }),
    ).toEqual({ status: 'UNDER_REVIEW', version: 2 });
    expect(
      await codeOf(
        updateIncident(db, admin, { incidentId: id, status: 'AWAITING_INFO', expectedVersion: 2 }),
      ),
    ).toBe('REASON_REQUIRED');
    expect(
      await updateIncident(db, admin, {
        incidentId: id,
        status: 'AWAITING_INFO',
        infoRequest: 'Which room?',
        expectedVersion: 2,
      }),
    ).toEqual({ status: 'AWAITING_INFO', version: 3 });
    expect(
      await codeOf(
        updateIncident(db, admin, {
          incidentId: id,
          status: 'RESOLVED',
          resolution: 'x',
          expectedVersion: 3,
        }),
      ),
    ).toBe('INVALID_TRANSITION');
    await updateIncident(db, admin, { incidentId: id, status: 'UNDER_REVIEW', expectedVersion: 3 });
    expect(
      await updateIncident(db, admin, {
        incidentId: id,
        status: 'RESOLVED',
        resolution: 'Door fixed',
        expectedVersion: 4,
      }),
    ).toEqual({ status: 'RESOLVED', version: 5 });
    expect(
      await codeOf(
        updateIncident(db, admin, { incidentId: id, status: 'UNDER_REVIEW', expectedVersion: 5 }),
      ),
    ).toBe('INCIDENT_CLOSED');
    expect(
      await updateIncident(db, admin, { incidentId: id, status: 'CLOSED', expectedVersion: 5 }),
    ).toEqual({ status: 'CLOSED', version: 6 });
    expect(await codeOf(step({ status: 'CLOSED', expectedVersion: 6 }))).toBe('INCIDENT_CLOSED');
    expect(
      await codeOf(
        updateIncident(db, admin, {
          incidentId: 'SA-000000-AAAAA',
          status: 'CLOSED',
          expectedVersion: 1,
        }),
      ),
    ).toBe('NOT_FOUND');

    expect((await db.doc(`incidents/${id}`).get()).data()).toMatchObject({
      status: 'CLOSED',
      resolution: 'Door fixed',
      infoRequest: 'Which room?',
      version: 6,
    });
    const audits = await db.collection('auditLogs').where('targetId', '==', id).get();
    expect(audits.docs.map((d) => d.data().action)).toEqual(
      Array(audits.size).fill('INCIDENT_UPDATE'),
    );
    expect(audits.size).toBe(5);
    const notes = await db
      .collection('notifications')
      .where('refPath', '==', `incidents/${id}`)
      .get();
    expect(notes.size).toBe(5);
    expect(
      notes.docs.every(
        (d) => d.data().userId === reporter.uid && d.data().type === 'INCIDENT_UPDATED',
      ),
    ).toBe(true);
  });

  it('a stale concurrent update loses', async () => {
    const { referenceNo: id } = await submitReport(db, reporter, base, NOW, noFiles);
    const go = () =>
      codeOf(
        updateIncident(db, admin, { incidentId: id, status: 'UNDER_REVIEW', expectedVersion: 1 }),
      );
    const results = await Promise.all([go(), go()]);
    expect(results.filter((c) => c === undefined)).toHaveLength(1);
    expect(results.filter((c) => c === 'STALE_VERSION')).toHaveLength(1);
  });
});
