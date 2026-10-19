// UC #5-3 incident workflow: pure decision for reports-updateIncident (ADR-020). No Firebase imports.
import { AppError, type Incident, type IncidentStatus } from '@silveracademy/shared';

export interface IncidentUpdateInput {
  status?: IncidentStatus | undefined;
  resolution?: string | undefined;
  infoRequest?: string | undefined;
  expectedVersion: number;
}

export interface IncidentUpdateDecision {
  status: IncidentStatus;
  fromStatus: IncidentStatus;
  /** Only set when provided; absent fields are left untouched. */
  resolution?: string;
  infoRequest?: string;
  version: number;
  notice: { title: string; body: string };
}

export const INCIDENT_TRANSITIONS: Record<IncidentStatus, readonly IncidentStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'CLOSED'],
  UNDER_REVIEW: ['AWAITING_INFO', 'RESOLVED', 'CLOSED'],
  AWAITING_INFO: ['UNDER_REVIEW', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

const NOTICE_BODY: Record<IncidentStatus, string> = {
  SUBMITTED: 'Your report was received.',
  UNDER_REVIEW: 'An admin is reviewing your report.',
  AWAITING_INFO: 'An admin needs more information on your report.',
  RESOLVED: 'Your report has been resolved.',
  CLOSED: 'Your report has been closed.',
};

/**
 * Check order: missing -> NOT_FOUND; version -> STALE_VERSION; current RESOLVED (target not CLOSED) or CLOSED ->
 * INCIDENT_CLOSED; nothing to change -> INVALID_INPUT; status not allowed from current -> INVALID_TRANSITION;
 * AWAITING_INFO without infoRequest / RESOLVED without resolution -> REASON_REQUIRED.
 * Omitting `status` keeps the current one (text-only edit of an open incident).
 */
export function decideIncidentUpdate(
  incident: Incident | undefined,
  input: IncidentUpdateInput,
): IncidentUpdateDecision {
  if (!incident) throw new AppError('NOT_FOUND');
  if (incident.version !== input.expectedVersion) {
    throw new AppError('STALE_VERSION', undefined, { currentVersion: incident.version });
  }
  const from = incident.status;
  const target = input.status ?? from;
  const closing = input.status === 'CLOSED' && from === 'RESOLVED';
  if ((from === 'RESOLVED' || from === 'CLOSED') && !closing) {
    throw new AppError('INCIDENT_CLOSED', undefined, { status: from });
  }
  const resolution = input.resolution?.trim();
  const infoRequest = input.infoRequest?.trim();
  if (input.status === undefined && !resolution && !infoRequest) {
    throw new AppError('INVALID_INPUT', 'Nothing to update.');
  }
  if (input.status !== undefined && !INCIDENT_TRANSITIONS[from].includes(input.status)) {
    throw new AppError('INVALID_TRANSITION', undefined, { from, to: input.status });
  }
  if (input.status === 'AWAITING_INFO' && !infoRequest) throw new AppError('REASON_REQUIRED');
  if (input.status === 'RESOLVED' && !resolution) throw new AppError('REASON_REQUIRED');

  const extra = target === 'AWAITING_INFO' && infoRequest ? ` ${infoRequest}` : '';
  return {
    status: target,
    fromStatus: from,
    ...(resolution ? { resolution } : {}),
    ...(infoRequest ? { infoRequest } : {}),
    version: incident.version + 1,
    notice: { title: `Report ${incident.id} updated`, body: `${NOTICE_BODY[target]}${extra}` },
  };
}
