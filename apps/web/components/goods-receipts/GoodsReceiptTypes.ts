import type { BadgeVariant } from '@astryxdesign/core/Badge';

export const GRN_STATUSES = ['DRAFT', 'POSTED', 'REVERSED'] as const;
export type GrnStatus = (typeof GRN_STATUSES)[number];

export const GRN_STATUS_BADGE_VARIANT: Record<GrnStatus, BadgeVariant> = {
  DRAFT: 'neutral',
  POSTED: 'success',
  REVERSED: 'error',
};

export interface ItemOption {
  id: string;
  sku: string;
  name: string;
  isBatchTracked?: boolean;
}

export interface UomOption {
  id: string;
  code: string;
  name: string;
}

export interface WarehouseOption {
  id: string;
  code: string;
  name: string;
}

export interface PoLineOption {
  id: string;
  lineNo: number;
  itemId: string;
  item?: ItemOption;
  uomId: string;
  uom?: UomOption;
  // Decimal fields arrive as strings — Prisma's Decimal serializes to JSON as a string.
  quantityOrdered: string;
  quantityReceived: string;
  unitPrice: string;
}

export interface PurchaseOrderForReceiving {
  id: string;
  poNumber: string;
  status: string;
  warehouseId: string;
  warehouse?: WarehouseOption;
  lines: PoLineOption[];
}

export interface BatchOption {
  id: string;
  batchNo: string;
  manufacturedDate: string | null;
  expiryDate: string | null;
}

export interface GoodsReceiptNoteLine {
  id: string;
  poLineId: string;
  itemId: string;
  item?: ItemOption;
  uomId: string;
  uom?: UomOption;
  quantityReceived: string;
  unitCost: string;
  batchId: string | null;
  batch?: BatchOption;
  inventoryLedgerId: string | null;
  [key: string]: unknown;
}

export interface GoodsReceiptNote {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  purchaseOrder?: { id: string; poNumber: string; status: string };
  warehouseId: string;
  warehouse?: WarehouseOption;
  receivedDate: string;
  status: GrnStatus;
  postedAt: string | null;
  postedBy: string | null;
  createdAt: string;
  createdBy: string | null;
  lines: GoodsReceiptNoteLine[];
  // Astryx's Table requires row data to satisfy Record<string, unknown>.
  [key: string]: unknown;
}

/** Draft line-item row shape used by the create form. */
export interface DraftReceiptLine {
  poLineId: string;
  lineNo: number;
  itemLabel: string;
  uomCode: string;
  remaining: number;
  quantityReceived: number | null;
  isBatchTracked: boolean;
  batchNo: string;
  manufacturedDate: string;
  expiryDate: string;
  // Astryx's Table requires row data to satisfy Record<string, unknown>.
  [key: string]: unknown;
}

export function remainingQuantity(line: PoLineOption): number {
  return Number(line.quantityOrdered) - Number(line.quantityReceived);
}
