// UC #0-1 fake Singpass "app / QR" tab: plain placeholder box (not a scannable code); picking a demo account pretend-scans it.
import { View } from 'react-native';
import { AppText, useTheme } from '../../../design';
import { strings } from '../../../i18n';
import { QR_PLACEHOLDER_SIZE } from '../constants';
import { DemoAccountList } from './DemoAccountList';

interface SingpassQrTabProps {
  onScan: (profileId: string) => void;
}

export function SingpassQrTab({ onScan }: SingpassQrTabProps) {
  const { colors, spacing, radius, sizes } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      <View
        accessible
        accessibilityLabel={strings.auth.qrPlaceholder}
        testID="qr-placeholder"
        style={{
          alignSelf: 'center',
          width: QR_PLACEHOLDER_SIZE,
          height: QR_PLACEHOLDER_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: sizes.focusBorderWidth,
          borderStyle: 'dashed',
          borderColor: colors.border,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
        }}
      >
        <AppText color="textMuted" style={{ textAlign: 'center' }}>
          {strings.auth.qrPlaceholder}
        </AppText>
      </View>
      <AppText color="textMuted">{strings.auth.qrHelp}</AppText>
      <DemoAccountList onPick={onScan} />
    </View>
  );
}
