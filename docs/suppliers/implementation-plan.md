# Suppliers (Supplier/Vendor Master) — Implementation Plan

**Module:** Master Data → Supplier Management
**Status:** Planned
**Branch prefix:** `feature/suppliers-`
**Source:** [Enterprise SCM Architecture Design Document §5.5, §4.1 Domain D](/docs/Enterprise_SCM_Architecture_Design_Document.md), [Purchase Order Roadmap](/docs/procurement/purchase-order-roadmap.md)

---

## Architecture Reference

The architecture document (§5.5 Supplier & Customer Management, §4.1 Domain D) defines 7 supplier tables. This is step 2 of the [roadmap to Purchase Order creation](/docs/procurement/purchase-order-roadmap.md) — `purchase_orders.supplier_id` is a hard NOT NULL blocker until `suppliers` exists. It can proceed in parallel with [Warehouses](/docs/warehouses/implementation-plan.md); the two don't depend on each other.

### `suppliers` — Supplier/vendor master

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `tenant_id` | UUID | NOT NULL — multi-tenant isolation (flat field, same pattern as `items`/`units_of_measure`, no `companies` table yet) |
| `code` | VARCHAR(32) | NOT NULL — unique per tenant among active rows (partial index, see below) |
| `legal_name` | VARCHAR(255) | NOT NULL |
| `default_currency` | VARCHAR(3) | NOT NULL, default `'USD'` — plain field, not an FK (see Deliberate simplifications) |
| `rating_score` | NUMERIC(4,2) | nullable |
| `status` | ENUM | NOT NULL, default `PENDING_APPROVAL` — PENDING_APPROVAL, ACTIVE, BLOCKED |
| `is_deleted` | BOOLEAN | NOT NULL, default false — soft delete |
| `created_at` / `created_by` | TIMESTAMPTZ / UUID | Standard audit columns |
| `updated_at` / `updated_by` | TIMESTAMPTZ / UUID | Standard audit columns |

**Uniqueness:** `code` is enforced unique per `(tenant_id, code)` via a **partial unique index scoped to `is_deleted = false`**, same pattern as `units_of_measure_code_active_key` and `items_sku_active_key` — a soft-deleted code can be reused and two tenants can independently define the same code.

**Deferred from the full §5.5/Domain D definition** (not needed to unblock PO creation — see the roadmap's "Deliberate simplifications"):
- `payment_term_id` → `payment_terms` (table not built yet)
- `default_ap_account` → `chart_of_accounts` (table not built yet — GL domain, §5.12)
- `supplier_addresses` — billing/shipping addresses per supplier
- `supplier_contacts` — contact persons per supplier
- `supplier_bank_accounts` — bank details for payments (**sensitive** — will need CLAUDE.md's permission-gating on go-live, see Notes)
- `supplier_tax_registrations` — GSTIN/VAT/Tax ID registrations (**sensitive** — same gating requirement)
- `supplier_items` — approved-vendor list (item ↔ supplier ↔ cost ↔ lead time); needs `items` to exist, which it now does, but is a separate follow-up, not a PO blocker
- `supplier_ratings` — periodic performance scorecards (`rating_score` on the base table is a placeholder for a future rollup from this table)

A PO only needs a `supplier_id` to reference — the fields above are the minimum to make that row meaningful (a code and name to identify the supplier, a currency to default the PO into, and a status so `BLOCKED` suppliers can be excluded from selection). Everything else is downstream of PO creation, not a prerequisite for it.

---

## Implementation PRs

### PR 1 — Database Schema `chore: add suppliers Prisma schema + migration`

**Status:** [x] Planned | [ ] In Progress | [ ] Merged
**Branch:** `chore/suppliers-db-schema`

**Changes:**
- `apps/api/prisma/schema.prisma` — add `Supplier` model, `SupplierStatus` enum
- `apps/api/prisma/migrations/` — creates `suppliers`, its enum, and the partial unique index on `(tenantId, code)`

**Prisma model:**
```prisma
enum SupplierStatus {
  PENDING_APPROVAL
  ACTIVE
  BLOCKED
}

model Supplier {
  id              String         @id @default(cuid())
  tenantId        String
  code            String         @db.VarChar(32)
  legalName       String         @db.VarChar(255)
  defaultCurrency String         @default("USD") @db.VarChar(3)
  ratingScore     Decimal?       @db.Decimal(4, 2)
  status          SupplierStatus @default(PENDING_APPROVAL)
  isDeleted       Boolean        @default(false)
  createdAt       DateTime       @default(now())
  createdBy       String?
  updatedAt       DateTime       @updatedAt
  updatedBy       String?

  // Partial unique index (tenantId, code) WHERE isDeleted = false is managed
  // via raw SQL migration — Prisma references it by map name to prevent drift,
  // same pattern as units_of_measure_code_active_key / items_sku_active_key.
  @@index([tenantId, code], map: "suppliers_code_active_key")
  @@map("suppliers")
}
```

**PR description to use:**
> Adds the `suppliers` table as defined in §5.5/Domain D of the Enterprise SCM Architecture Design Document, scoped down to the fields needed to unblock Purchase Order creation (addresses, contacts, bank accounts, tax registrations, approved-vendor list, and ratings history all deferred — see docs/suppliers/implementation-plan.md). Schema-only PR — no application logic.

---

### PR 2 — API CRUD `feat: add Supplier CRUD API endpoints`

**Status:** [x] Planned | [ ] In Progress | [ ] Merged
**Branch:** `feature/suppliers-api`
**Depends on:** PR 1

**New files:**
```
apps/api/src/master-data/suppliers/
├── suppliers.module.ts
├── suppliers.controller.ts
├── suppliers.service.ts
└── dto/
    ├── create-supplier.dto.ts
    ├── update-supplier.dto.ts
    └── list-suppliers.dto.ts
```

**Endpoints:**

| Method | Route | Status Code | Notes |
|---|---|---|---|
| `GET` | `/api/v1/master-data/suppliers` | 200 | List — filterable by `status`; searchable by `code`/`legalName`; paginated |
| `GET` | `/api/v1/master-data/suppliers/:id` | 200 / 404 | Single supplier |
| `POST` | `/api/v1/master-data/suppliers` | 201 | Create |
| `PATCH` | `/api/v1/master-data/suppliers/:id` | 200 / 404 | Partial update |
| `DELETE` | `/api/v1/master-data/suppliers/:id` | 204 / 404 | Soft delete (`isDeleted = true`) |

**DTO fields:**
- `create-supplier.dto.ts`: `code` (string, max 32, required), `legalName` (string, max 255, required), `defaultCurrency` (string, 3 chars, optional, default `USD`), `ratingScore` (decimal string, optional), `status` (enum, optional, default `PENDING_APPROVAL`)
- `update-supplier.dto.ts`: same fields, all optional
- `list-suppliers.dto.ts`: `status?`, `search?`, `limit?`, `offset?`

**Error mapping:**
- Prisma `P2002` on the `suppliers_code_active_key` partial index (duplicate active code within a tenant) → `409 ConflictException` — "A supplier with code '<code>' already exists."
- Prisma `P2025` (record not found) → `404 NotFoundException`
- Read `tenantId` from the verified JWT, never from the request body.

**PR description to use:**
> Implements the Supplier master data CRUD API (§5.5). Follows the existing NestJS module structure (controller → service → Prisma), same as `master-data/items`. Duplicate active code within a tenant returns 409; missing record returns 404.

---

### PR 3 — Frontend UI `feat: add Supplier management UI page`

**Status:** [x] Planned | [ ] In Progress | [ ] Merged
**Branch:** `feature/suppliers-frontend`
**Depends on:** PR 2

**New files:**
```
apps/web/app/(authenticated)/suppliers/
├── page.tsx                     ← Server Component — fetches supplier list
└── new/
    └── page.tsx                 ← create form page (mirrors items/new)

apps/web/components/suppliers/
├── SupplierTable.tsx             ← table with edit/delete row actions (client)
├── SupplierCreateForm.tsx        ← create form (client)
└── SupplierDialog.tsx            ← edit dialog (client)
```

**UI behaviour:**
- Page title: "Suppliers"
- Built with Astryx design-system components — `Table`, `Badge` (status), `Card`, `Heading`, `Text`, `Dialog`/`Layout`, `TextInput`, `Selector` (status), `AlertDialog` (delete confirmation), `Banner` (errors) — mirroring `ItemTable`/`ItemDialog`/`ItemCreateForm`. No raw HTML form elements or `window.confirm`.
- Table columns: Code, Legal Name, Currency, Rating, Status (badge), Actions
- "New Supplier" button → navigates to `suppliers/new`
- Row "Edit" → opens `SupplierDialog` pre-filled
- Row "Delete" → `AlertDialog` confirmation then soft-delete
- Adds a "Suppliers" link to the top nav (`AppNav`)
- Form validation: `code` ≤ 32 chars required, `legalName` ≤ 255 chars required, `status` select

**PR description to use:**
> Supplier management page at `/suppliers`. Server Component fetches and renders the list. Built entirely with Astryx components, mirroring the Items feature. Wired to the API from PR 2 via `apiClient`.

---

### PR 4 — Chatbot Frontend `feat: add Supplier Bot chat UI` *(deferred — see Notes)*

**Status:** [ ] Deferred
**Branch:** `feature/suppliers-bot-frontend`
**Depends on:** PR 3

Not currently planned — the conversational/agentic pattern remains a UOM-only proof of concept (§15 Phase 8), same deferral rationale as [Items PR 4](/docs/inventory/items/implementation-plan.md). If validated, note that Suppliers already gets **write access through the existing generic chat agent** (`ApiCapabilityService`'s `call_api` tool) once PR 2 lands and its endpoints are registered there — that's a small addition to an existing mechanism, not this dedicated-bot feature, and doesn't need to wait on this PR being un-deferred.

---

### PR 5 — Bot Backend `feat: add supplier bot backend with Claude-powered intent parsing` *(deferred — see Notes)*

**Status:** [ ] Deferred
**Branch:** `feature/suppliers-bot-backend`
**Depends on:** PR 2

Not currently planned, for the same reason as PR 4. Would mirror [UOM PR 5](/docs/inventory/uom/implementation-plan.md): Claude-powered `CREATE_SUPPLIER` / `LIST_SUPPLIERS` / `QUERY_SUPPLIER` intent parsing, all mutations routed through `SuppliersService` (never direct DB access from the AI layer), human-in-the-loop confirmation before create.

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
| PR 1 | DB schema | Planned | `chore/suppliers-db-schema` | — |
| PR 2 | API CRUD | Planned | `feature/suppliers-api` | — |
| PR 3 | FE UI | Planned | `feature/suppliers-frontend` | — |
| PR 4 | Bot FE | Deferred | `feature/suppliers-bot-frontend` | — |
| PR 5 | Bot backend | Deferred | `feature/suppliers-bot-backend` | — |

---

## Notes

- `payment_term_id` and `default_ap_account` are **not** implemented in these PRs — both require tables that don't exist yet (`payment_terms`, `chart_of_accounts`) and neither blocks Purchase Order creation. Tracked separately.
- `supplier_addresses`, `supplier_contacts`, `supplier_bank_accounts`, `supplier_tax_registrations`, `supplier_items`, and `supplier_ratings` are all deferred — none block PO creation, which only needs `supplier_id` to reference a valid row.
- **Security reminder for when `supplier_bank_accounts` / `supplier_tax_registrations` are eventually built:** per CLAUDE.md, bank details and tax IDs are sensitive fields that must be gated behind explicit permission checks and never returned by default in list endpoints. Flagging this now so it isn't missed when those tables land — this PR sequence doesn't touch either table, so there's nothing to gate yet.
- `supplier_items` (approved-vendor list) can be wired up once this PR 1 lands, since `items` now exists — natural follow-up, not a PO blocker.
- After Suppliers and Warehouses both land, the roadmap proceeds to **Purchase Orders** — see [docs/procurement/purchase-order-roadmap.md](/docs/procurement/purchase-order-roadmap.md).
