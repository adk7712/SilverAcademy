// UC #1-3 schematic venue map (pins from lat/lng, no tiles); used only when MapProvider is available.
import { Pressable, View } from 'react-native';
import { AppText, useTheme } from '../../../../design';
import { strings } from '../../../../i18n';
import { projectPins } from '../../controller/venueRequestLogic';
import type { VenueOption } from '../../controller/venueRequestLogic';

const MAP_HEIGHT = 260;
const PIN_SIZE = 48;

interface Props {
  options: VenueOption[];
  selectedId: string | null;
  onSelect: (facilityId: string) => void;
  attribution: string;
}

export function VenueMapView({ options, selectedId, onSelect, attribution }: Props) {
  const { colors, radius, spacing, sizes } = useTheme();
  const pins = projectPins(options.map((o) => o.facility));
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="caption" color="textMuted">
        {strings.venuesInstructor.mapNote}
      </AppText>
      <View
        style={{
          height: MAP_HEIGHT,
          borderRadius: radius.md,
          borderWidth: sizes.borderWidth,
          borderColor: colors.border,
          backgroundColor: colors.infoBg,
          overflow: 'hidden',
        }}
      >
        {pins.map((p) => {
          const selected = p.facilityId === selectedId;
          return (
            <Pressable
              key={p.facilityId}
              onPress={() => onSelect(p.facilityId)}
              accessibilityRole="button"
              accessibilityLabel={p.name}
              accessibilityState={{ selected }}
              style={{
                position: 'absolute',
                left: `${p.xPct}%`,
                top: `${p.yPct}%`,
                width: PIN_SIZE,
                height: PIN_SIZE,
                marginLeft: -PIN_SIZE / 2,
                marginTop: -PIN_SIZE / 2,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selected ? colors.primary : colors.background,
                borderWidth: sizes.focusBorderWidth,
                borderColor: colors.primary,
              }}
            >
              <AppText
                variant="bodyStrong"
                style={{ color: selected ? colors.onPrimary : colors.primary }}
              >
                {p.name.slice(0, 1)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <AppText variant="caption" color="textMuted">
        {strings.venuesInstructor.attributionPrefix}
        {attribution}
      </AppText>
    </View>
  );
}
