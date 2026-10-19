// UC #2-1 SearchWorkshops: one workshop row with date, venue, seats left and optional distance.
import { seatsRemaining, type Workshop } from '@silveracademy/shared';
import { Badge, ListItem } from '../../../../design';
import { format, strings } from '../../../../i18n';
import { formatDateTime } from '../../../../services/dateFormat';
import { formatDistance } from '../../controller/learnerDiscoverLogic';

interface Props {
  workshop: Workshop;
  distanceKm?: number | null;
  onPress: () => void;
}

export function seatsText(w: Pick<Workshop, 'capacity' | 'seatsTaken'>): string {
  const left = seatsRemaining(w);
  if (left === 0) return strings.workshopsLearner.full;
  return left === 1
    ? strings.workshopsLearner.seatsLeftOne
    : format(strings.workshopsLearner.seatsLeft, { n: left });
}

export function WorkshopCard({ workshop: w, distanceKm = null, onPress }: Props) {
  const s = strings.workshopsLearner;
  const when = w.startAt ? formatDateTime(w.startAt.toDate()) : '';
  const dist = formatDistance(distanceKm);
  const meta = [w.venue?.name, dist ? format(s.distanceKm, { km: dist }) : null]
    .filter(Boolean)
    .join(' - ');
  return (
    <ListItem
      title={w.title}
      subtitle={when}
      meta={meta}
      right={<Badge label={seatsText(w)} tone={seatsRemaining(w) === 0 ? 'danger' : 'success'} />}
      onPress={onPress}
      accessibilityLabel={format(s.cardLabel, { title: w.title, when, seats: seatsText(w) })}
      testID={`workshop-${w.id}`}
    />
  );
}
