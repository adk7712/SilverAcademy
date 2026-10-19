# vouchers

Wallet, points ledger, voucher redemption, inventory.

Placeholders wired into navigation (WalletScreen, RedeemVoucherScreen, MyVouchersScreen). Strings: `src/i18n/en/vouchers.ts`.

Layers: `ui/` (WalletScreen, RedeemVoucherScreen, MyVouchersScreen, TierCard, PointsHistory, VoucherCode, ConfirmDialog) -> `controller/` (useWallet, useRedeem, useMyVouchers, pure `voucherLogic.ts` with tests) -> `repo/` (Firestore listeners, callable wrappers).
