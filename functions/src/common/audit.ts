// Audit-log writer (architecture.md 2.3 AuditLog, 3.2). Append-only; never put codes or passwords in details.
import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import type { AuditAction, AuditOutcome, AuditTargetType, Role } from '@silveracademy/shared';
import { COL } from './refs';

export type AuditDetails = Record<string, string | number | boolean>;

export interface AuditInput {
  actorId: string | null;
  actorRole: Role | null;
  action: AuditAction;
  outcome: AuditOutcome;
  targetType?: AuditTargetType;
  targetId?: string;
  details?: AuditDetails;
}

const MAX_DETAIL_STRING = 200;

/** Pure: shapes the stored document (without server timestamp) and trims long strings. */
export function buildAuditEntry(input: AuditInput) {
  const details: AuditDetails = {};
  for (const [k, v] of Object.entries(input.details ?? {})) {
    details[k] = typeof v === 'string' ? v.slice(0, MAX_DETAIL_STRING) : v;
  }
  return {
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: input.action,
    outcome: input.outcome,
    ...(input.targetType ? { targetType: input.targetType } : {}),
    ...(input.targetId ? { targetId: input.targetId } : {}),
    details,
  };
}

/** Inside a transaction: `tx.create` an audit doc so it commits atomically with the business change. Returns the id. */
export function writeAuditTx(db: Firestore, tx: Transaction, input: AuditInput): string {
  const ref = db.collection(COL.auditLogs).doc();
  tx.create(ref, {
    id: ref.id,
    ...buildAuditEntry(input),
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

/** Outside a transaction (denials, failed logins). Awaited so the entry is durable before the handler throws. */
export async function writeAudit(db: Firestore, input: AuditInput): Promise<string> {
  const ref = db.collection(COL.auditLogs).doc();
  await ref.create({
    id: ref.id,
    ...buildAuditEntry(input),
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}
