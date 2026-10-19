// UC #1-5 ViewWallet + UC #1-6 ViewPointsHistory: balance, lifetime points, reward tiers, expandable ledger.
import { useState } from 'react';
import { View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  ErrorBanner,
  LoadingState,
  Screen,
  useTheme,
} from '../../../design';
import { format, strings } from '../../../i18n';
import { useAppNavigation } from '../../../navigation';
import { useWallet } from '../controller/useWallet';
import type { TierView } from '../types';
import { PointsHistory } from './PointsHistory';
import { TierCard } from './TierCard';

export function WalletScreen() {
  const { spacing } = useTheme();
  const navigation = useAppNavigation();
  const { wallet, tiers, ledger, loading, offline } = useWallet(true);
  const [selected, setSelected] = useState<TierView | null>(null);
  const balance = wallet?.balance ?? 0;
  const v = strings.vouchers;

  return (
    <Screen title={v.walletTitle}>
      {offline ? <ErrorBanner message={v.balanceUnavailable} /> : null}
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <Card>
            <AppText color="textMuted">{v.balanceLabel}</AppText>
            <AppText variant="display" color="primary">
              {wallet ? format(v.pointsUnit, { n: balance }) : v.balanceUnknown}
            </AppText>
            <AppText>
              {v.lifetimeLabel}: {wallet?.lifetimeEarned ?? 0}
            </AppText>
          </Card>
          <AppText variant="heading">{v.tiersHeading}</AppText>
          {tiers.length === 0 ? <AppText>{v.tiersEmpty}</AppText> : null}
          <View accessibilityRole="radiogroup" style={{ gap: spacing.smd }}>
            {tiers.map((t) => (
              <TierCard
                key={t.id}
                tier={t}
                balance={balance}
                selected={selected?.id === t.id}
                onPress={() => setSelected(t)}
              />
            ))}
          </View>
          <Button label={v.openRedeem} onPress={() => navigation.navigate('RedeemVoucher')} />
          <Button
            label={v.myVouchersAction}
            variant="secondary"
            onPress={() => navigation.navigate('MyVouchers')}
          />
          <PointsHistory rows={ledger} />
        </>
      )}
    </Screen>
  );
}
