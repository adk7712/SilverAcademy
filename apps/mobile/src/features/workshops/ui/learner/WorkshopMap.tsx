// UC #2-1 #2-2 OpenStreetMap tile map with venue pins (no SDK or token). Calls onError when every tile fails so the
// screen can fall back to the list view (ADR-003).
import { useRef, useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { OSM_ATTRIBUTION, TILE_SIZE, fitTileView, type LatLng } from '@silveracademy/shared';
import { AppText, useTheme } from '../../../../design';

const MAP_HEIGHT = 280;
const PIN_SIZE = 48;
// OSM tile policy asks apps to identify themselves; browsers set their own User-Agent.
const HEADERS =
  Platform.OS === 'web'
    ? undefined
    : { 'User-Agent': 'SilverAcademy/0.1 (NTU SC2006; github.com/adk7712)' };

interface Props {
  pins: (LatLng & { id: string; label: string; text?: string })[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onError: () => void;
}

export function WorkshopMap({ pins, selectedId, onSelect, onError }: Props) {
  const { colors, radius, sizes, spacing } = useTheme();
  const [width, setWidth] = useState(0);
  const failed = useRef(new Set<string>()); // a ref: several tiles can fail in one tick
  const view = fitTileView(pins, width, MAP_HEIGHT);
  const tileFailed = (key: string) => {
    failed.current.add(key);
    if (view?.tiles.every((t) => failed.current.has(t.key))) onError();
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
            source={{ uri: t.url, headers: HEADERS }}
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
              onPress={onSelect && (() => onSelect(item.id))}
              disabled={!onSelect}
              accessibilityRole={onSelect ? 'button' : 'image'}
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
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
