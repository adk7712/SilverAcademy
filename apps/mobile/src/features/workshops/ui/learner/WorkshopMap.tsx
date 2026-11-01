// UC #2-1 #2-2 OpenStreetMap tile map with venue pins (no SDK or token). Calls onError when every tile fails so the
// screen can fall back to the list view (ADR-003); a few missing tiles just show as blank squares.
import { useRef, useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { OSM_ATTRIBUTION, TILE_SIZE, fitTileView, type LatLng } from '@silveracademy/shared';
import { AppText, useTheme } from '../../../../design';

const MAP_HEIGHT = 280;
const PIN_SIZE = 48;
// OSM tile policy asks apps to identify themselves with contact details; browsers set their own User-Agent.
const TILE_HEADERS =
  Platform.OS === 'web'
    ? undefined
    : { 'User-Agent': 'SilverAcademy/0.1 (NTU SC2006 student prototype; github.com/adk7712)' };

export interface MapPinItem extends LatLng {
  id: string;
  /** Spoken label, e.g. venue name and workshop count. */
  label: string;
  /** Short text inside the pin. */
  text: string;
}

interface Props {
  pins: MapPinItem[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onError: () => void;
}

export function WorkshopMap({ pins, selectedId = null, onSelect, onError }: Props) {
  const { colors, radius, sizes, spacing } = useTheme();
  const [width, setWidth] = useState(0);
  // A ref, not state: several tiles can fail in the same tick.
  const failed = useRef(new Set<string>());
  const view = fitTileView(pins, width, MAP_HEIGHT);
  const tileFailed = (key: string) => {
    failed.current.add(key);
    if (view && view.tiles.every((t) => failed.current.has(t.key))) onError();
  };
  return (
    <View style={{ gap: spacing.xs }}>
      <View
        onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
        style={{
          height: MAP_HEIGHT,
          borderRadius: radius.md,
          borderWidth: sizes.borderWidth,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          overflow: 'hidden',
        }}
      >
        {view?.tiles.map((t) => (
          <Image
            key={t.key}
            source={{ uri: t.url, headers: TILE_HEADERS }}
            onError={() => tileFailed(t.key)}
            accessible={false}
            style={{
              position: 'absolute',
              left: t.left,
              top: t.top,
              width: TILE_SIZE,
              height: TILE_SIZE,
            }}
          />
        ))}
        {view?.pins.map(({ item, x, y }) => {
          const selected = item.id === selectedId;
          return (
            <Pressable
              key={item.id}
              onPress={onSelect ? () => onSelect(item.id) : undefined}
              disabled={!onSelect}
              accessibilityRole={onSelect ? 'button' : 'image'}
              accessibilityLabel={item.label}
              accessibilityState={onSelect ? { selected } : undefined}
              testID={`map-pin-${item.id}`}
              style={{
                position: 'absolute',
                left: x - PIN_SIZE / 2,
                top: y - PIN_SIZE / 2,
                width: PIN_SIZE,
                height: PIN_SIZE,
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
                {item.text}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <AppText variant="caption" color="textMuted" style={{ alignSelf: 'flex-end' }}>
        {OSM_ATTRIBUTION}
      </AppText>
    </View>
  );
}
