# Items (Item/Product/SKU Master) — Implementation Plan

**Module:** Master Data
**Status:** Planned
**Branch prefix:** `feature/items-`
**Source:** [Enterprise SCM Architecture Design Document §5.4](/docs/Enterprise_SCM_Architecture_Design_Document.md), [Purchase Order Roadmap](/docs/procurement/purchase-order-roadmap.md)

---

## Architecture Reference

The architecture document (§5.4 Master Data) defines `items` with a `base_uom_id` FK into the already-built `units_of_measure` table. This is step 1 of the [roadmap to Purchase Order creation](/docs/procurement/purchase-order-roadmap.md) — `purchase_order_lines.item_id` is a hard NOT NULL blocker until this exists.

### `items` — Item/product/SKU master

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `tenant_id` | UUID | NOT NULL — multi-tenant isolation (flat field, same pattern as `users`/`roles`, no `companies` table yet) |
| `sku` | VARCHAR(64) | NOT NULL, UNIQUE (`tenant_id`, `sku`) |
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

**Deferred from the full §5.4 definition** (not needed to unblock PO creation — see roadmap "Deliberate simplifications"):
- `category_id` → `item_categories` (hierarchy not built yet)
- `hsn_sac_code` → `hsn_sac_codes` (tax classification not built yet)
- Item attributes (`item_attributes` / `item_attribute_values`)
- `uom_conversions` — still blocked on `items` existing; can follow immediately after this PR lands

---

## Implementation PRs

### PR 1 — Database Schema `chore: add items Prisma schema + migration`

**Status:** [ ] Planned | [x] In Progress | [ ] Merged
**Branch:** `chore/items-db-schema`

**Changes:**
- `apps/api/prisma/schema.prisma` — add `Item` model, `ItemType`, `ValuationMethod`, `ItemStatus` enums; add inverse relation `items Item[]` on `UnitOfMeasure`
- `apps/api/prisma/migrations/` — generated migration SQL

**Prisma models to add:**
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
  id                String          @id @default(cuid())
  tenantId          String
  sku               String          @db.VarChar(64)
  name              String          @db.VarChar(255)
  baseUomId         String
  itemType          ItemType        @default(GOODS)
  valuationMethod   ValuationMethod @default(FIFO)
  isBatchTracked    Boolean         @default(false)
  isSerialTracked   Boolean         @default(false)
  shelfLifeDays     Int?
  reorderPoint      Decimal?        @db.Decimal(18, 4)
  reorderQuantity   Decimal?        @db.Decimal(18, 4)
  status            ItemStatus      @default(ACTIVE)
  isDeleted         Boolean         @default(false)
  createdAt         DateTime        @default(now())
  createdBy         String?
  updatedAt         DateTime        @updatedAt
  updatedBy         String?

  baseUom           UnitOfMeasure   @relation(fields: [baseUomId], references: [id])

  @@unique([tenantId, sku])
  @@map("items")
}
```

**PR description to use:**
> Adds the `items` table as defined in §5.4 of the Enterprise SCM Architecture Design Document, scoped down to the fields needed to unblock Purchase Order creation (category, HSN/SAC, and attributes deferred — see docs/master-data/items/implementation-plan.md). Schema-only PR — no application logic.

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
- Prisma `P2002` (unique constraint on `tenantId + sku`) → `409 ConflictException` — "An item with SKU '<sku>' already exists."
- Prisma `P2025` (record not found) → `404 NotFoundException`
- Prisma `P2003` (FK violation on `baseUomId`) → `400 BadRequestException` — "baseUomId '<id>' does not reference an existing unit of measure."
- Read `tenantId` from the verified JWT, never from the request body.

**PR description to use:**
> Implements the Items master data CRUD API (§5.4). Follows the existing NestJS module structure (controller → service → Prisma), same as `master-data/uom`. Duplicate SKU within a tenant returns 409; invalid `baseUomId` returns 400; missing record returns 404.

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

## Execution Order

```
PR 1 (DB schema)
    │
    ▼
PR 2 (API)
    │
    ▼
PR 3 (FE list/create/edit UI)
```

No chatbot PRs are planned for Items yet (unlike the UOM plan's PR 4/5) — the conversational interface pattern is being kept as a UOM-only proof of concept until it's validated; it can be layered onto Items later without changing this schema or API.

---

## Implementation Progress

| PR | Title | Status | Branch | PR Link |
|---|---|---|---|---|
| PR 1 | DB schema | In Progress | `chore/items-db-schema` | — |
| PR 2 | API CRUD | Planned | `feature/items-api` | — |
| PR 3 | FE UI | Planned | `feature/items-frontend` | — |

---

## Notes

- `category_id`, `hsn_sac_code`, and item attributes are **not** implemented in these PRs — each requires a table that doesn't exist yet (`item_categories`, `hsn_sac_codes`, `item_attributes`) and none of them block Purchase Order creation. Tracked separately.
- `uom_conversions` (already in the Prisma schema from the UOM PRs but unused) can now be wired up once this PR lands, since it requires `item_id` — that's a natural follow-up, not a blocker for POs.
- After Items, the roadmap proceeds to **Suppliers** and **Warehouses** in parallel — see [docs/procurement/purchase-order-roadmap.md](/docs/procurement/purchase-order-roadmap.md).
