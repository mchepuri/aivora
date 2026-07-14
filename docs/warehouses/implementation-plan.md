# Warehouses (Warehouse/Site Master) — Implementation Plan

**Module:** Master Data → Warehouse Management
**Status:** Planned
**Branch prefix:** `feature/warehouses-`
**Source:** [Enterprise SCM Architecture Design Document §5.7, §4.1 Domain G](/docs/Enterprise_SCM_Architecture_Design_Document.md), [Purchase Order Roadmap](/docs/procurement/purchase-order-roadmap.md)

---

## Architecture Reference

The architecture document (§5.7 Warehouse Management, §4.1 Domain G) defines 12 warehouse tables covering the full WMS layer (zones, aisles, racks, bins, license plates, tasks, pick lists, putaway rules, cycle counts). This is step 3 of the [roadmap to Purchase Order creation](/docs/procurement/purchase-order-roadmap.md) — `purchase_orders.warehouse_id` (ship-to) is a hard NOT NULL blocker until `warehouses` exists. It can proceed in parallel with [Suppliers](/docs/suppliers/implementation-plan.md); the two don't depend on each other.

### `warehouses` — Warehouse/site master

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `tenant_id` | UUID | NOT NULL — multi-tenant isolation (flat field, same pattern as `items`/`suppliers`, no `companies` table yet) |
| `code` | VARCHAR(16) | NOT NULL — unique per tenant among active rows (partial index, see below) |
| `name` | VARCHAR(150) | NOT NULL |
| `address_line` | VARCHAR(255) | nullable — plain field, not an FK (see Deliberate simplifications) |
| `warehouse_type` | ENUM | NOT NULL, default `DC` — DC, RETAIL_BACKROOM, MANUFACTURING, BONDED, VIRTUAL |
| `timezone` | VARCHAR(64) | NOT NULL, default `'UTC'` |
| `is_deleted` | BOOLEAN | NOT NULL, default false — soft delete |
| `created_at` / `created_by` | TIMESTAMPTZ / UUID | Standard audit columns |
| `updated_at` / `updated_by` | TIMESTAMPTZ / UUID | Standard audit columns |

**Uniqueness:** `code` is enforced unique per `(tenant_id, code)` via a **partial unique index scoped to `is_deleted = false`**, same pattern as `units_of_measure_code_active_key` / `items_sku_active_key` / `suppliers_code_active_key`.

**Deferred from the full §5.7/Domain G definition** (not needed to unblock PO creation — see the roadmap's "Deliberate simplifications"):
- `address_id` → `addresses` (no dedicated addresses master table yet; `address_line` above is a plain free-text placeholder, not the real structured/reusable address model)
- `warehouse_zones`, `warehouse_aisles`, `warehouse_racks`, `warehouse_bins` — the storage-location hierarchy; a PO/GRN only needs a `warehouse_id` to reference, not bin-level detail
- `license_plates` — pallet/container tracking, needed for physical putaway, not for creating a PO
- `warehouse_tasks`, `pick_lists`, `pick_list_lines`, `putaway_rules` — directed-work/WMS execution layer, entirely downstream of receiving (GRN) and shipping (SO), neither of which this PR sequence touches
- `cycle_counts`, `cycle_count_lines` — inventory counting, unrelated to PO creation

A PO only needs a `warehouse_id` to reference as its ship-to destination — the fields above are the minimum to make that row meaningful and selectable in a UI (a code and name to identify it, a type and timezone since they're simple required scalars in the source spec). The entire bin/putaway/pick/count layer is real work but belongs to a future "Warehouse Operations" milestone, not this one.

---

## Implementation PRs

### PR 1 — Database Schema `chore: add warehouses Prisma schema + migration`

**Status:** [x] Planned | [ ] In Progress | [ ] Merged
**Branch:** `chore/warehouses-db-schema`

**Changes:**
- `apps/api/prisma/schema.prisma` — add `Warehouse` model, `WarehouseType` enum
- `apps/api/prisma/migrations/` — creates `warehouses`, its enum, and the partial unique index on `(tenantId, code)`

**Prisma model:**
```prisma
enum WarehouseType {
  DC
  RETAIL_BACKROOM
  MANUFACTURING
  BONDED
  VIRTUAL
}

model Warehouse {
  id            String        @id @default(cuid())
  tenantId      String
  code          String        @db.VarChar(16)
  name          String        @db.VarChar(150)
  addressLine   String?       @db.VarChar(255)
  warehouseType WarehouseType @default(DC)
  timezone      String        @default("UTC") @db.VarChar(64)
  isDeleted     Boolean       @default(false)
  createdAt     DateTime      @default(now())
  createdBy     String?
  updatedAt     DateTime      @updatedAt
  updatedBy     String?

  // Partial unique index (tenantId, code) WHERE isDeleted = false is managed
  // via raw SQL migration — Prisma references it by map name to prevent drift,
  // same pattern as units_of_measure_code_active_key / items_sku_active_key /
  // suppliers_code_active_key.
  @@index([tenantId, code], map: "warehouses_code_active_key")
  @@map("warehouses")
}
```

**PR description to use:**
> Adds the `warehouses` table as defined in §5.7/Domain G of the Enterprise SCM Architecture Design Document, scoped down to the fields needed to unblock Purchase Order creation (the full zone/aisle/rack/bin storage hierarchy, license plates, tasks, pick lists, putaway rules, and cycle counts are all deferred — see docs/warehouses/implementation-plan.md). Schema-only PR — no application logic.

---

### PR 2 — API CRUD `feat: add Warehouse CRUD API endpoints`

**Status:** [x] Planned | [ ] In Progress | [ ] Merged
**Branch:** `feature/warehouses-api`
**Depends on:** PR 1

**New files:**
```
apps/api/src/master-data/warehouses/
├── warehouses.module.ts
├── warehouses.controller.ts
├── warehouses.service.ts
└── dto/
    ├── create-warehouse.dto.ts
    ├── update-warehouse.dto.ts
    └── list-warehouses.dto.ts
```

**Endpoints:**

| Method | Route | Status Code | Notes |
|---|---|---|---|
| `GET` | `/api/v1/master-data/warehouses` | 200 | List — filterable by `warehouseType`; searchable by `code`/`name`; paginated |
| `GET` | `/api/v1/master-data/warehouses/:id` | 200 / 404 | Single warehouse |
| `POST` | `/api/v1/master-data/warehouses` | 201 | Create |
| `PATCH` | `/api/v1/master-data/warehouses/:id` | 200 / 404 | Partial update |
| `DELETE` | `/api/v1/master-data/warehouses/:id` | 204 / 404 | Soft delete (`isDeleted = true`) |

**DTO fields:**
- `create-warehouse.dto.ts`: `code` (string, max 16, required), `name` (string, max 150, required), `addressLine` (string, max 255, optional), `warehouseType` (enum, optional, default `DC`), `timezone` (string, max 64, optional, default `UTC`)
- `update-warehouse.dto.ts`: same fields, all optional
- `list-warehouses.dto.ts`: `warehouseType?`, `search?`, `limit?`, `offset?`

**Error mapping:**
- Prisma `P2002` on the `warehouses_code_active_key` partial index (duplicate active code within a tenant) → `409 ConflictException` — "A warehouse with code '<code>' already exists."
- Prisma `P2025` (record not found) → `404 NotFoundException`
- Read `tenantId` from the verified JWT, never from the request body.

**PR description to use:**
> Implements the Warehouse master data CRUD API (§5.7). Follows the existing NestJS module structure (controller → service → Prisma), same as `master-data/items`. Duplicate active code within a tenant returns 409; missing record returns 404.

---

### PR 3 — Frontend UI `feat: add Warehouse management UI page`

**Status:** [x] Planned | [ ] In Progress | [ ] Merged
**Branch:** `feature/warehouses-frontend`
**Depends on:** PR 2

**New files:**
```
apps/web/app/(authenticated)/warehouses/
└── page.tsx                      ← Server Component — fetches warehouse list

apps/web/components/warehouses/
├── WarehouseTable.tsx             ← table with edit/delete row actions (client)
└── WarehouseDialog.tsx            ← create/edit dialog (client)
```

**UI behaviour:**
- Page title: "Warehouses"
- Built with Astryx design-system components — `Table`, `Badge` (type), `Card`, `Heading`, `Text`, `Dialog`/`Layout`, `TextInput`, `Selector` (type), `AlertDialog` (delete confirmation), `Banner` (errors) — mirroring `UomTable`/`UomDialog` (a single create/edit dialog, no separate `/new` page, since the field count is small — same shape as UOM, not the larger Items form).
- Table columns: Code, Name, Type (badge), Timezone, Actions
- "New Warehouse" button → opens `WarehouseDialog` with a blank form
- Row "Edit" → same dialog pre-filled
- Row "Delete" → `AlertDialog` confirmation then soft-delete
- Adds a "Warehouses" link to the top nav (`AppNav`)
- Form validation: `code` ≤ 16 chars required, `name` ≤ 150 chars required, `warehouseType` required select

**PR description to use:**
> Warehouse management page at `/warehouses`. Server Component fetches and renders the list; client Dialog handles create/edit without a page navigation, mirroring the UOM feature. Built entirely with Astryx components. Wired to the API from PR 2 via `apiClient`.

---

### PR 4 — Chatbot Frontend `feat: add Warehouse Bot chat UI` *(deferred — see Notes)*

**Status:** [ ] Deferred
**Branch:** `feature/warehouses-bot-frontend`
**Depends on:** PR 3

Not currently planned — same deferral rationale as [Items PR 4](/docs/inventory/items/implementation-plan.md) and [Suppliers PR 4](/docs/suppliers/implementation-plan.md): the conversational/agentic pattern remains a UOM-only proof of concept (§15 Phase 8). Warehouses gets write access through the existing generic chat agent (`ApiCapabilityService`'s `call_api` tool) once PR 2 lands and its endpoints are registered there, independent of this deferred dedicated-bot feature.

---

### PR 5 — Bot Backend `feat: add warehouse bot backend with Claude-powered intent parsing` *(deferred — see Notes)*

**Status:** [ ] Deferred
**Branch:** `feature/warehouses-bot-backend`
**Depends on:** PR 2

Not currently planned, for the same reason as PR 4. Would mirror [UOM PR 5](/docs/inventory/uom/implementation-plan.md): Claude-powered `CREATE_WAREHOUSE` / `LIST_WAREHOUSES` / `QUERY_WAREHOUSE` intent parsing, all mutations routed through `WarehousesService` (never direct DB access from the AI layer), human-in-the-loop confirmation before create.

---

## Execution Order

```
PR 1 (DB schema)
    │
    ▼
PR 2 (API)
    │
    ▼
PR 3 (FE list/create/edit UI)
    │
    ▼
PR 4 / PR 5 (Bot — deferred until the UOM bot POC is validated)
```

---

## Implementation Progress

| PR | Title | Status | Branch | PR Link |
|---|---|---|---|---|
| PR 1 | DB schema | Planned | `chore/warehouses-db-schema` | — |
| PR 2 | API CRUD | Planned | `feature/warehouses-api` | — |
| PR 3 | FE UI | Planned | `feature/warehouses-frontend` | — |
| PR 4 | Bot FE | Deferred | `feature/warehouses-bot-frontend` | — |
| PR 5 | Bot backend | Deferred | `feature/warehouses-bot-backend` | — |

---

## Notes

- `address_id` → a real `addresses` master table is **not** implemented — `address_line` is a single free-text field as a placeholder. A structured/reusable addresses table (needed for suppliers, customers, and warehouses alike) is deferred to its own future PR rather than being built once here and duplicated elsewhere.
- The entire storage-location hierarchy (`warehouse_zones` → `warehouse_aisles` → `warehouse_racks` → `warehouse_bins`), `license_plates`, `warehouse_tasks`, `pick_lists`/`pick_list_lines`, `putaway_rules`, and `cycle_counts`/`cycle_count_lines` are **not** implemented — none block PO creation, which only needs `warehouse_id` to reference a valid row. These form a distinct future "Warehouse Operations" milestone, not part of this one.
- `goods_receipt_notes.warehouse_id` (the next milestone after PO, per the roadmap) also only needs the base `warehouses` row — receiving into specific bins depends on `warehouse_bins`, tracked separately.
- After Suppliers and Warehouses both land, the roadmap proceeds to **Purchase Orders** — see [docs/procurement/purchase-order-roadmap.md](/docs/procurement/purchase-order-roadmap.md).
