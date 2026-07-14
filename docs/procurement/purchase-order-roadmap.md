# Roadmap to Purchase Order Creation

**Status:** Planned
**Source:** [Enterprise SCM Architecture Design Document §4.1, §5.4, §5.5, §5.6, §5.7](/docs/Enterprise_SCM_Architecture_Design_Document.md)
**Purpose:** Sequence the master-data modules that must exist before `purchase_orders` can be created, based on the FK dependency graph in the architecture document — not on module popularity or the order they appear in the ER diagram.

---

## Where we are

| Module | Status |
|---|---|
| Auth / Users / Roles / RBAC / Approval Limits / SoD Rules | ✅ Built (`apps/api/src/{auth,users,approval-limits,sod-rules}`) |
| Units of Measure (`units_of_measure`) | ✅ Built — see [docs/inventory/uom/implementation-plan.md](/docs/inventory/uom/implementation-plan.md) |
| Everything else in §4.1 | Not started |

## Why Purchase Orders can't be built yet

Per §5.6, the two target tables have these **NOT NULL** foreign keys:

```
purchase_orders
  supplier_id     → suppliers.id        NOT NULL   ❌ suppliers table doesn't exist
  warehouse_id    → warehouses.id       NOT NULL   ❌ warehouses table doesn't exist
  currency_id     → currencies.id       NOT NULL   ⚠️  simplified — see "Deliberate simplifications" below

purchase_order_lines
  item_id         → items.id            NOT NULL   ❌ items table doesn't exist
  uom_id          → units_of_measure.id  NOT NULL   ✅ already built
  tax_code_id     → tax_codes.id         nullable   ➡️  deferred, same pattern as uom_conversions in the UOM plan
```

A PO cannot be created without a supplier to buy from, a warehouse to ship to, and an item to order. Those three are the actual blockers. Everything else on the PO (tax, pricing, requisitions, RFQs, amendments) is either nullable or downstream of PO creation, not a prerequisite for it.

## Dependency chain

```
UOM  ✅
  │
  ▼
Items  ◄─── base_uom_id
  │
  ├──────────────┐
  ▼              ▼
Suppliers    Warehouses
  │              │
  └──────┬───────┘
         ▼
   Purchase Orders (header + lines)
         │
         ▼
   Goods Receipt Notes  (next milestone after PO — not in this roadmap)
```

Suppliers and Warehouses have no dependency on each other, so they can be built in parallel once Items is underway. Items must come first because both Suppliers (`supplier_items` — deferred, see below) and PO lines reference it, and it's the more foundational of the three.

## Planned sequence

| # | Module | Plan doc | Unblocks |
|---|---|---|---|
| 1 | **Items** (`items`) | [docs/inventory/items/implementation-plan.md](/docs/inventory/items/implementation-plan.md) — in progress (PRs 1–3 open, plus chat-agent write access) | PO lines need `item_id` |
| 2 | **Suppliers** (`suppliers`) | [docs/suppliers/implementation-plan.md](/docs/suppliers/implementation-plan.md) — planned | PO header needs `supplier_id` |
| 3 | **Warehouses** (`warehouses`) | [docs/warehouses/implementation-plan.md](/docs/warehouses/implementation-plan.md) — planned | PO header needs `warehouse_id` (ship-to) |
| 4 | **Purchase Orders** (`purchase_orders` + `purchase_order_lines`) | Not yet written | Target feature |

Items (1), Suppliers (2), and Warehouses (3) can proceed as three parallel workstreams once each has its own plan doc — none of them depend on each other. Purchase Orders (4) depends on all three.

## Deliberate simplifications (mirrors the UOM plan's "Notes" pattern)

To avoid over-building master data the PO flow doesn't strictly need yet:

- **No `companies`/`tenants` tables.** The codebase already uses a flat `tenantId String` field per row (see `User`, `Role`, `ApprovalLimit`) instead of the architecture doc's full `tenants → companies → branches` hierarchy. New modules (Items, Suppliers, Warehouses, POs) follow the same pattern — `tenantId` on every table, no `company_id` FK.
- **`currency_id` → a plain `currency` string field**, same precedent as `ApprovalLimit.currency` (`String @default("USD")`). A full `currencies`/`exchange_rates` master is deferred until multi-currency FX is actually needed.
- **`tax_code_id` deferred** — nullable on `purchase_order_lines`, so POs can be created without a `tax_codes` table exactly like `uom_conversions` was deferred from the UOM plan (needs `items` to exist first, and tax hasn't been designed yet).
- **`item_categories`, `item_attributes`, `price_lists`, `hsn_sac_codes`** — all nullable/optional relations on `items`. Deferred to future master-data PRs.
- **`number_sequences`** (configurable `PO-2026-00001` numbering) — deferred; PO numbering can start with a simple per-tenant counter and be swapped for the configurable version later without a breaking migration.
- **`purchase_requisitions`, `rfqs`, `purchase_order_amendments`** — upstream/around PO, not blockers to creating one. Deferred.
- **No `addresses` master table.** Suppliers gets no address fields at all in its first PR (deferred to `supplier_addresses`); Warehouses gets a single free-text `address_line` placeholder rather than a structured/reusable address model, since a real `addresses` table would be shared across suppliers, customers, and warehouses and shouldn't be designed once here in isolation.
- **`payment_term_id` / `default_ap_account` deferred on Suppliers** — same reasoning as `tax_code_id` on PO lines: the referenced tables (`payment_terms`, `chart_of_accounts`) don't exist yet and neither is a PO blocker.
- **The full warehouse storage hierarchy is deferred.** `warehouse_zones`/`aisles`/`racks`/`bins`, `license_plates`, `warehouse_tasks`, `pick_lists`, `putaway_rules`, and `cycle_counts` are a distinct future "Warehouse Operations" milestone — a PO/GRN only needs the base `warehouses` row to reference.

## After Purchase Orders

Once PO create/list/detail exists, the natural next milestone is **Goods Receipt Notes** (§5.6) — receiving against a PO, which is the first thing that actually writes to the `inventory_ledger` (§7). That's a separate roadmap once POs land.
