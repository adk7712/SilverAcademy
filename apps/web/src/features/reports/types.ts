// Local view models for reports; entity types come from @silveracademy/shared.
import type {
  AuditAction,
  AuditOutcome,
  IncidentAttachment,
  IncidentCategory,
  IncidentStatus,
  Role,
} from '@silveracademy/shared';

export interface IncidentView {
  id: string;
  version: number;
  category: IncidentCategory;
  description: string;
  reporterId: string;
  reporterRole: Role;
  relatedWorkshopId?: string;
  relatedUserId?: string;
  attachments: IncidentAttachment[];
  status: IncidentStatus;
  resolution?: string;
  infoRequest?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuditEntryView {
  id: string;
  actorId: string | null;
  action: AuditAction;
  outcome: AuditOutcome;
  details: Record<string, string | number | boolean>;
  createdAt?: Date;
}
