// UC #2-1 SearchWorkshops: Learner discover list with keyword, filters, distance sort and recommendations.
import { useState } from 'react';
import { View } from 'react-native';
import {
  AppText,
  Button,
  EmptyState,
  ErrorBanner,
  LoadingState,
  Screen,
  TextField,
  useTheme,
} from '../../../../design';
import { strings } from '../../../../i18n';
import { useAppNavigation } from '../../../../navigation';
import { useLearnerDiscover } from '../../controller/useLearnerDiscover';
import { FilterPanel } from './FilterPanel';
import { WorkshopCard } from './WorkshopCard';

export function DiscoverScreen() {
  const { spacing } = useTheme();
  const s = strings.workshopsLearner;
  const navigation = useAppNavigation();
  const d = useLearnerDiscover();
  const [showFilters, setShowFilters] = useState(false);
  const open = (workshopId: string) => navigation.navigate('WorkshopDetail', { workshopId });

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
      {!d.loading && !d.error && d.recommended.length > 0 ? (
        <View style={{ gap: spacing.smd }}>
          <AppText variant="title">{s.recommendedTitle}</AppText>
          {d.recommended.map((w) => (
            <WorkshopCard key={`rec-${w.id}`} workshop={w} onPress={() => open(w.id)} />
          ))}
        </View>
      ) : null}
      {!d.loading && !d.error && d.results.length > 0 ? (
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
      {!d.loading && !d.error && d.results.length === 0 ? (
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
