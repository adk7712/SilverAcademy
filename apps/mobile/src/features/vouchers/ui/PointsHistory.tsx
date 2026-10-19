// UC #1-6 ViewPointsHistory: expandable read-only chronological ledger (newest first).
import { useState } from 'react';
import { View } from 'react-native';
import { AppText, Button, Card, useTheme } from '../../../design';
import { format, strings } from '../../../i18n';
import { formatDate, ledgerTitle } from '../controller/voucherLogic';
import type { LedgerRow } from '../types';

const TYPE_LABEL = {
  EARN_ATTENDANCE: strings.vouchers.historyEarned,
  REDEEM_VOUCHER: strings.vouchers.historyRedeemed,
  ADJUSTMENT: strings.vouchers.historyAdjusted,
} as const;

export function PointsHistory({ rows }: { rows: readonly LedgerRow[] }) {
  const { spacing } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: spacing.smd }}>
      <Button
        label={open ? strings.vouchers.historyHide : strings.vouchers.historyShow}
        variant="secondary"
        expanded={open}
        onPress={() => setOpen((o) => !o)}
      />
      {open && rows.length === 0 ? <AppText>{strings.vouchers.historyEmpty}</AppText> : null}
      {open
        ? rows.map((r) => (
            <Card key={r.id}>
              <AppText variant="bodyStrong">{ledgerTitle(r)}</AppText>
              <AppText color="textMuted">
                {format(strings.common.labelDot, {
                  label: TYPE_LABEL[r.type],
                  value: formatDate(r.createdAtMs),
                })}
              </AppText>
              <AppText variant="title" color={r.amount < 0 ? 'danger' : 'onSuccess'}>
                {format(
                  r.amount < 0
                    ? strings.vouchers.historyAmountMinus
                    : strings.vouchers.historyAmountPlus,
                  {
                    n: Math.abs(r.amount),
                  },
                )}
              </AppText>
              <AppText variant="caption" color="textMuted">
                {format(strings.vouchers.historyBalanceAfter, { n: r.balanceAfter })}
              </AppText>
            </Card>
          ))
        : null}
    </View>
  );
}
