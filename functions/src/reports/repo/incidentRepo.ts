// incidents/{refNo} access: submit (UC #2-5) and admin update (UC #5-3). Admin SDK only.
import { randomBytes } from 'node:crypto';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { AppError, type Incident, type ReporterRole } from '@silveracademy/shared';
import { COL, notifyTx, runTx, writeAuditTx, type Caller } from '../../common';
import { buildReferenceNo, REF_SUFFIX_LENGTH } from '../controller/referenceNo';
import {
  assertOwnAttachmentPaths,
  decideAttachments,
  reporterRoleOf,
  type AttachmentMeta,
} from '../controller/decideReport';
import { decideIncidentUpdate, type IncidentUpdateInput } from '../controller/decideIncidentUpdate';

const MAX_REF_ATTEMPTS = 5;
const ALREADY_EXISTS = 6;

/** Reads Storage metadata per path; null = object missing. Injected so tests need no bucket. */
export type AttachmentInspector = (paths: string[]) => Promise<Array<AttachmentMeta | null>>;

const isNotFound = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 404;

const storageAttachmentInspector: AttachmentInspector = (paths) => {
  const bucket = getStorage().bucket();
  return Promise.all(
    paths.map(async (path) => {
      try {
        const [meta] = await bucket.file(path).getMetadata();
        return {
          path,
          contentType: String(meta.contentType ?? ''),
          sizeBytes: Number(meta.size ?? 0),
        };
      } catch (e) {
        if (isNotFound(e)) return null;
        throw e;
      }
    }),
  );
};

export interface SubmitReportInput {
  category: Incident['category'];
  description: string;
  relatedWorkshopId?: string | undefined;
  relatedUserId?: string | undefined;
  attachmentPaths?: string[] | undefined;
}

const isAlreadyExists = (e: unknown): boolean =>
  typeof e === 'object' &&
  e !== null &&
  'code' in e &&
  (e as { code: unknown }).code === ALREADY_EXISTS;

/**
 * Validates attachments first (nothing is written when one is bad: Ex3), then a single `tx.create` of
 * `incidents/{refNo}`. A refNo collision retries with a fresh random suffix (max MAX_REF_ATTEMPTS).
 */
export async function submitReport(
  db: Firestore,
  caller: Pick<Caller, 'uid' | 'roles'>,
  input: SubmitReportInput,
  now: Date,
  inspect: AttachmentInspector = storageAttachmentInspector,
  random: (n: number) => ArrayLike<number> = randomBytes,
): Promise<{ referenceNo: string }> {
  const reporterRole: ReporterRole = reporterRoleOf(caller.roles);
  const paths = input.attachmentPaths ?? [];
  assertOwnAttachmentPaths(caller.uid, paths);
  const attachments = paths.length ? decideAttachments(paths, await inspect(paths)) : [];

  for (let attempt = 0; attempt < MAX_REF_ATTEMPTS; attempt++) {
    const referenceNo = buildReferenceNo(now, random(REF_SUFFIX_LENGTH));
    const ref = db.collection(COL.incidents).doc(referenceNo);
    try {
      await runTx(db, async (tx) => {
        tx.create(ref, {
          id: referenceNo,
          category: input.category,
          description: input.description,
          reporterId: caller.uid,
          reporterRole,
          ...(input.relatedWorkshopId ? { relatedWorkshopId: input.relatedWorkshopId } : {}),
          ...(input.relatedUserId ? { relatedUserId: input.relatedUserId } : {}),
          attachments,
          status: 'SUBMITTED',
          version: 1,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return Promise.resolve();
      });
      return { referenceNo };
    } catch (e) {
      if (!isAlreadyExists(e)) throw e;
    }
  }
  throw new AppError('BUSY_TRY_AGAIN');
}

/** Admin status change / request info / resolve: update incident, audit INCIDENT_UPDATE, notify the reporter. */
export async function updateIncident(
  db: Firestore,
  caller: Pick<Caller, 'uid'>,
  input: IncidentUpdateInput & { incidentId: string },
): Promise<{ status: Incident['status']; version: number }> {
  const ref = db.collection(COL.incidents).doc(input.incidentId);
  return runTx(db, async (tx) => {
    const snap = await tx.get(ref);
    const incident = snap.exists ? (snap.data() as Incident) : undefined;
    const d = decideIncidentUpdate(incident, input);
    tx.update(ref, {
      status: d.status,
      ...(d.resolution ? { resolution: d.resolution } : {}),
      ...(d.infoRequest ? { infoRequest: d.infoRequest } : {}),
      version: d.version,
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeAuditTx(db, tx, {
      actorId: caller.uid,
      actorRole: 'ADMIN',
      action: 'INCIDENT_UPDATE',
      outcome: 'SUCCESS',
      targetType: 'INCIDENT',
      targetId: input.incidentId,
      details: {
        from: d.fromStatus,
        to: d.status,
        ...(d.resolution ? { resolution: d.resolution } : {}),
        ...(d.infoRequest ? { infoRequest: d.infoRequest } : {}),
      },
    });
    notifyTx(db, tx, {
      userId: (incident as Incident).reporterId,
      type: 'INCIDENT_UPDATED',
      title: d.notice.title,
      body: d.notice.body,
      refPath: `${COL.incidents}/${input.incidentId}`,
    });
    return { status: d.status, version: d.version };
  });
}
