// UC #5-1 account status badge (text carries the meaning, tone is secondary).
import type { AccountStatus } from '@silveracademy/shared';
import { Badge } from '../../../design';
import type { Tone } from '../../../design';
import { userStrings } from '../strings';

const TONES: Record<AccountStatus, Tone> = {
  ACTIVE: 'success',
  SUSPENDED: 'danger',
  INACTIVE: 'neutral',
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return <Badge tone={TONES[status]}>{userStrings.statusLabels[status]}</Badge>;
}
