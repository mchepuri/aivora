import type { BadgeVariant } from '@astryxdesign/core/Badge';

/**
 * Shared types/constants for the Purchase Orders feature. Co-located here
 * rather than inside a "Dialog" component (the pattern Items/Suppliers/
 * Warehouses use) because there is no PO dialog — create/detail are full
 * pages — and four separate components (table, form, lines editor, actions)
 * all need these same shapes.
 */

export const PURCHASE_ORDER_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CLOSED',
  'CANCELLED',
] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const STATUS_BADGE_VARIANT: Record<PurchaseOrderStatus, BadgeVariant> = {
  DRAFT: 'neutral',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  PARTIALLY_RECEIVED: 'blue',
  RECEIVED: 'green',
  CLOSED: 'teal',
  CANCELLED: 'error',
};

export const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  PARTIALLY_RECEIVED: 'Partially Received',
  RECEIVED: 'Received',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

export interface SupplierOption {
  id: string;
  code: string;
  legalName: string;
}

export interface WarehouseOption {
  id: string;
  code: string;
  name: string;
}

export interface ItemOption {
  id: string;
  sku: string;
  name: string;
}

export interface UomOption {
  id: string;
  code: string;
  name: string;
}

export interface PurchaseOrderLine {
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
  lineTotal: string;
  // Astryx's Table requires row data to satisfy Record<string, unknown>.
  [key: string]: unknown;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplier?: SupplierOption;
  warehouseId: string;
  warehouse?: WarehouseOption;
  currency: string;
  orderDate: string;
  expectedDate: string | null;
  status: PurchaseOrderStatus;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdBy: string | null;
  lines: PurchaseOrderLine[];
  // Astryx's Table requires row data to satisfy Record<string, unknown>.
  [key: string]: unknown;
}

/**
 * Draft line-item row shape used by the create form, before it has a real
 * id/lineTotal. `key` is a client-only React/Table row key (not sent to the
 * API — stripped in PurchaseOrderForm before POST).
 */
export interface DraftLine {
  key: string;
  itemId: string;
  uomId: string;
  quantityOrdered: number | null;
  unitPrice: number | null;
  // Astryx's Table requires row data to satisfy Record<string, unknown>.
  [key: string]: unknown;
}

export function emptyDraftLine(): DraftLine {
  return {
    key: crypto.randomUUID(),
    itemId: '',
    uomId: '',
    quantityOrdered: null,
    unitPrice: null,
  };
}

export function draftLineTotal(line: DraftLine): number {
  if (line.quantityOrdered === null || line.unitPrice === null) return 0;
  return line.quantityOrdered * line.unitPrice;
}

export function formatCurrency(amount: string, currency: string): string {
  const value = Number(amount);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    Number.isFinite(value) ? value : 0,
  );
}
