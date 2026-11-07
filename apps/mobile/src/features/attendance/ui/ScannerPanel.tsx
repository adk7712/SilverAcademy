// UC #1-4 #3-4 scanner for one workshop: camera or session code (owner only), result banner, haptic feedback.
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AppText, Button, useTheme } from '../../../design';
import { format, strings } from '../../../i18n';
import { useScanController } from '../controller/useScanController';
import type { ScanWorkshop } from '../types';
import { CameraScanner } from './CameraScanner';
import { SessionCodeEntry } from './SessionCodeEntry';
import { ScanResultBanner } from './ScanResultBanner';

const s = strings.attendanceScan;

async function buzz(success: boolean) {
  try {
    await Haptics.notificationAsync(
      success ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    );
  } catch {
    // Haptics are optional (web, unsupported devices).
  }
}

interface Props {
  workshop: ScanWorkshop;
  onChangeWorkshop?: () => void;
}

export function ScannerPanel({ workshop, onChangeWorkshop }: Props) {
  const { spacing } = useTheme();
  const { state, onBarcode, reset } = useScanController(workshop.id);
  const [manual, setManual] = useState(false);
  // Only the instructor may set the session code; volunteers scan.
  const useCode = workshop.source === 'OWNED' ? () => setManual(true) : undefined;

  useEffect(() => {
    if (state.phase === 'result') void buzz(state.outcome.status === 'success');
  }, [state]);

  return (
    <View style={{ gap: spacing.md }}>
      <AppText variant="title">{format(s.scanningFor, { title: workshop.title })}</AppText>
      {state.phase === 'result' ? (
        <ScanResultBanner outcome={state.outcome} source={workshop.source} onNext={reset} />
      ) : manual ? (
        <>
          <SessionCodeEntry workshopId={workshop.id} />
          <Button label={s.useCamera} variant="secondary" onPress={() => setManual(false)} />
        </>
      ) : (
        <>
          <CameraScanner onCode={onBarcode} onUseManual={useCode} />
          {useCode ? <Button label={s.useCode} variant="secondary" onPress={useCode} /> : null}
        </>
      )}
      {onChangeWorkshop ? (
        <Button label={s.changeWorkshop} variant="ghost" onPress={onChangeWorkshop} />
      ) : null}
    </View>
  );
}
