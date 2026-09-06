# Customers (Customer Master) — Implementation Plan

**Module:** Master Data → Customer Management
**Status:** Built (uncommitted — see Implementation Progress)
**Branch prefix:** `feature/customers-`
**Source:** [Enterprise SCM Architecture Design Document §5.5, §4.1 Domain D](/docs/Enterprise_SCM_Architecture_Design_Document.md), [Sales Orders](/docs/sales/sales-orders/implementation-plan.md)

---

## Architecture Reference

The architecture document (§5.5 Supplier & Customer Management) covers both sides of the trading-partner model. [Suppliers](/docs/suppliers/implementation-plan.md) delivered the buy-side half; this is the sell-side half, and it exists for the same structural reason suppliers did: `sales_orders.customer_id` is a hard NOT NULL blocker until `customers` exists.

The model is deliberately a near-mirror of `suppliers` so the two read the same way, with one field substitution — `rating_score` (how good a supplier is) becomes `credit_limit` (how much we'll let a customer owe us).

### `customers` — Customer master

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID PK | `cuid()` |
| `tenant_id` | UUID | NOT NULL — multi-tenant isolation (flat field, same pattern as `suppliers`, no `companies` table yet) |
| `code` | VARCHAR(32) | NOT NULL — unique per tenant among active rows (partial index, see below) |
| `legal_name` | VARCHAR(255) | NOT NULL |
| `default_currency` | VARCHAR(3) | NOT NULL, default `'USD'` — plain field, not an FK (see Deliberate simplifications) |
| `credit_limit` | NUMERIC(18,2) | nullable — sell-side analogue of `suppliers.rating_score`; **stored but not enforced** |
| `status` | ENUM | NOT NULL, default `PENDING_APPROVAL` — PENDING_APPROVAL, ACTIVE, BLOCKED |
| `is_deleted` | BOOLEAN | NOT NULL, default false — soft delete |
| `created_at` / `created_by` | TIMESTAMPTZ / UUID | Standard audit columns |
| `updated_at` / `updated_by` | TIMESTAMPTZ / UUID | Standard audit columns |

**Uniqueness:** `code` is enforced unique per `(tenant_id, code)` via a **partial unique index scoped to `is_deleted = false`** (`customers_code_active_key`), same pattern as `suppliers_code_active_key` / `items_sku_active_key` — a soft-deleted code can be reused and two tenants can independently define the same code. Managed via raw SQL in the migration; Prisma references it by map name to prevent drift.

**Deferred from the full §5.5 definition** (not needed to unblock sales order creation, and mirroring exactly what the Suppliers plan deferred):
- `payment_term_id` → `payment_terms` (table not built yet)
- `default_ar_account` → `chart_of_accounts` (GL domain, §5.12 — the AR mirror of the supplier plan's `default_ap_account`)
- `customer_addresses` — billing/shipping addresses per customer
- `customer_contacts` — contact persons per customer
- `customer_tax_registrations` — GSTIN/VAT/Tax ID (**sensitive** — will need CLAUDE.md's permission-gating on go-live)
- `customer_price_lists` — negotiated per-customer pricing; sales order lines currently take a hand-entered `unit_price`
- `credit_exposure` / AR ageing rollups — what `credit_limit` would actually be checked against

A sales order only needs a `customer_id` to reference. The fields above are the minimum to make that row meaningful: a code and name to identify the customer, a currency to default the order into, and a status so `BLOCKED` customers can be excluded from selection.

---

## Implementation PRs

### PR 1 — Database Schema `chore: add customers Prisma schema + migration`

**Status:** [x] Built | [ ] Merged

**Changes:**
- `apps/api/prisma/schema.prisma` — adds `Customer` model, `CustomerStatus` enum, `salesOrders` back-relation
- `apps/api/prisma/migrations/20260906000000_add_customers_and_sales_orders/` — creates `customers`, its enum, and the partial unique index on `(tenantId, code)`

Delivered in the same migration as sales orders, since neither is useful without the other.

### PR 2 — API CRUD `feat: add Customer CRUD API endpoints`

**Status:** [x] Built | [ ] Merged

`apps/api/src/master-data/customers/` — module, controller, service, and three DTOs. A direct structural copy of `master-data/suppliers`:

| Method | Route | Notes |
|---|---|---|
| `GET` | `/api/master-data/customers` | Filters: `status`, `search` (code or legal name, case-insensitive), `limit`, `offset` |
| `GET` | `/api/master-data/customers/:id` | 404 if absent or in another tenant |
| `POST` | `/api/master-data/customers` | 201 |
| `PATCH` | `/api/master-data/customers/:id` | |
| `DELETE` | `/api/master-data/customers/:id` | 204 — soft delete (`isDeleted = true`) |

All routes guarded by `JwtAuthGuard`; `tenantId` read from the verified JWT, never the request body. Prisma errors mapped per CLAUDE.md: `P2002` → `ConflictException`, `P2025` → `NotFoundException`.

### PR 3 — Frontend UI `feat: add Customer management UI page`

**Status:** [x] Built | [ ] Merged

- `apps/web/app/(authenticated)/customers/page.tsx` — server component, fetches via `apiClient`
- `apps/web/app/(authenticated)/customers/new/page.tsx`
- `apps/web/components/customers/CustomerTable.tsx` — Astryx `Table` + status `Badge`, edit dialog, delete `AlertDialog`
- `apps/web/components/customers/CustomerDialog.tsx` — edit-in-place dialog; also exports the `Customer` type and status constants
- `apps/web/components/customers/CustomerCreateForm.tsx` — full-page create form
- `apps/web/components/AppNav.tsx` — adds the **Customers** tab, positioned after Suppliers

### PR 4 — Chat agent registration *(not done — see Deliberate simplifications)*

**Status:** [ ] Deferred

---

## Implementation Progress

| PR | Title | Status | Notes |
|---|---|---|---|
| PR 1 | DB schema | Built | Shared migration with sales orders |
| PR 2 | API CRUD | Built | Typechecks clean; exercised via the sales-order smoke test |
| PR 3 | Frontend UI | Built | `/customers` and `/customers/new` render 200 |
| PR 4 | Chat agent registration | Deferred | See below |

Built in a single pass rather than as a PR sequence, and **not yet committed** — the work sits uncommitted on `feature/ncb_06131`. The PR breakdown above describes how it would be split for review.

---

## Deliberate simplifications

Same pattern as the Suppliers plan:

- **No `companies` / `currencies` / `payment_terms` tables.** `tenantId` is a flat field; `defaultCurrency` is a plain 3-char string, not an FK.
- **`credit_limit` is stored but never checked.** Nothing reads it. Enforcing it means checking order value against outstanding AR exposure at `confirm` time, and neither an AR ledger nor an exposure rollup exists yet. The column is here so that check has somewhere to read from without a schema change.
- **No customer-specific pricing.** Sales order lines take a hand-entered `unitPrice`. A `customer_price_lists` table would be the natural home for negotiated rates.
- **Soft delete, unlike sales orders.** Customers are master data and keep `isDeleted`, matching Items/Suppliers/Warehouses. Sales orders are transactional documents and get `CANCELLED` instead — see that plan's "Why no `isDeleted`".
- **No chat agent registration.** Suppliers are registered in `api-capability.service.ts` so the AI agent can create them. That file is already 564 lines — well past CLAUDE.md's 300-line limit — so adding two more modules to it was deliberately skipped; it needs extracting into per-module capability files first.

## After Customers

The immediate consumer is [Sales Orders](/docs/sales/sales-orders/implementation-plan.md). Beyond that, the natural follow-ups are customer addresses/contacts (needed for a real ship-to, which the sales order currently lacks) and price lists.
