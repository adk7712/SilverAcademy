// UC #5-3: incident status badge (text carries the meaning, colour is secondary).
import type { IncidentStatus } from '@silveracademy/shared';
import { Badge } from '../../../design';
import type { Tone } from '../../../design';
import { reportStrings as s } from '../strings';

const TONE: Record<IncidentStatus, Tone> = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'warning',
  AWAITING_INFO: 'warning',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

export const StatusBadge = ({ status }: { status: IncidentStatus }) => (
  <Badge tone={TONE[status]}>{s.status[status]}</Badge>
);
