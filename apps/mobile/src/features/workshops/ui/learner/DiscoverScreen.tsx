// UC #2-1 SearchWorkshops: Learner discover list or map with keyword, filters, distance sort and recommendations.
import { useState } from 'react';
import { View } from 'react-native';
import {
  AppText,
  Button,
  EmptyState,
  ErrorBanner,
  LoadingState,
  Screen,
  Segmented,
  TextField,
  useTheme,
} from '../../../../design';
import { format, strings } from '../../../../i18n';
import { useAppNavigation } from '../../../../navigation';
import { venuePins } from '../../controller/learnerDiscoverLogic';
import { useLearnerDiscover } from '../../controller/useLearnerDiscover';
import { FilterPanel } from './FilterPanel';
import { WorkshopCard } from './WorkshopCard';
import { WorkshopMap } from './WorkshopMap';

type DiscoverView = 'LIST' | 'MAP';

export function DiscoverScreen() {
  const { spacing } = useTheme();
  const s = strings.workshopsLearner;
  const navigation = useAppNavigation();
  const d = useLearnerDiscover();
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<DiscoverView>('LIST');
  const [mapFailed, setMapFailed] = useState(false);
  const [venueId, setVenueId] = useState<string | null>(null);
  const open = (workshopId: string) => navigation.navigate('WorkshopDetail', { workshopId });
  const ready = !d.loading && !d.error;
  const pins = venuePins(d.results);
  // List view is the fallback when the map fails or nothing has a venue (ADR-003).
  const showMap = view === 'MAP' && !mapFailed && pins.length > 0;
  const selected = pins.find((p) => p.id === venueId);

  return (
    <Screen title={strings.workshops.discoverTitle}>
      <TextField
        label={s.searchLabel}
        value={d.filters.keyword}
        onChangeText={(keyword) => d.update({ keyword })}
        placeholder={s.searchPlaceholder}
        autoCorrect={false}
        returnKeyType="search"
        testID="discover-search"
      />
      <Segmented
        value={view === 'MAP' && !mapFailed ? 'MAP' : 'LIST'}
        onChange={(v: DiscoverView) => {
          setView(v);
          if (v === 'MAP') setMapFailed(false);
        }}
        options={[
          { value: 'LIST', label: s.viewList, accessibilityLabel: `${s.viewLabel} ${s.viewList}` },
          { value: 'MAP', label: s.viewMap, accessibilityLabel: `${s.viewLabel} ${s.viewMap}` },
        ]}
        testID="discover-view"
      />
      <Button
        label={showFilters ? s.hideFilters : s.showFilters}
        variant="secondary"
        onPress={() => setShowFilters((v) => !v)}
      />
      {showFilters ? (
        <FilterPanel
          filters={d.filters}
          dateErrors={d.dateErrors}
          onChange={d.update}
          onSort={d.setSort}
          onReset={d.reset}
        />
      ) : null}
      {!showFilters && d.filtered ? (
        <Button label={s.resetFilters} variant="ghost" onPress={d.reset} />
      ) : null}
      {d.locationNotice === 'locating' ? <AppText color="textMuted">{s.locating}</AppText> : null}
      {d.locationNotice === 'denied' ? (
        <AppText color="textMuted">{s.locationDenied}</AppText>
      ) : null}
      {d.locationNotice === 'unavailable' ? (
        <AppText color="textMuted">{s.locationUnavailable}</AppText>
      ) : null}
      {d.error ? <ErrorBanner message={`${s.loadFailed} ${d.error}`} onRetry={d.reload} /> : null}
      {d.loading ? <LoadingState /> : null}
      {ready && view === 'MAP' && mapFailed ? (
        <AppText color="textMuted">{s.mapFailed}</AppText>
      ) : null}
      {ready && view === 'MAP' && !mapFailed && pins.length === 0 && d.results.length > 0 ? (
        <AppText color="textMuted">{s.mapNoPlaces}</AppText>
      ) : null}
      {ready && showMap ? (
        <View style={{ gap: spacing.smd }}>
          <WorkshopMap
            pins={pins.map((p) => ({
              id: p.id,
              lat: p.lat,
              lng: p.lng,
              text: String(p.workshops.length),
              label: format(p.workshops.length === 1 ? s.mapPinOne : s.mapPinMany, {
                venue: p.name,
                n: p.workshops.length,
              }),
            }))}
            selectedId={selected?.id ?? null}
            onSelect={setVenueId}
            onError={() => setMapFailed(true)}
          />
          {selected ? (
            <>
              <AppText variant="title">{selected.name}</AppText>
              {selected.workshops.map((w) => (
                <WorkshopCard
                  key={`map-${w.id}`}
                  workshop={w}
                  distanceKm={w.distanceKm}
                  onPress={() => open(w.id)}
                />
              ))}
            </>
          ) : (
            <AppText color="textMuted">{s.mapHint}</AppText>
          )}
        </View>
      ) : null}
      {ready && !showMap && d.recommended.length > 0 ? (
        <View style={{ gap: spacing.smd }}>
          <AppText variant="title">{s.recommendedTitle}</AppText>
          {d.recommended.map((w) => (
            <WorkshopCard key={`rec-${w.id}`} workshop={w} onPress={() => open(w.id)} />
          ))}
        </View>
      ) : null}
      {ready && !showMap && d.results.length > 0 ? (
        <View style={{ gap: spacing.smd }}>
          <AppText variant="title">{s.allTitle}</AppText>
          {d.results.map((w) => (
            <WorkshopCard
              key={w.id}
              workshop={w}
              distanceKm={w.distanceKm}
              onPress={() => open(w.id)}
            />
          ))}
        </View>
      ) : null}
      {ready && d.results.length === 0 ? (
        <EmptyState
          title={d.totalOpen === 0 ? s.noOpenTitle : s.noResultsTitle}
          message={d.totalOpen === 0 ? s.noOpenMessage : s.noResultsMessage}
          actionLabel={d.filtered ? s.resetFilters : undefined}
          onAction={d.filtered ? d.reset : undefined}
        />
      ) : null}
    </Screen>
  );
}
