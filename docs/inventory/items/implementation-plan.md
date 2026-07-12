# Items (Item/Product/SKU Master) — Implementation Plan

**Module:** Master Data → Inventory
**Status:** In Progress
**Branch prefix:** `feature/items-`
**Source:** [Enterprise SCM Architecture Design Document §5.4](/docs/Enterprise_SCM_Architecture_Design_Document.md), [Purchase Order Roadmap](/docs/procurement/purchase-order-roadmap.md)

---

## Architecture Reference

The architecture document (§5.4 Master Data, §4.1 Domain C) defines `items` with a `base_uom_id` FK into the already-built `units_of_measure` table (see [docs/inventory/uom/implementation-plan.md](/docs/inventory/uom/implementation-plan.md)). This is step 1 of the [roadmap to Purchase Order creation](/docs/procurement/purchase-order-roadmap.md) — `purchase_order_lines.item_id` is a hard NOT NULL blocker until this exists.

### `items` — Item/product/SKU master

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `tenant_id` | UUID | NOT NULL — multi-tenant isolation (flat field, same pattern as `users`/`roles`/`units_of_measure`, no `companies` table yet) |
| `sku` | VARCHAR(64) | NOT NULL — unique per tenant among active rows (partial index, see below) |
| `name` | VARCHAR(255) | NOT NULL |
| `base_uom_id` | UUID → units_of_measure | NOT NULL |
| `item_type` | ENUM | NOT NULL, default `GOODS` — GOODS, SERVICE, ASSET |
| `valuation_method` | ENUM | NOT NULL, default `FIFO` — FIFO, LIFO, WEIGHTED_AVG |
| `is_batch_tracked` | BOOLEAN | NOT NULL, default false |
| `is_serial_tracked` | BOOLEAN | NOT NULL, default false |
| `shelf_life_days` | INTEGER | nullable |
| `reorder_point` | NUMERIC(18,4) | nullable |
| `reorder_quantity` | NUMERIC(18,4) | nullable |
| `status` | ENUM | NOT NULL, default `ACTIVE` — ACTIVE, INACTIVE, DISCONTINUED |
| `is_deleted` | BOOLEAN | NOT NULL, default false — soft delete |
| `created_at` / `created_by` | TIMESTAMPTZ / UUID | Standard audit columns |
| `updated_at` / `updated_by` | TIMESTAMPTZ / UUID | Standard audit columns |

**Uniqueness:** `sku` is enforced unique per `(tenant_id, sku)` via a **partial unique index scoped to `is_deleted = false`** — not a plain `UNIQUE` constraint — so a soft-deleted SKU can be reused and two tenants can independently define the same SKU. This is the exact pattern UOM was corrected to use in migration `20260615000000_fix_uom_code_partial_unique` (`units_of_measure_code_active_key`); Items adopts it from the start instead of needing a follow-up fix migration.

**Deferred from the full §5.4 definition** (not needed to unblock PO creation — see the roadmap's "Deliberate simplifications"):
- `category_id` → `item_categories` (hierarchy not built yet)
- `hsn_sac_code` → `hsn_sac_codes` (tax classification not built yet)
- Item attributes (`item_attributes` / `item_attribute_values`)
- `uom_conversions` relation — the column already exists on `uom_conversions.item_id` from the UOM PRs (unused), and can be wired to a real FK once this table lands

---

## Implementation PRs

### PR 1 — Database Schema `chore: add items Prisma schema + migration`

**Status:** [ ] Planned | [x] In Progress | [ ] Merged
**Branch:** `chore/items-db-schema`

**Changes:**
- `apps/api/prisma/schema.prisma` — add `Item` model, `ItemType`, `ValuationMethod`, `ItemStatus` enums; add inverse relation `items Item[]` on `UnitOfMeasure`
- `apps/api/prisma/migrations/20260712000000_add_items/migration.sql` — creates `items`, its enums, the `baseUomId` FK, and the partial unique index

**Prisma model (as implemented):**
```prisma
enum ItemType {
  GOODS
  SERVICE
  ASSET
}

enum ValuationMethod {
  FIFO
  LIFO
  WEIGHTED_AVG
}

enum ItemStatus {
  ACTIVE
  INACTIVE
  DISCONTINUED
}

model Item {
  id              String          @id @default(cuid())
  tenantId        String
  sku             String          @db.VarChar(64)
  name            String          @db.VarChar(255)
  baseUomId       String
  itemType        ItemType        @default(GOODS)
  valuationMethod ValuationMethod @default(FIFO)
  isBatchTracked  Boolean         @default(false)
  isSerialTracked Boolean         @default(false)
  shelfLifeDays   Int?
  reorderPoint    Decimal?        @db.Decimal(18, 4)
  reorderQuantity Decimal?        @db.Decimal(18, 4)
  status          ItemStatus      @default(ACTIVE)
  isDeleted       Boolean         @default(false)
  createdAt       DateTime        @default(now())
  createdBy       String?
  updatedAt       DateTime        @updatedAt
  updatedBy       String?

  baseUom UnitOfMeasure @relation(fields: [baseUomId], references: [id])

  // Partial unique index (tenantId, sku) WHERE isDeleted = false is managed
  // via raw SQL migration — Prisma references it by map name to prevent drift,
  // same pattern as units_of_measure_code_active_key.
  @@index([tenantId, sku], map: "items_sku_active_key")
  @@map("items")
}
```

**PR description to use:**
> Adds the `items` table as defined in §5.4 of the Enterprise SCM Architecture Design Document, scoped down to the fields needed to unblock Purchase Order creation (category, HSN/SAC, and attributes deferred — see docs/inventory/items/implementation-plan.md). Schema-only PR — no application logic.

---

### PR 2 — API CRUD `feat: add Item CRUD API endpoints`

**Status:** [ ] Planned | [ ] In Progress | [ ] Merged
**Branch:** `feature/items-api`
**Depends on:** PR 1

**New files:**
```
apps/api/src/master-data/items/
├── items.module.ts
├── items.controller.ts
├── items.service.ts
└── dto/
    ├── create-item.dto.ts
    ├── update-item.dto.ts
    └── list-items.dto.ts
```

**Endpoints:**

| Method | Route | Status Code | Notes |
|---|---|---|---|
| `GET` | `/api/v1/master-data/items` | 200 | List — filterable by `itemType`, `status`; searchable by `sku`/`name`; paginated |
| `GET` | `/api/v1/master-data/items/:id` | 200 / 404 | Single item |
| `POST` | `/api/v1/master-data/items` | 201 | Create |
| `PATCH` | `/api/v1/master-data/items/:id` | 200 / 404 | Partial update |
| `DELETE` | `/api/v1/master-data/items/:id` | 204 / 404 | Soft delete (`isDeleted = true`) |

**DTO fields:**
- `create-item.dto.ts`: `sku` (string, max 64, required), `name` (string, max 255, required), `baseUomId` (string, required), `itemType` (enum, optional, default `GOODS`), `valuationMethod` (enum, optional, default `FIFO`), `isBatchTracked` / `isSerialTracked` (boolean, optional, default false), `shelfLifeDays` (int, optional), `reorderPoint` / `reorderQuantity` (decimal string, optional), `status` (enum, optional, default `ACTIVE`)
- `update-item.dto.ts`: same fields, all optional via `PartialType`
- `list-items.dto.ts`: `itemType?`, `status?`, `search?`, `page?`, `pageSize?`

**Error mapping:**
- Prisma `P2002` on the `items_sku_active_key` partial index (duplicate active SKU within a tenant) → `409 ConflictException` — "An item with SKU '<sku>' already exists."
- Prisma `P2025` (record not found) → `404 NotFoundException`
- Prisma `P2003` (FK violation on `baseUomId`) → `400 BadRequestException` — "baseUomId '<id>' does not reference an existing unit of measure."
- Read `tenantId` from the verified JWT, never from the request body.

**PR description to use:**
> Implements the Items master data CRUD API (§5.4). Follows the existing NestJS module structure (controller → service → Prisma), same as `master-data/uom`. Duplicate active SKU within a tenant returns 409; invalid `baseUomId` returns 400; missing record returns 404.

---

### PR 3 — Frontend UI `feat: add Item management UI page`

**Status:** [ ] Planned | [ ] In Progress | [ ] Merged
**Branch:** `feature/items-frontend`
**Depends on:** PR 2

**New files:**
```
apps/web/app/(authenticated)/inventory/items/
├── page.tsx                     ← Server Component — fetches item list
└── new/
    └── page.tsx                 ← create form page (mirrors uom/new)

apps/web/components/inventory/items/
├── ItemTable.tsx                 ← table with edit/delete row actions (client)
├── ItemCreateForm.tsx            ← create form (client)
└── ItemDialog.tsx                 ← edit dialog (client)
```

**UI behaviour:**
- Page title: "Items"
- Table columns: SKU, Name, Base UOM, Type (badge), Status (badge), Created, Actions
- "New Item" button → navigates to `items/new` (mirrors the UOM create-page pattern already in the codebase)
- Row "Edit" → opens `ItemDialog` pre-filled
- Row "Delete" → confirmation then soft-delete
- Base UOM field is a select populated from `GET /api/v1/master-data/uom` (existing endpoint)
- Form validation: `sku` ≤ 64 chars required, `name` ≤ 255 chars required, `baseUomId` required select
- Uses existing Radix UI components: Dialog, Button, Input, Label, Select, DropdownMenu

**PR description to use:**
> Item management page at `/inventory/items`. Server Component fetches and renders the list; base UOM is selected from the existing UOM API. Wired to the API from PR 2 via `apiClient`.

---

### PR 4 — Chatbot Frontend `feat: add Item Bot chat UI` *(deferred — see Notes)*

**Status:** [ ] Deferred
**Branch:** `feature/items-bot-frontend`
**Depends on:** PR 3

Not currently planned. UOM's Inventory Bot (§15 Phase 8) is being kept as a single proof-of-concept before the conversational pattern is replicated across every master-data module. If/when it's validated, this would follow the exact shape of [UOM PR 4](/docs/inventory/uom/implementation-plan.md): a floating chat widget calling `POST /api/v1/ai/items-bot/chat`, with a stub reply until the backend (PR 5 below) exists.

---

### PR 5 — Bot Backend `feat: add item bot backend with Claude-powered intent parsing` *(deferred — see Notes)*

**Status:** [ ] Deferred
**Branch:** `feature/items-bot-backend`
**Depends on:** PR 2

Not currently planned, for the same reason as PR 4. Would mirror [UOM PR 5](/docs/inventory/uom/implementation-plan.md): Claude-powered `CREATE_ITEM` / `LIST_ITEMS` / `QUERY_ITEM` intent parsing, all mutations routed through `ItemsService` (never direct DB access from the AI layer), human-in-the-loop confirmation before create.

---

## Execution Order

```
PR 1 (DB schema)  ✅ in progress
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
| PR 1 | DB schema | In Progress | `chore/items-db-schema` | — |
| PR 2 | API CRUD | Planned | `feature/items-api` | — |
| PR 3 | FE UI | Planned | `feature/items-frontend` | — |
| PR 4 | Bot FE | Deferred | `feature/items-bot-frontend` | — |
| PR 5 | Bot backend | Deferred | `feature/items-bot-backend` | — |

---

## Notes

- `category_id`, `hsn_sac_code`, and item attributes are **not** implemented in these PRs — each requires a table that doesn't exist yet (`item_categories`, `hsn_sac_codes`, `item_attributes`) and none of them block Purchase Order creation. Tracked separately.
- `uom_conversions` (already in the Prisma schema from the UOM PRs but unused) can now be wired up once PR 1 lands, since it requires `item_id` — that's a natural follow-up, not a blocker for POs.
- The Item Bot (PR 4/5) is intentionally deferred — the conversational/agentic pattern is a UOM-only proof of concept for now (§15 Phase 8) and can be layered onto Items later without changing this schema or API.
- After Items, the roadmap proceeds to **Suppliers** and **Warehouses** in parallel — see [docs/procurement/purchase-order-roadmap.md](/docs/procurement/purchase-order-roadmap.md).
