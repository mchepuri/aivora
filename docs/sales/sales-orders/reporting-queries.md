# Sales Order Reporting Queries

Reference SQL for common sales questions, written against the `sales_orders` /
`sales_order_lines` / `customers` / `items` tables.

**Every query must be scoped by `tenant_id`** (CLAUDE.md §Security — multi-tenant
isolation). The `$1`-style placeholders below are parameters — never build these
by string concatenation if you lift them into application code.

---

## What counts as "sold"

A sales order only represents revenue once it has physically left the warehouse.
These queries define sold as:

```sql
status IN ('SHIPPED', 'INVOICED', 'CLOSED')
```

`DRAFT`, `CONFIRMED`, `ALLOCATED` and `PICKED` are **pipeline**, not sales, and
`CANCELLED` is neither. Swap the filter for `('CONFIRMED','ALLOCATED','PICKED')`
if you want an open-order-book report instead.

Two further conventions used throughout:

- **Quantity** comes from `sales_order_lines.quantity_shipped`, not
  `quantity_ordered` — what actually shipped, not what was asked for. Today the
  `ship` action sets them equal (full shipment only), so the two agree; when
  partial shipments land, `quantity_shipped` stays correct and
  `quantity_ordered` does not.
- **Date** is `sales_orders.order_date` (when the customer ordered). Use
  `shipped_at` or `invoiced_at` instead if you need a fulfilment- or
  billing-dated view — they will fall in different periods.

> **Ordering pitfall:** casting a `SUM()` to `::text` for display and then
> ordering by that alias sorts **lexically** — `143` lands below `75`. Always
> `ORDER BY SUM(...)` on the numeric expression, as every query below does.

---

## 1. Items sold in a week

```sql
SELECT i.sku,
       i.name,
       SUM(l.quantity_shipped) AS qty_sold,
       SUM(l.line_total)       AS revenue,
       COUNT(DISTINCT so.id)   AS order_count
FROM sales_order_lines l
JOIN sales_orders so ON so.id = l.sales_order_id
JOIN items        i  ON i.id  = l.item_id
WHERE so.tenant_id = $1
  AND so.status IN ('SHIPPED', 'INVOICED', 'CLOSED')
  AND so.order_date >= $2          -- week start, inclusive
  AND so.order_date <  $3          -- week end, exclusive
GROUP BY i.sku, i.name
ORDER BY SUM(l.quantity_shipped) DESC;
```

Half-open range (`>= start AND < end`) avoids the classic off-by-one where a
`BETWEEN` double-counts the boundary day across adjacent weeks.

## 2. Which item sold most in a week

Query 1 already ranks them — `LIMIT 1` gives the single top seller. But decide
which "most" you mean, because they routinely disagree:

```sql
-- by units moved
ORDER BY SUM(l.quantity_shipped) DESC LIMIT 1;

-- by revenue earned
ORDER BY SUM(l.line_total) DESC LIMIT 1;
```

On the demo data for week 2026-08-24, the top seller by quantity is
`DEMO-SENSOR-06` (75 units, $12,499.50) while the top by revenue is
`TEST-SKU-3` ($19,725.42) — a cheap high-volume item versus a pricier one.
Report whichever the reader expects, and label it.

## 3. Which customers bought a given item

```sql
SELECT c.code,
       c.legal_name,
       SUM(l.quantity_shipped) AS qty,
       SUM(l.line_total)       AS spend,
       COUNT(DISTINCT so.id)   AS order_count,
       MAX(so.order_date)      AS last_ordered
FROM sales_order_lines l
JOIN sales_orders so ON so.id = l.sales_order_id
JOIN items        i  ON i.id  = l.item_id
JOIN customers    c  ON c.id  = so.customer_id
WHERE so.tenant_id = $1
  AND i.sku = $2
  AND so.status IN ('SHIPPED', 'INVOICED', 'CLOSED')
GROUP BY c.code, c.legal_name
ORDER BY SUM(l.line_total) DESC;
```

Add `AND so.order_date >= $3 AND so.order_date < $4` to restrict to a period.
`last_ordered` is useful for churn — a good customer who last bought months ago
is a different story from one who bought last week.

## 4. Sales in a given date range

Headline totals:

```sql
SELECT COUNT(*)          AS orders,
       SUM(total_amount) AS revenue,
       AVG(total_amount) AS avg_order_value
FROM sales_orders
WHERE tenant_id = $1
  AND status IN ('SHIPPED', 'INVOICED', 'CLOSED')
  AND order_date >= $2
  AND order_date <  $3;
```

Monthly trend:

```sql
SELECT to_char(date_trunc('month', order_date), 'YYYY-MM') AS month,
       COUNT(*)          AS orders,
       SUM(total_amount) AS revenue
FROM sales_orders
WHERE tenant_id = $1
  AND status IN ('SHIPPED', 'INVOICED', 'CLOSED')
GROUP BY 1
ORDER BY 1;
```

Swap `'month'` for `'week'` or `'day'` for finer granularity.

Top customers in the range:

```sql
SELECT c.code,
       c.legal_name,
       SUM(so.total_amount) AS revenue,
       COUNT(*)             AS orders
FROM sales_orders so
JOIN customers c ON c.id = so.customer_id
WHERE so.tenant_id = $1
  AND so.status IN ('SHIPPED', 'INVOICED', 'CLOSED')
  AND so.order_date >= $2
  AND so.order_date <  $3
GROUP BY c.code, c.legal_name
ORDER BY SUM(so.total_amount) DESC
LIMIT 10;
```

**Note on `total_amount` vs summing lines:** the header total is authoritative
and is what these revenue figures use. It equals the sum of its line totals
today because `tax_amount` is always 0 — once a tax engine lands, header and
line sums will legitimately differ, and revenue should stay on the header.

---

## Demo data

`apps/api/prisma/seed-sales-demo.ts` generates a reproducible dataset for these
reports:

```bash
cd apps/api
npx ts-node prisma/seed-sales-demo.ts <tenantId> [orderCount]
```

It creates 10 customers, 9 extra items, and N sales orders (default 200) spread
over the last 180 days, with a weighted status mix and a weighted item
popularity curve so rankings are a real distribution rather than uniform noise.
Deterministic (Mulberry32 PRNG, fixed seed) — the same arguments always produce
the same numbers.

Master data is upserted by code/SKU so re-runs don't duplicate it, but **sales
orders are always appended** — delete existing ones first for a clean slate:

```sql
DELETE FROM sales_orders WHERE tenant_id = $1 AND created_by = 'seed-sales-demo';
```

(`sales_order_lines` cascade automatically.)

---

## Performance

At demo scale (hundreds of rows) these run instantly on unindexed columns. Before
they meet production volumes, the joins above want:

- `sales_orders (tenant_id, order_date)` — every query filters on this pair
- `sales_orders (tenant_id, status)` — or a composite with `order_date`
- `sales_order_lines (item_id)` — for the per-item reports
- `sales_orders (customer_id)` — for the per-customer reports

Only `(tenant_id, so_number)` is indexed today. Add the rest in a migration when
a reporting screen actually ships, not speculatively.
