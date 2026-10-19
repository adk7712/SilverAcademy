// UC #1-4 #3-4 large high-contrast result banner for a scan (success, or a distinct error per cause).
import { View } from 'react-native';
import { AppText, Button, useTheme, type ColorName } from '../../../design';
import { format, strings } from '../../../i18n';
import { errorMessage } from '../../../services/errors/errorMessage';
import { shouldShowPoints } from '../controller/scanLogic';
import { formatDateTime } from '../controller/workshopOptions';
import type { ScanFailure, ScanOutcome, WorkshopSource } from '../types';

const s = strings.attendanceScan;

type Palette = { bg: ColorName; fg: ColorName };
const SUCCESS: Palette = { bg: 'successBg', fg: 'onSuccess' };
const WARN: Palette = { bg: 'warningBg', fg: 'onWarning' };
const DANGER: Palette = { bg: 'danger', fg: 'onDanger' };

function failureText(o: ScanFailure): { title: string; body: string; palette: Palette } {
  const title = s.errorTitles[o.kind];
  switch (o.kind) {
    case 'ALREADY_ATTENDED': {
      const body =
        o.learnerName && o.attendedAt
          ? format(s.errorBodies.ALREADY_ATTENDED, {
              name: o.learnerName,
              when: `at ${formatDateTime(o.attendedAt)}`,
            })
          : s.errorBodies.ALREADY_ATTENDED_UNKNOWN;
      return { title, body, palette: WARN };
    }
    case 'WINDOW_CLOSED':
      return { title, body: s.errorBodies.WINDOW_CLOSED, palette: WARN };
    case 'OTHER':
      return { title, body: errorMessage(o.error), palette: DANGER };
    default:
      return { title, body: s.errorBodies[o.kind], palette: DANGER };
  }
}

interface Props {
  outcome: ScanOutcome;
  source: WorkshopSource;
  onNext: () => void;
}

export function ScanResultBanner({ outcome, source, onNext }: Props) {
  const { colors, spacing, radius } = useTheme();
  const view =
    outcome.status === 'success'
      ? { title: s.successTitle, body: outcome.learnerName, palette: SUCCESS }
      : failureText(outcome);
  const fg = colors[view.palette.fg];
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      testID="scan-result"
      style={{
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.lg,
        backgroundColor: colors[view.palette.bg],
      }}
    >
      <AppText variant="display" style={{ color: fg }}>
        {view.title}
      </AppText>
      <AppText variant="heading" style={{ color: fg }}>
        {view.body}
      </AppText>
      {outcome.status === 'success' ? (
        <View style={{ gap: spacing.xs }}>
          <AppText variant="title" style={{ color: fg }}>
            {outcome.workshopTitle}
          </AppText>
          {outcome.method === 'MANUAL' ? (
            <AppText style={{ color: fg }}>{s.successMethodCode}</AppText>
          ) : null}
          {shouldShowPoints(source, outcome.pointsAwarded) ? (
            <AppText variant="bodyStrong" style={{ color: fg }}>
              {format(s.successPoints, { points: outcome.pointsAwarded })}
            </AppText>
          ) : null}
        </View>
      ) : null}
      <Button
        label={outcome.status === 'success' ? s.scanNext : s.tryAgain}
        variant={outcome.status === 'success' ? 'secondary' : 'primary'}
        onPress={onNext}
        testID="scan-next"
      />
    </View>
  );
}
