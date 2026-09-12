import type { BadgeVariant } from '@astryxdesign/core/Badge';

/**
 * Shared types/constants for the Sales Orders feature. Co-located here for the
 * same reason as PurchaseOrderTypes — there is no SO dialog (create/detail are
 * full pages) and five components need these same shapes.
 */

export const SALES_ORDER_STATUSES = [
  'DRAFT',
  'CONFIRMED',
  'ALLOCATED',
  'PICKED',
  'SHIPPED',
  'INVOICED',
  'CLOSED',
  'CANCELLED',
] as const;
export type SalesOrderStatus = (typeof SALES_ORDER_STATUSES)[number];

export const STATUS_BADGE_VARIANT: Record<SalesOrderStatus, BadgeVariant> = {
  DRAFT: 'neutral',
  CONFIRMED: 'warning',
  ALLOCATED: 'blue',
  PICKED: 'blue',
  SHIPPED: 'success',
  INVOICED: 'green',
  CLOSED: 'teal',
  CANCELLED: 'error',
};

export const STATUS_LABEL: Record<SalesOrderStatus, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  ALLOCATED: 'Allocated',
  PICKED: 'Picked',
  SHIPPED: 'Shipped',
  INVOICED: 'Invoiced',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

/**
 * The single forward step available from each status, mirroring the service's
 * state machine. `null` means the status is terminal (or, for CANCELLED, dead).
 */
export const NEXT_ACTION: Record<
  SalesOrderStatus,
  { path: string; label: string; pendingLabel: string } | null
> = {
  DRAFT: { path: 'confirm', label: 'Confirm Order', pendingLabel: 'Confirming…' },
  CONFIRMED: { path: 'allocate', label: 'Allocate Stock', pendingLabel: 'Allocating…' },
  ALLOCATED: { path: 'pick', label: 'Mark Picked', pendingLabel: 'Picking…' },
  PICKED: { path: 'ship', label: 'Ship Order', pendingLabel: 'Shipping…' },
  SHIPPED: { path: 'invoice', label: 'Invoice', pendingLabel: 'Invoicing…' },
  INVOICED: { path: 'close', label: 'Close Order', pendingLabel: 'Closing…' },
  CLOSED: null,
  CANCELLED: null,
};

/** Statuses the API still accepts a cancel from — nothing has shipped yet. */
export const CANCELLABLE_STATUSES: SalesOrderStatus[] = ['DRAFT', 'CONFIRMED', 'ALLOCATED'];

export interface CustomerOption {
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

export interface SalesOrderLine {
  id: string;
  lineNo: number;
  itemId: string;
  item?: ItemOption;
  uomId: string;
  uom?: UomOption;
  // Decimal fields arrive as strings — Prisma's Decimal serializes to JSON as a string.
  quantityOrdered: string;
  quantityShipped: string;
  unitPrice: string;
  lineTotal: string;
  // Astryx's Table requires row data to satisfy Record<string, unknown>.
  [key: string]: unknown;
}

export interface SalesOrder {
  id: string;
  soNumber: string;
  customerId: string;
  customer?: CustomerOption;
  warehouseId: string;
  warehouse?: WarehouseOption;
  customerPoRef: string | null;
  currency: string;
  orderDate: string;
  requestedDate: string | null;
  status: SalesOrderStatus;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  shippedAt: string | null;
  invoicedAt: string | null;
  cancellationReason: string | null;
  createdBy: string | null;
  lines: SalesOrderLine[];
  // Astryx's Table requires row data to satisfy Record<string, unknown>.
  [key: string]: unknown;
}

/**
 * Draft line-item row shape used by the create form, before it has a real
 * id/lineTotal. `key` is a client-only React/Table row key (not sent to the
 * API — stripped in SalesOrderForm before POST).
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
