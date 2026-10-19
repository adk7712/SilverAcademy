// UC #1-7 My vouchers: claimed vouchers via listMyVouchers; tap one to show its code large.
import { useState } from 'react';
import { Modal, View } from 'react-native';
import {
  AppText,
  Button,
  EmptyState,
  ErrorBanner,
  ListItem,
  LoadingState,
  Screen,
  useTheme,
} from '../../../design';
import { format, strings } from '../../../i18n';
import { useMyVouchers } from '../controller/useMyVouchers';
import { formatDate } from '../controller/voucherLogic';
import type { MyVoucherView } from '../types';
import { VoucherCode } from './VoucherCode';

const v = strings.vouchers;

export function MyVouchersScreen() {
  const { items, loading, error, reload } = useMyVouchers();
  const [open, setOpen] = useState<MyVoucherView | null>(null);
  const { colors, spacing } = useTheme();

  return (
    <Screen title={v.myVouchersTitle}>
      {error ? <ErrorBanner message={error} onRetry={() => void reload()} /> : null}
      {loading ? <LoadingState /> : null}
      {!loading && !error && items.length === 0 ? <EmptyState title={v.myVouchersEmpty} /> : null}
      {items.map((it) => (
        <ListItem
          key={it.voucherId}
          title={`${it.provider} S$${it.denomination}`}
          subtitle={format(v.voucherClaimed, { date: formatDate(Date.parse(it.claimedAt)) })}
          meta={v.voucherShowCode}
          onPress={() => setOpen(it)}
        />
      ))}
      <Modal visible={open !== null} animationType="slide" onRequestClose={() => setOpen(null)}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            gap: spacing.lg,
            padding: spacing.md,
            backgroundColor: colors.background,
          }}
        >
          {open ? (
            <VoucherCode code={open.code} provider={`${open.provider} S$${open.denomination}`} />
          ) : null}
          <Button label={v.codeClose} onPress={() => setOpen(null)} />
          <AppText color="textMuted" style={{ textAlign: 'center' }}>
            {v.successBody}
          </AppText>
        </View>
      </Modal>
    </Screen>
  );
}
