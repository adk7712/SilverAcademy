// UC #2-5 #5-3 incidents; notifications; auditLogs entities (UC #5-1 audit).
import type {
  AuditAction,
  AuditOutcome,
  AuditTargetType,
  IncidentCategory,
  IncidentStatus,
  NotificationType,
  ReporterRole,
  Role,
} from '../enums';
import type { TimestampLike, Timestamps, Versioned } from './common';

export interface IncidentAttachment {
  path: string;
  contentType: string;
  sizeBytes: number;
}

/** incidents/{refNo} */
export interface Incident extends Timestamps, Versioned {
  id: string;
  category: IncidentCategory;
  description: string;
  reporterId: string;
  reporterRole: ReporterRole;
  relatedWorkshopId?: string;
  relatedUserId?: string;
  attachments: IncidentAttachment[];
  status: IncidentStatus;
  resolution?: string;
  infoRequest?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  refPath?: string;
  read: boolean;
  createdAt: TimestampLike;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorRole: Role | null;
  action: AuditAction;
  outcome: AuditOutcome;
  targetType?: AuditTargetType;
  targetId?: string;
  /** Never codes or passwords. */
  details: Record<string, string | number | boolean>;
  createdAt: TimestampLike;
}
