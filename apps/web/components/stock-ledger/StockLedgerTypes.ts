import type { BadgeVariant } from '@astryxdesign/core/Badge';

export const MOVEMENT_TYPES = [
  'RECEIPT',
  'ISSUE',
  'TRANSFER_OUT',
  'TRANSFER_IN',
  'ADJUSTMENT_POSITIVE',
  'ADJUSTMENT_NEGATIVE',
  'RETURN_IN',
  'RETURN_OUT',
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_TYPE_LABEL: Record<MovementType, string> = {
  RECEIPT: 'Receipt',
  ISSUE: 'Issue',
  TRANSFER_OUT: 'Transfer Out',
  TRANSFER_IN: 'Transfer In',
  ADJUSTMENT_POSITIVE: 'Adjustment (+)',
  ADJUSTMENT_NEGATIVE: 'Adjustment (-)',
  RETURN_IN: 'Return In',
  RETURN_OUT: 'Return Out',
};

export const MOVEMENT_TYPE_BADGE_VARIANT: Record<MovementType, BadgeVariant> = {
  RECEIPT: 'green',
  ISSUE: 'orange',
  TRANSFER_OUT: 'purple',
  TRANSFER_IN: 'blue',
  ADJUSTMENT_POSITIVE: 'cyan',
  ADJUSTMENT_NEGATIVE: 'error',
  RETURN_IN: 'teal',
  RETURN_OUT: 'neutral',
};

export interface ItemOption {
  id: string;
  sku: string;
  name: string;
}

export interface WarehouseOption {
  id: string;
  code: string;
  name: string;
}

export interface UomOption {
  id: string;
  code: string;
  name: string;
}

export interface InventoryLedgerEntry {
  id: string;
  entryNo: number;
  itemId: string;
  item?: ItemOption;
  warehouseId: string;
  warehouse?: WarehouseOption;
  movementType: MovementType;
  // Decimal fields arrive as strings — Prisma's Decimal serializes to JSON as a string.
  quantity: string;
  uomId: string;
  uom?: UomOption;
  unitCost: string | null;
  sourceDocumentType: string | null;
  sourceDocumentId: string | null;
  reasonCode: string | null;
  reversesEntryId: string | null;
  occurredAt: string;
  createdAt: string;
  createdBy: string | null;
  // Astryx's Table requires row data to satisfy Record<string, unknown>.
  [key: string]: unknown;
}

export function formatQuantity(entry: Pick<InventoryLedgerEntry, 'quantity' | 'uom'>): string {
  const value = Number(entry.quantity);
  const sign = value > 0 ? '+' : '';
  const formatted = `${sign}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value)}`;
  return entry.uom ? `${formatted} ${entry.uom.code}` : formatted;
}
