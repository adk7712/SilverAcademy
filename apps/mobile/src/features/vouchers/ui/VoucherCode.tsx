// UC #1-7 Voucher code shown prominently (large, monospace, selectable, high contrast).
import { View } from 'react-native';
import { AppText, useTheme } from '../../../design';
import { strings } from '../../../i18n';

export function VoucherCode({ code, provider }: { code: string; provider: string }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${strings.vouchers.codeLabel} ${code.split('').join(' ')}`}
      style={{
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.lg,
        borderRadius: radius.lg,
        borderWidth: 3,
        borderColor: colors.qrForeground,
        backgroundColor: colors.qrBackground,
      }}
    >
      <AppText variant="bodyStrong">{provider}</AppText>
      <AppText variant="caption" color="textMuted">
        {strings.vouchers.codeLabel}
      </AppText>
      <AppText
        variant="display"
        selectable
        style={{
          fontFamily: 'monospace',
          color: colors.qrForeground,
          textAlign: 'center',
          letterSpacing: 2,
        }}
      >
        {code}
      </AppText>
    </View>
  );
}
