// UC #1-7 RedeemVoucher: choose tier, confirm, call redeemVoucher, show code; handles all failure codes.
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
import { useRedeem } from '../controller/useRedeem';
import { useWallet } from '../controller/useWallet';
import { isAffordable } from '../controller/voucherLogic';
import { ConfirmDialog } from './ConfirmDialog';
import { TierCard } from './TierCard';
import { VoucherCode } from './VoucherCode';
import type { RedeemFailure } from '../types';

const v = strings.vouchers;

function failureMessage(f: RedeemFailure): string {
  if (f.kind === 'INSUFFICIENT')
    return format(v.insufficient, { required: f.required, balance: f.balance });
  return f.kind === 'BUSY' ? v.busyRetry : f.message;
}

export function RedeemVoucherScreen() {
  const { spacing } = useTheme();
  const { wallet, tiers, loading, offline } = useWallet(false);
  const r = useRedeem();
  const balance = wallet?.balance ?? 0;

  if (r.result) {
    return (
      <Screen title={v.redeemTitle}>
        <AppText variant="heading" color="onSuccess">
          {v.successTitle}
        </AppText>
        <VoucherCode code={r.result.code} provider={r.result.provider} />
        <AppText>{v.successBody}</AppText>
        <AppText variant="bodyStrong">
          {format(v.balanceAfter, { n: r.result.balanceAfter })}
        </AppText>
        <Button label={v.redeemAnother} variant="secondary" onPress={r.reset} />
      </Screen>
    );
  }

  const name = r.selected
    ? format(v.tierName, {
        provider: r.selected.providerName,
        denomination: r.selected.denomination,
      })
    : '';
  return (
    <Screen title={v.redeemTitle}>
      {offline ? <ErrorBanner message={v.balanceUnavailable} /> : null}
      <Card>
        <AppText color="textMuted">{v.balanceLabel}</AppText>
        <AppText variant="display" color="primary">
          {wallet ? format(v.pointsUnit, { n: balance }) : v.balanceUnknown}
        </AppText>
      </Card>
      {r.failure ? (
        <ErrorBanner
          message={failureMessage(r.failure)}
          onRetry={r.failure.kind === 'BUSY' ? r.openConfirm : undefined}
        />
      ) : null}
      <AppText variant="heading">{v.tiersHeading}</AppText>
      {loading ? <LoadingState /> : null}
      {!loading && tiers.length === 0 ? <AppText>{v.tiersEmpty}</AppText> : null}
      <View accessibilityRole="radiogroup" style={{ gap: spacing.smd }}>
        {tiers.map((t) => (
          <TierCard
            key={t.id}
            tier={t}
            balance={balance}
            selected={r.selected?.id === t.id}
            onPress={() => r.select(t)}
          />
        ))}
      </View>
      {r.selected ? (
        <Button
          label={v.redeemAction}
          onPress={r.openConfirm}
          disabled={!isAffordable(r.selected, balance) || r.submitting}
        />
      ) : (
        <AppText color="textMuted">{v.redeemSelectFirst}</AppText>
      )}
      <ConfirmDialog
        visible={r.confirming}
        title={v.confirmTitle}
        body={
          r.selected
            ? format(v.confirmBody, {
                name,
                cost: r.selected.pointsCost,
                after: balance - r.selected.pointsCost,
              })
            : ''
        }
        confirmLabel={v.confirmYes}
        busy={r.submitting}
        onConfirm={() => void r.confirm()}
        onCancel={r.cancelConfirm}
      />
    </Screen>
  );
}
