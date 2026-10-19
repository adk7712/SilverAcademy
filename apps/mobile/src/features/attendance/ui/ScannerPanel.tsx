// UC #1-4 #3-4 scanner for one workshop: camera or manual code, result banner, haptic feedback.
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AppText, Button, useTheme } from '../../../design';
import { format, strings } from '../../../i18n';
import { useScanController } from '../controller/useScanController';
import type { ScanWorkshop } from '../types';
import { CameraScanner } from './CameraScanner';
import { ManualEntry } from './ManualEntry';
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
  const { state, onBarcode, submitManual, reset } = useScanController(workshop.id);
  const [manual, setManual] = useState(false);

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
          <ManualEntry busy={state.phase === 'submitting'} onSubmit={submitManual} />
          <Button label={s.useCamera} variant="secondary" onPress={() => setManual(false)} />
        </>
      ) : (
        <>
          <CameraScanner onCode={onBarcode} onUseManual={() => setManual(true)} />
          <Button label={s.useCode} variant="secondary" onPress={() => setManual(true)} />
        </>
      )}
      {onChangeWorkshop ? (
        <Button label={s.changeWorkshop} variant="ghost" onPress={onChangeWorkshop} />
      ) : null}
    </View>
  );
}
