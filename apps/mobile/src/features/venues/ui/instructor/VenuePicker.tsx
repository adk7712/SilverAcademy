// UC #1-3 venue list (or map) then time slots of the chosen venue; slots are 56dp+ buttons.
import { View } from 'react-native';
import {
  AppText,
  Badge,
  Button,
  EmptyState,
  ListItem,
  Segmented,
  useTheme,
} from '../../../../design';
import { format, strings } from '../../../../i18n';
import { formatSlot, type VenueOption } from '../../controller/venueRequestLogic';
import { VenueMapView } from './VenueMapView';
import { useState } from 'react';

const t = strings.venuesInstructor;

interface Props {
  options: VenueOption[];
  capacity: number;
  facilityId: string | null;
  slotId: string | null;
  mapAvailable: boolean;
  attribution: string;
  onFacility: (id: string) => void;
  onSlot: (id: string) => void;
}

export function VenuePicker(p: Props) {
  const { spacing } = useTheme();
  const [view, setView] = useState<'list' | 'map'>('list');
  const chosen = p.options.find((o) => o.facility.id === p.facilityId) ?? null;
  if (p.options.length === 0) {
    return <EmptyState title={t.noVenuesTitle} message={t.noVenuesMessage} />;
  }
  return (
    <View style={{ gap: spacing.md }}>
      <AppText variant="title">{t.venuesHeading}</AppText>
      {p.mapAvailable ? (
        <Segmented
          options={[
            { value: 'list', label: t.viewList },
            { value: 'map', label: t.viewMap },
          ]}
          value={view}
          onChange={setView}
        />
      ) : (
        <AppText variant="caption" color="textMuted">
          {t.mapUnavailable}
        </AppText>
      )}
      {p.mapAvailable && view === 'map' ? (
        <VenueMapView
          options={p.options}
          selectedId={p.facilityId}
          onSelect={p.onFacility}
          attribution={p.attribution}
        />
      ) : null}
      {p.options.map((o) => (
        <ListItem
          key={o.facility.id}
          title={o.facility.name}
          subtitle={o.facility.address}
          meta={
            o.fits
              ? format(t.venueMeta, { capacity: o.facility.capacity, count: o.slots.length })
              : format(t.tooSmall, { needed: p.capacity })
          }
          right={o.facility.id === p.facilityId ? <Badge label="✓" tone="info" /> : undefined}
          onPress={o.fits ? () => p.onFacility(o.facility.id) : undefined}
        />
      ))}
      {chosen ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="title">
            {format(t.slotsHeading, { venue: chosen.facility.name })}
          </AppText>
          {chosen.slots.map((s) => (
            <Button
              key={s.id}
              label={formatSlot(s)}
              variant={s.id === p.slotId ? 'primary' : 'secondary'}
              accessibilityHint={t.pickSlot}
              onPress={() => p.onSlot(s.id)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
