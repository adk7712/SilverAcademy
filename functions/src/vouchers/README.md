# vouchers

Wallet, points ledger, voucher redemption, inventory (UC #1-5, #1-6, #1-7, #5-4; architecture.md 4.4, 4.5; ADR-011/012).

| Callable                    | Roles             | Handler                        | Repo                          |
| --------------------------- | ----------------- | ------------------------------ | ----------------------------- |
| `vouchers-redeemVoucher`    | SENIOR_INSTRUCTOR | `handlers/redeemVoucher.ts`    | `repo/redeemRepo.ts` (one tx) |
| `vouchers-listMyVouchers`   | SENIOR_INSTRUCTOR | `handlers/listMyVouchers.ts`   | `repo/inventoryRepo.ts`       |
| `vouchers-upsertTier`       | ADMIN             | `handlers/upsertTier.ts`       | `repo/adminRepo.ts`           |
| `vouchers-uploadVouchers`   | ADMIN             | `handlers/uploadVouchers.ts`   | `repo/uploadRepo.ts` (one tx) |
| `vouchers-setVoucherStatus` | ADMIN             | `handlers/setVoucherStatus.ts` | `repo/adminRepo.ts`           |
| `vouchers-listInventory`    | ADMIN             | `handlers/listInventory.ts`    | `repo/inventoryRepo.ts`       |

Pure rules: `controller/decideRedeem.ts`, `controller/decideUpload.ts` (`planUpload`, `decideUpload`, `voucherDocId`),
`controller/decideAdmin.ts`, `controller/views.ts` (masking). Wallet, points history and the tier catalogue are direct
client reads (`wallets/{uid}`, `wallets/{uid}/ledger`, `voucherTiers`); no callable.

Codes: only `redeemVoucher` and `listMyVouchers` return raw codes. Ledger, audit, upload summaries and admin listings
carry ids or `****1234`. Never log a code.

Tests: `vouchers.test.ts` (unit), `vouchers.emu.test.ts` (emulator: FIFO pick, rollback, concurrent last-voucher /
last-points races, upload dedupe incl. concurrent uploads, status change, pagination).
