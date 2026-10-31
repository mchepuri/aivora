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

export interface StockReportItem extends ItemOption {
  // Decimal fields arrive as strings — Prisma's Decimal serializes to JSON as a string.
  mrp: string | null;
}

export interface StockReportBatch {
  id: string;
  batchNo: string;
  manufacturedDate: string | null;
  expiryDate: string | null;
}

export interface StockReportRow {
  item: StockReportItem | null;
  warehouse: WarehouseOption | null;
  batch: StockReportBatch | null;
  // Decimal fields arrive as strings — Prisma's Decimal serializes to JSON as a string.
  quantity: string;
  costPrice: string | null;
  /** Same as costPrice for now — no discount/landed-cost formula is defined yet. */
  netCost: string | null;
  // Astryx's Table requires row data to satisfy Record<string, unknown>.
  [key: string]: unknown;
}

export interface DailySalesDay {
  date: string;
  orderCount: number;
  revenue: string;
  // Astryx's Table requires row data to satisfy Record<string, unknown>.
  [key: string]: unknown;
}

export interface DailySalesReport {
  days: DailySalesDay[];
  summary: {
    orderCount: number;
    revenue: string;
  };
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoDateString(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
