// reports-updateIncident (UC #5-3): admin moves an incident through its workflow with audit.
import { defineCallable } from '../../common';
import { updateIncident } from '../repo/incidentRepo';

export const updateIncidentCallable = defineCallable(
  'reports-updateIncident',
  { roles: ['ADMIN'], auditOnDeny: true },
  async ({ input, caller, db }) => updateIncident(db, caller, input),
);
