/**
 * Demo data generator for Sales Order reporting.
 *
 * Creates customers, extra items, and a spread of sales orders across a date
 * range so the reporting queries in docs/sales/sales-orders/reporting-queries.md
 * return something meaningful. Deterministic — the same seed always produces
 * the same data, so report numbers are reproducible.
 *
 * Usage:
 *   npx ts-node prisma/seed-sales-demo.ts <tenantId> [orderCount]
 *
 * Idempotency: customers and items are upserted by (tenantId, code) so re-runs
 * do not duplicate master data. Sales orders are always appended — delete them
 * first if you want a clean slate.
 */
import { PrismaClient, SalesOrderStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

const ORDER_WINDOW_DAYS = 180;

/** Mulberry32 — small deterministic PRNG so seeded data is reproducible. */
function makeRng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CUSTOMERS = [
  { code: 'NORTHWIND-01', legalName: 'Northwind Traders Inc.', creditLimit: 250000 },
  { code: 'CONTOSO-02', legalName: 'Contoso Manufacturing Ltd.', creditLimit: 500000 },
  { code: 'FABRIKAM-03', legalName: 'Fabrikam Industries', creditLimit: 120000 },
  { code: 'ADVENTURE-04', legalName: 'Adventure Works Cycles', creditLimit: 300000 },
  { code: 'TAILSPIN-05', legalName: 'Tailspin Toys Corp.', creditLimit: 80000 },
  { code: 'WIDEWORLD-06', legalName: 'Wide World Importers', creditLimit: 450000 },
  { code: 'LITWARE-07', legalName: 'Litware Distribution', creditLimit: 95000 },
  { code: 'PROSEWARE-08', legalName: 'Proseware Retail Group', creditLimit: 200000 },
  { code: 'COHOVIN-09', legalName: 'Coho Vineyard & Co.', creditLimit: 60000 },
  { code: 'ALPINE-10', legalName: 'Alpine Ski House', creditLimit: 175000 },
];

/** Extra items so "which item sold most" has a real distribution to rank. */
const ITEMS = [
  { sku: 'DEMO-BEARING-01', name: 'Precision Ball Bearing 6204' },
  { sku: 'DEMO-BELT-02', name: 'Timing Belt 8M-1200' },
  { sku: 'DEMO-MOTOR-03', name: 'AC Induction Motor 2.2kW' },
  { sku: 'DEMO-PUMP-04', name: 'Centrifugal Pump CP-50' },
  { sku: 'DEMO-VALVE-05', name: 'Ball Valve 2in Stainless' },
  { sku: 'DEMO-SENSOR-06', name: 'Proximity Sensor M18 PNP' },
  { sku: 'DEMO-CABLE-07', name: 'Shielded Cable 4-Core 1.5mm' },
  { sku: 'DEMO-GEAR-08', name: 'Helical Gearbox Ratio 20:1' },
  { sku: 'DEMO-FILTER-09', name: 'Hydraulic Filter HF-320' },
];

/**
 * Status mix. Weighted toward fulfilled orders so "items sold" reports have
 * data, while still covering the in-flight and cancelled states.
 */
const STATUS_WEIGHTS: [SalesOrderStatus, number][] = [
  ['CLOSED', 30],
  ['INVOICED', 22],
  ['SHIPPED', 16],
  ['PICKED', 6],
  ['ALLOCATED', 6],
  ['CONFIRMED', 8],
  ['DRAFT', 8],
  ['CANCELLED', 4],
];

/** Statuses at or past SHIPPED — these have quantityShipped written. */
const SHIPPED_OR_LATER: SalesOrderStatus[] = ['SHIPPED', 'INVOICED', 'CLOSED'];

function pickStatus(rng: () => number): SalesOrderStatus {
  const total = STATUS_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let roll = rng() * total;
  for (const [status, weight] of STATUS_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) return status;
  }
  return 'CLOSED';
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  const tenantId = process.argv[2];
  const orderCount = Number(process.argv[3] ?? 200);
  if (!tenantId) {
    throw new Error('Usage: npx ts-node prisma/seed-sales-demo.ts <tenantId> [orderCount]');
  }

  const rng = makeRng(20260906);
  const actor = 'seed-sales-demo';

  const warehouse = await prisma.warehouse.findFirst({
    where: { tenantId, isDeleted: false },
    select: { id: true },
  });
  if (!warehouse) throw new Error(`No warehouse found for tenant ${tenantId} — create one first.`);

  const baseUom = await prisma.unitOfMeasure.findFirst({
    where: { tenantId, isDeleted: false },
    select: { id: true },
  });
  if (!baseUom) throw new Error(`No unit of measure found for tenant ${tenantId}.`);

  // ── Customers ────────────────────────────────────────────────────────────
  const customers = [];
  for (const c of CUSTOMERS) {
    const existing = await prisma.customer.findFirst({
      where: { tenantId, code: c.code, isDeleted: false },
      select: { id: true },
    });
    customers.push(
      existing ??
        (await prisma.customer.create({
          data: {
            tenantId,
            code: c.code,
            legalName: c.legalName,
            defaultCurrency: 'USD',
            creditLimit: new Decimal(c.creditLimit),
            status: 'ACTIVE',
            createdBy: actor,
            updatedBy: actor,
          },
          select: { id: true },
        })),
    );
  }
  console.log(`customers ready: ${customers.length}`);

  // ── Items ────────────────────────────────────────────────────────────────
  for (const it of ITEMS) {
    const existing = await prisma.item.findFirst({
      where: { tenantId, sku: it.sku, isDeleted: false },
      select: { id: true },
    });
    if (!existing) {
      await prisma.item.create({
        data: {
          tenantId,
          sku: it.sku,
          name: it.name,
          baseUomId: baseUom.id,
          createdBy: actor,
          updatedBy: actor,
        },
      });
    }
  }
  const items = await prisma.item.findMany({
    where: { tenantId, isDeleted: false },
    select: { id: true },
  });
  console.log(`items available: ${items.length}`);

  // Per-item unit price and popularity weight, so the "top seller" ranking is
  // a real distribution rather than uniform noise.
  const itemMeta = items.map((item, i) => ({
    id: item.id,
    unitPrice: Math.round((12 + rng() * 480) * 100) / 100,
    weight: 1 + ((i * 7) % 9),
  }));
  const weightTotal = itemMeta.reduce((s, m) => s + m.weight, 0);

  function pickItem() {
    let roll = rng() * weightTotal;
    for (const m of itemMeta) {
      roll -= m.weight;
      if (roll <= 0) return m;
    }
    return itemMeta[0];
  }

  // ── Sales orders ─────────────────────────────────────────────────────────
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const windowStart = addDays(today, -ORDER_WINDOW_DAYS);

  const year = today.getUTCFullYear();
  const existingThisYear = await prisma.salesOrder.count({
    where: { tenantId, soNumber: { startsWith: `SO-${year}-` } },
  });

  let created = 0;
  for (let i = 0; i < orderCount; i++) {
    const status = pickStatus(rng);
    const orderDate = addDays(windowStart, Math.floor(rng() * ORDER_WINDOW_DAYS));
    const customer = customers[Math.floor(rng() * customers.length)];

    const lineCount = 1 + Math.floor(rng() * 4);
    const chosen = new Map<string, { unitPrice: number; qty: number }>();
    while (chosen.size < lineCount) {
      const meta = pickItem();
      if (chosen.has(meta.id)) continue;
      chosen.set(meta.id, { unitPrice: meta.unitPrice, qty: 1 + Math.floor(rng() * 60) });
    }

    const lines = [...chosen.entries()].map(([itemId, l], index) => {
      const quantityOrdered = new Decimal(l.qty);
      return {
        lineNo: index + 1,
        itemId,
        uomId: baseUom.id,
        quantityOrdered,
        quantityShipped: SHIPPED_OR_LATER.includes(status) ? quantityOrdered : new Decimal(0),
        unitPrice: new Decimal(l.unitPrice),
        lineTotal: quantityOrdered.times(l.unitPrice).toDecimalPlaces(2),
      };
    });

    const subtotalAmount = lines.reduce((s, l) => s.plus(l.lineTotal), new Decimal(0));
    const soNumber = `SO-${year}-${String(existingThisYear + i + 1).padStart(5, '0')}`;

    const confirmed = status !== 'DRAFT' && status !== 'CANCELLED';
    const shipped = SHIPPED_OR_LATER.includes(status);
    const invoiced = status === 'INVOICED' || status === 'CLOSED';

    await prisma.salesOrder.create({
      data: {
        tenantId,
        soNumber,
        customerId: customer.id,
        warehouseId: warehouse.id,
        customerPoRef: `PO-${100000 + Math.floor(rng() * 899999)}`,
        currency: 'USD',
        orderDate,
        requestedDate: addDays(orderDate, 7 + Math.floor(rng() * 21)),
        status,
        subtotalAmount,
        taxAmount: new Decimal(0),
        totalAmount: subtotalAmount,
        confirmedBy: confirmed ? actor : null,
        confirmedAt: confirmed ? addDays(orderDate, 1) : null,
        shippedAt: shipped ? addDays(orderDate, 3 + Math.floor(rng() * 10)) : null,
        invoicedAt: invoiced ? addDays(orderDate, 12 + Math.floor(rng() * 8)) : null,
        cancellationReason: status === 'CANCELLED' ? 'Customer withdrew the order' : null,
        createdBy: actor,
        updatedBy: actor,
        lines: { create: lines },
      },
    });
    created++;
  }

  console.log(`sales orders created: ${created}`);
  console.log(`order date range: ${windowStart.toISOString().slice(0, 10)} .. ${today.toISOString().slice(0, 10)}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
