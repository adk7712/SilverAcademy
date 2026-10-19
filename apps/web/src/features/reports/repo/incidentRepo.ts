// UC #5-3: incident reads (Firestore, Storage) and updates (callable only).
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import type { DocumentData, Query } from 'firebase/firestore';
import { getBlob, ref } from 'firebase/storage';
import type { IncidentStatus } from '@silveracademy/shared';
import { callFunction, firestore, storage } from '../../../services';
import type { AuditEntryView, IncidentView } from '../types';

export const INCIDENT_PAGE_SIZE = 100;
const AUDIT_PAGE_SIZE = 50;

const toDate = (v: unknown): Date | undefined =>
  typeof v === 'object' && v !== null && 'toDate' in v && typeof v.toDate === 'function'
    ? (v.toDate() as Date)
    : undefined;

function toIncident(id: string, d: DocumentData): IncidentView {
  return {
    id,
    version: Number(d.version ?? 0),
    category: d.category,
    description: String(d.description ?? ''),
    reporterId: String(d.reporterId ?? ''),
    reporterRole: d.reporterRole,
    relatedWorkshopId: d.relatedWorkshopId,
    relatedUserId: d.relatedUserId,
    attachments: Array.isArray(d.attachments) ? d.attachments : [],
    status: d.status,
    resolution: d.resolution,
    infoRequest: d.infoRequest,
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  };
}

export async function fetchIncidents(status?: IncidentStatus): Promise<IncidentView[]> {
  const col = collection(firestore, 'incidents');
  const q: Query = status
    ? query(
        col,
        where('status', '==', status),
        orderBy('createdAt', 'desc'),
        limit(INCIDENT_PAGE_SIZE),
      )
    : query(col, orderBy('createdAt', 'desc'), limit(INCIDENT_PAGE_SIZE));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toIncident(d.id, d.data()));
}

export async function fetchIncident(id: string): Promise<IncidentView | null> {
  const snap = await getDoc(doc(firestore, 'incidents', id));
  return snap.exists() ? toIncident(snap.id, snap.data()) : null;
}

export async function fetchAuditTrail(incidentId: string): Promise<AuditEntryView[]> {
  const q = query(
    collection(firestore, 'auditLogs'),
    where('targetType', '==', 'INCIDENT'),
    where('targetId', '==', incidentId),
    orderBy('createdAt', 'desc'),
    limit(AUDIT_PAGE_SIZE),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      actorId: x.actorId ?? null,
      action: x.action,
      outcome: x.outcome,
      details: x.details ?? {},
      createdAt: toDate(x.createdAt),
    };
  });
}

/**
 * Reads the attachment through storage.rules (admin token) and returns a short-lived object URL. Review M5: never
 * `getDownloadURL`, whose token URL bypasses rules and stays valid after access is revoked. Revoke with
 * `URL.revokeObjectURL` when done. (Real buckets need CORS for the web origin; the emulator does not.)
 */
export async function attachmentUrl(path: string): Promise<string> {
  return URL.createObjectURL(await getBlob(ref(storage, path)));
}

export const updateIncident = (
  input: Parameters<typeof callFunction<'reports-updateIncident'>>[1],
) => callFunction('reports-updateIncident', input);
