// UC #2-1 SearchWorkshops: category, date window, postal code, sort controls and reset.
import { View } from 'react-native';
import { WORKSHOP_CATEGORIES, type WorkshopCategory } from '@silveracademy/shared';
import { AppText, Button, Segmented, Select, TextField, useTheme } from '../../../../design';
import { strings } from '../../../../i18n';
import type { DiscoverSort, DiscoverState } from '../../controller/learnerDiscoverLogic';

interface Props {
  filters: DiscoverState;
  onChange: (patch: Partial<DiscoverState>) => void;
  onSort: (sort: DiscoverSort) => void;
  onReset: () => void;
}

const ALL = 'ALL';

export function FilterPanel({ filters, onChange, onSort, onReset }: Props) {
  const { spacing } = useTheme();
  const s = strings.workshopsLearner;
  const options = [
    { value: ALL, label: s.categoryAll },
    ...WORKSHOP_CATEGORIES.map((c) => ({ value: c as string, label: s.categories[c] })),
  ];
  return (
    <View style={{ gap: spacing.md }}>
      <Select
        label={s.categoryLabel}
        options={options}
        value={filters.category ?? ALL}
        onChange={(v) => onChange({ category: v === ALL ? null : (v as WorkshopCategory) })}
      />
      <View style={{ gap: spacing.sm }}>
        <AppText variant="bodyStrong">{s.whenLabel}</AppText>
        <Segmented
          value={filters.days ?? 0}
          onChange={(days) => onChange({ days: days || null })}
          options={[
            { value: 0, label: s.whenAny },
            { value: 7, label: s.when7 },
            { value: 30, label: s.when30 },
          ]}
        />
      </View>
      <TextField
        label={s.postalLabel}
        helper={s.postalHelper}
        value={filters.postal}
        // A new postal code needs a fresh lookup, so "Nearest" must be chosen again.
        onChangeText={(postal) => onChange({ postal, sort: 'SOONEST' })}
        keyboardType="number-pad"
        maxLength={6}
      />
      <View style={{ gap: spacing.sm }}>
        <AppText variant="bodyStrong">{s.sortLabel}</AppText>
        <Segmented
          value={filters.sort}
          onChange={onSort}
          options={[
            { value: 'SOONEST', label: s.sortSoonest },
            { value: 'NEAREST', label: s.sortNearest },
          ]}
        />
      </View>
      <Button label={s.resetFilters} variant="secondary" onPress={onReset} />
    </View>
  );
}
