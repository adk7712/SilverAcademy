// UC #1-4 #3-4 ScanAttendance: pick a workshop, then scan QR tickets continuously (Instructor and Volunteer).
import { useState } from 'react';
import { Screen } from '../../../design';
import { strings } from '../../../i18n';
import { useAppRoute } from '../../../navigation';
import { useScannableWorkshops } from '../controller/useScannableWorkshops';
import type { ScanWorkshop } from '../types';
import { ScannerPanel } from './ScannerPanel';
import { WorkshopPicker } from './WorkshopPicker';

export function ScanAttendanceScreen() {
  // The Volunteer tab route has no params, hence the optional chain.
  const passedId = useAppRoute<'ScanAttendance'>().params?.workshopId;
  const { workshops, error, reload } = useScannableWorkshops();
  const [picked, setPicked] = useState<ScanWorkshop | null>(null);
  const [dismissedPassed, setDismissedPassed] = useState(false);

  const fromParam =
    !dismissedPassed && passedId ? (workshops?.find((w) => w.id === passedId) ?? null) : null;
  const active = picked ?? fromParam;

  return (
    <Screen title={strings.attendance.scanTitle}>
      {active ? (
        <ScannerPanel
          key={active.id}
          workshop={active}
          onChangeWorkshop={() => {
            setPicked(null);
            setDismissedPassed(true);
          }}
        />
      ) : (
        <WorkshopPicker workshops={workshops} error={error} onRetry={reload} onPick={setPicked} />
      )}
    </Screen>
  );
}
