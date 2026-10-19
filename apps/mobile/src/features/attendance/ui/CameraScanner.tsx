// UC #1-4 #3-4 Expo Camera QR view with permission handling; calls onCode for each barcode read.
import { useEffect } from 'react';
import { Linking, Platform, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AppText, Button, LoadingState, useTheme } from '../../../design';
import { strings } from '../../../i18n';

const s = strings.attendanceScan;
const CAMERA_HEIGHT = 320;

interface Props {
  onCode: (raw: string) => void;
  onUseManual: () => void;
}

export function CameraScanner({ onCode, onUseManual }: Props) {
  const { colors, spacing, radius } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();

  const needsPrompt = !!permission && !permission.granted && permission.canAskAgain;
  useEffect(() => {
    if (needsPrompt) void requestPermission();
  }, [needsPrompt, requestPermission]);

  if (!permission) return <LoadingState label={s.cameraStarting} />;

  if (!permission.granted) {
    return (
      <View style={{ gap: spacing.md }}>
        <AppText variant="title">{s.cameraPermissionTitle}</AppText>
        <AppText>{permission.canAskAgain ? s.cameraPermissionBody : s.cameraDeniedBody}</AppText>
        {permission.canAskAgain ? (
          <Button label={s.allowCamera} onPress={() => void requestPermission()} />
        ) : Platform.OS !== 'web' ? (
          <Button label={s.openSettings} onPress={() => void Linking.openSettings()} />
        ) : null}
        <Button label={s.useCode} variant="secondary" onPress={onUseManual} />
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View
        style={{
          height: CAMERA_HEIGHT,
          overflow: 'hidden',
          borderRadius: radius.lg,
          backgroundColor: colors.text,
        }}
      >
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => onCode(data)}
          onMountError={onUseManual}
          accessibilityLabel={s.pointCameraHint}
        />
      </View>
      <AppText color="textMuted" style={{ textAlign: 'center' }}>
        {s.pointCameraHint}
      </AppText>
    </View>
  );
}
