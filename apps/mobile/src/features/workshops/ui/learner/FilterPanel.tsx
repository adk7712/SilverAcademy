// UC #2-1 SearchWorkshops: category, date range, sort controls and reset.
import { View } from 'react-native';
import { WORKSHOP_CATEGORIES, type WorkshopCategory } from '@silveracademy/shared';
import { AppText, Button, Segmented, Select, TextField, useTheme } from '../../../../design';
import { strings } from '../../../../i18n';
import type {
  DateErrors,
  DiscoverSort,
  DiscoverState,
} from '../../controller/learnerDiscoverLogic';

interface Props {
  filters: DiscoverState;
  dateErrors: DateErrors;
  onChange: (patch: Partial<DiscoverState>) => void;
  onSort: (sort: DiscoverSort) => void;
  onReset: () => void;
}

const ALL = 'ALL';

export function FilterPanel({ filters, dateErrors, onChange, onSort, onReset }: Props) {
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
      <TextField
        label={s.fromLabel}
        value={filters.from}
        onChangeText={(from) => onChange({ from })}
        placeholder="2026-11-01"
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        error={dateErrors.from ? s.dateInvalid : undefined}
      />
      <TextField
        label={s.toLabel}
        value={filters.to}
        onChangeText={(to) => onChange({ to })}
        placeholder="2026-11-30"
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        error={dateErrors.to || dateErrors.order ? s.dateInvalid : undefined}
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
