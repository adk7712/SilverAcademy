// UC #1-5 #1-7 Large selectable reward card: points required and whether it is affordable.
import { Pressable, View } from 'react-native';
import { AppText, Badge, useTheme } from '../../../design';
import { format, strings } from '../../../i18n';
import { shortfall } from '../controller/voucherLogic';
import type { TierView } from '../types';

interface Props {
  tier: TierView;
  balance: number;
  selected: boolean;
  onPress: () => void;
}

export function TierCard({ tier, balance, selected, onPress }: Props) {
  const { colors, spacing, radius, sizes } = useTheme();
  const missing = shortfall(tier, balance);
  const name = format(strings.vouchers.tierName, {
    provider: tier.providerName,
    denomination: tier.denomination,
  });
  const cost = format(strings.vouchers.tierCost, { n: tier.pointsCost });
  const status =
    missing === 0
      ? strings.vouchers.tierAffordable
      : format(strings.vouchers.tierShortfall, { n: missing });
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${name}, ${cost}, ${status}`}
      style={({ pressed }) => ({
        minHeight: sizes.listItemMinHeight * 1.5,
        padding: spacing.md,
        gap: spacing.xs,
        borderRadius: radius.lg,
        borderWidth: selected ? sizes.focusBorderWidth : sizes.borderWidth,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.secondaryBg : colors.background,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <AppText variant="title">{name}</AppText>
      <AppText variant="heading" color="primary">
        {cost}
      </AppText>
      <View>
        <Badge label={status} tone={missing === 0 ? 'success' : 'warning'} />
      </View>
    </Pressable>
  );
}
