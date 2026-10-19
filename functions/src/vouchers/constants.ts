// UC #1-7 #5-4 vouchers module constants (architecture.md 4.4, 4.5). No magic numbers in repos/handlers.
/** Firestore per-commit write cap; the upload tx must stay below it (arch 4.5 write budget). */
export const MAX_TX_WRITES = 500;
/** Non-voucher writes in the upload tx: `voucherUploads/{batchId}` + `auditLogs`. */
export const UPLOAD_FIXED_WRITES = 2;
/** Default page size for `vouchers-listInventory`. */
export const INVENTORY_PAGE_DEFAULT = 50;
