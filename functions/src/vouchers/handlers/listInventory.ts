// UC #5-4 FR 6.27 vouchers-listInventory: admin inventory page with masked codes (counts come from voucherTiers).
import type { Firestore } from 'firebase-admin/firestore';
import type { VoucherStatus } from '@silveracademy/shared';
import { defineCallable } from '../../common';
import { INVENTORY_PAGE_DEFAULT } from '../constants';
import { listInventoryPage } from '../repo/inventoryRepo';

export async function listInventory(
  db: Firestore,
  input: { tierId?: string; status?: VoucherStatus; limit?: number; startAfterId?: string },
) {
  return listInventoryPage(db, { ...input, limit: input.limit ?? INVENTORY_PAGE_DEFAULT });
}

export const listInventoryCallable = defineCallable(
  'vouchers-listInventory',
  { roles: ['ADMIN'], auditOnDeny: true },
  async ({ input, db }) => listInventory(db, input),
);
