// UC #2-3 ViewTicket: large pure black-on-white QR (high contrast, quiet zone) from the signed qrPayload.
import { View, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../../../../design';

const MAX_QR_SIZE = 360;
const QUIET_ZONE = 16;
const SCREEN_MARGIN = 64;

export function QrCodeView({ value, label }: { value: string; label: string }) {
  const { width } = useWindowDimensions();
  const size = Math.min(MAX_QR_SIZE, width - SCREEN_MARGIN);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ alignSelf: 'center', padding: QUIET_ZONE, backgroundColor: colors.qrBackground }}
    >
      <QRCode
        value={value}
        size={size}
        color={colors.qrForeground}
        backgroundColor={colors.qrBackground}
        ecl="M"
      />
    </View>
  );
}
