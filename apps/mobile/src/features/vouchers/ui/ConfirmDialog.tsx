// UC #1-7 Accessible confirm dialog (large buttons) used before spending points.
import { Modal, View } from 'react-native';
import { AppText, Button, useTheme } from '../../../design';
import { strings } from '../../../i18n';

interface Props {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: Props) {
  const { colors, spacing, radius } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: spacing.md,
          backgroundColor: colors.scrim,
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            gap: spacing.md,
            padding: spacing.lg,
            borderRadius: radius.lg,
            backgroundColor: colors.background,
          }}
        >
          <AppText variant="heading">{title}</AppText>
          <AppText>{body}</AppText>
          <Button label={confirmLabel} onPress={onConfirm} loading={busy} />
          <Button
            label={strings.common.cancel}
            variant="secondary"
            onPress={onCancel}
            disabled={busy}
          />
        </View>
      </View>
    </Modal>
  );
}
