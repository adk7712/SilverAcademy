// UC #5-3: incident status transitions, update validation and deep links (pure; server is authoritative).
import type { IncidentStatus } from '@silveracademy/shared';
import { PATHS } from '../../../app/paths';
import type { IncidentView } from '../types';

/** Mirrors functions.md: statuses an admin may move to from each state. */
export const NEXT_STATUSES: Readonly<Record<IncidentStatus, readonly IncidentStatus[]>> = {
  SUBMITTED: ['UNDER_REVIEW', 'CLOSED'],
  UNDER_REVIEW: ['AWAITING_INFO', 'RESOLVED', 'CLOSED'],
  AWAITING_INFO: ['UNDER_REVIEW', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

export const nextStatuses = (s: IncidentStatus): readonly IncidentStatus[] => NEXT_STATUSES[s];
export const isClosed = (s: IncidentStatus): boolean => s === 'CLOSED';

export interface UpdateForm {
  status: IncidentStatus | '';
  infoRequest: string;
  resolution: string;
}
export type UpdateField = 'status' | 'infoRequest' | 'resolution';
export type UpdateCheck =
  | {
      ok: true;
      input: {
        incidentId: string;
        status: IncidentStatus;
        infoRequest?: string;
        resolution?: string;
        expectedVersion: number;
      };
    }
  | { ok: false; field: UpdateField };

export function buildUpdate(incident: IncidentView, form: UpdateForm): UpdateCheck {
  const { status } = form;
  if (status === '' || !nextStatuses(incident.status).includes(status))
    return { ok: false, field: 'status' };
  const base = { incidentId: incident.id, status, expectedVersion: incident.version };
  if (status === 'AWAITING_INFO') {
    const infoRequest = form.infoRequest.trim();
    return infoRequest
      ? { ok: true, input: { ...base, infoRequest } }
      : { ok: false, field: 'infoRequest' };
  }
  if (status === 'RESOLVED') {
    const resolution = form.resolution.trim();
    return resolution
      ? { ok: true, input: { ...base, resolution } }
      : { ok: false, field: 'resolution' };
  }
  return { ok: true, input: base };
}

export interface FollowUpLink {
  kind: 'account' | 'workshop';
  to: string;
}

/** Deep links to the accounts/workshops pages; the incident id rides along as a query param. */
export function followUpLinks(incident: IncidentView): FollowUpLink[] {
  const q = `?incident=${encodeURIComponent(incident.id)}`;
  const links: FollowUpLink[] = [];
  if (incident.relatedUserId)
    links.push({
      kind: 'account',
      to: `${PATHS.adminAccounts}/${encodeURIComponent(incident.relatedUserId)}${q}`,
    });
  if (incident.relatedWorkshopId)
    links.push({
      kind: 'workshop',
      to: `${PATHS.adminWorkshops}/${encodeURIComponent(incident.relatedWorkshopId)}${q}`,
    });
  return links;
}

export const incidentPath = (id: string): string =>
  `${PATHS.adminIncidents}/${encodeURIComponent(id)}`;
