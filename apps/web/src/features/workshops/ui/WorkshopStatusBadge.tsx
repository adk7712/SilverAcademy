// UC #5-2 workshop status badge (text carries the meaning, tone is secondary).
import type { WorkshopStatus } from '@silveracademy/shared';
import { Badge } from '../../../design';
import type { Tone } from '../../../design';
import { workshopStrings } from '../strings';

const TONES: Record<WorkshopStatus, Tone> = {
  DRAFT: 'neutral',
  PENDING_VENUE: 'info',
  OPEN: 'success',
  COMPLETED: 'neutral',
  CANCELLED: 'danger',
  ARCHIVED: 'neutral',
};

export function WorkshopStatusBadge({ status }: { status: WorkshopStatus }) {
  return <Badge tone={TONES[status]}>{workshopStrings.statusLabels[status]}</Badge>;
}
