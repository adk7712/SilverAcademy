// UC #1-4 #3-4 workshop selection list for the scanner (own workshops or volunteer assignments).
import { View } from 'react-native';
import { Badge, EmptyState, ErrorBanner, ListItem, LoadingState, useTheme } from '../../../design';
import { strings } from '../../../i18n';
import { formatDateTime, windowHint } from '../controller/workshopOptions';
import type { ScanWorkshop } from '../types';

const s = strings.attendanceScan;

interface Props {
  workshops: ScanWorkshop[] | null;
  error: string | null;
  onRetry: () => void;
  onPick: (w: ScanWorkshop) => void;
}

export function WorkshopPicker({ workshops, error, onRetry, onPick }: Props) {
  const { spacing } = useTheme();
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />;
  if (!workshops) return <LoadingState />;
  if (workshops.length === 0)
    return <EmptyState title={s.noWorkshops} message={s.noWorkshopsHint} />;
  const now = Date.now();
  return (
    <View style={{ gap: spacing.sm }}>
      {workshops.map((w) => {
        const hint = windowHint(w, now);
        return (
          <ListItem
            key={w.id}
            title={w.title}
            subtitle={formatDateTime(w.startAtMs)}
            meta={w.source === 'OWNED' ? s.roleOwned : s.roleAssigned}
            right={
              hint === 'UNKNOWN' ? undefined : (
                <Badge
                  label={hint === 'OPEN' ? s.windowOpen : s.windowNotOpen}
                  tone={hint === 'OPEN' ? 'success' : 'neutral'}
                />
              )
            }
            onPress={() => onPick(w)}
            testID={`pick-${w.id}`}
          />
        );
      })}
    </View>
  );
}
