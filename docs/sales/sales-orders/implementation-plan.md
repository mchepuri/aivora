# Sales Orders — Technical Design & Implementation Plan

**Module:** Sales → Order Management
**Status:** Built (uncommitted — see Implementation Progress)
**Branch prefix:** `feature/sales-orders-`
**Source:** [Enterprise SCM Architecture Design Document §5.5, §5.6, §4.1 Domain D](/docs/Enterprise_SCM_Architecture_Design_Document.md), [Purchase Orders](/docs/procurement/purchase-orders/implementation-plan.md), [Customers](/docs/customers/implementation-plan.md)

---

## Architecture Reference

Sales Orders are the sell-side counterpart of [Purchase Orders](/docs/procurement/purchase-orders/implementation-plan.md): a PO is a commitment we *issue* to a supplier, an SO is a request we *receive* from a customer and commit to fulfil. The document structure is close enough to reuse the PO shape wholesale (header + lines, per-tenant/year numbering, no soft delete, Decimal money columns), but the **lifecycle is deliberately different** — see "Why not a mirror of the PO workflow" below.

Depends on [Customers](/docs/customers/implementation-plan.md) (`sales_orders.customer_id` is NOT NULL) and on the existing `warehouses`, `items`, and `units_of_measure` masters.

### `sales_orders` — SO header

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID PK | `cuid()` |
| `tenant_id` | UUID | NOT NULL — multi-tenant isolation |
| `so_number` | VARCHAR(32) | NOT NULL — unique per `(tenant_id, so_number)`, see "SO Numbering" |
| `customer_id` | UUID FK → `customers` | NOT NULL, ON DELETE RESTRICT |
| `warehouse_id` | UUID FK → `warehouses` | NOT NULL, ON DELETE RESTRICT — **ship-from**, not receive-into |
| `customer_po_ref` | VARCHAR(64) | nullable — the customer's own PO number against us; free text, no linked document |
| `currency` | VARCHAR(3) | NOT NULL, default `'USD'` |
| `fx_rate` | NUMERIC(18,8) | NOT NULL, default 1 — carried but unused, same as PO |
| `order_date` | DATE | NOT NULL |
| `requested_date` | DATE | nullable — what the customer asked for (the PO's `expected_date` mirror) |
| `status` | ENUM | NOT NULL, default `DRAFT` — see status machine |
| `subtotal_amount` | NUMERIC(18,2) | NOT NULL, default 0 |
| `tax_amount` | NUMERIC(18,2) | NOT NULL, default 0 — always 0 for now |
| `total_amount` | NUMERIC(18,2) | NOT NULL, default 0 |
| `confirmed_by` / `confirmed_at` | UUID / TIMESTAMPTZ | nullable — PO's `approved_by`/`approved_at` mirror |
| `shipped_at` | TIMESTAMPTZ | nullable |
| `invoiced_at` | TIMESTAMPTZ | nullable |
| `cancellation_reason` | VARCHAR(500) | nullable — same rationale as PO's `rejection_reason` |
| `created_at` / `created_by` | TIMESTAMPTZ / UUID | Standard audit columns |
| `updated_at` / `updated_by` | TIMESTAMPTZ / UUID | Standard audit columns |

**Uniqueness:** plain unique index on `(tenant_id, so_number)` — **not** partial-on-`is_deleted` like master data, because sales orders have no soft delete.

### `sales_order_lines` — SO line items

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID PK | `cuid()` |
| `sales_order_id` | UUID FK → `sales_orders` | NOT NULL, **ON DELETE CASCADE** |
| `line_no` | SMALLINT | NOT NULL — unique per `(sales_order_id, line_no)`; assigned 1..n on write |
| `item_id` | UUID FK → `items` | NOT NULL, ON DELETE RESTRICT |
| `uom_id` | UUID FK → `units_of_measure` | NOT NULL, ON DELETE RESTRICT |
| `quantity_ordered` | NUMERIC(18,4) | NOT NULL |
| `quantity_shipped` | NUMERIC(18,4) | NOT NULL, default 0 — sell-side mirror of `quantity_received` |
| `unit_price` | NUMERIC(18,4) | NOT NULL — hand-entered; no customer price list yet |
| `tax_code_id` | UUID | nullable, **no FK** — `tax_codes` doesn't exist; same precedent as PO |
| `line_total` | NUMERIC(18,2) | NOT NULL — computed server-side as `quantity_ordered × unit_price`, rounded to 2dp |

Line totals are always computed on the server from quantity × price; a client-supplied `lineTotal` is ignored. `subtotal_amount` is the sum of line totals, and `total_amount = subtotal_amount + tax_amount`.

---

## SO Numbering

Identical approach to PO numbering. Scheme: **`SO-{YYYY}-{00001}`**, sequential per `(tenant_id, year)`.

1. Count existing `sales_orders` for the tenant where `so_number` starts with `SO-{currentYear}-`.
2. Format `next = count + 1`, zero-padded to 5 digits.
3. Attempt the insert. On `P2002` on `so_number`, recount and retry — up to 3 attempts — then `409 ConflictException`.

**Known limitation:** count-then-insert, not an atomic DB sequence, so there's a narrow race window under concurrent creates for the same tenant and year. The retry loop makes it *correct* (no duplicates) but not contention-free. Replaced without an API change when a `number_sequences` table lands.

---

## Fulfilment Workflow

### Status machine

```
DRAFT ──confirm──▶ CONFIRMED ──allocate──▶ ALLOCATED ──pick──▶ PICKED
                                                                  │
                                                                 ship
                                                                  ▼
CLOSED ◀──close── INVOICED ◀──invoice── SHIPPED

DRAFT / CONFIRMED / ALLOCATED ──cancel──▶ CANCELLED
```

| Action | Transition | Notes |
|---|---|---|
| `confirm` | `DRAFT → CONFIRMED` | Requires ≥ 1 line and `total_amount > 0`. Stamps `confirmed_by`/`confirmed_at`, clears any prior `cancellation_reason`. |
| `allocate` | `CONFIRMED → ALLOCATED` | Status flip only — actual stock reservation arrives with the inventory ledger. |
| `pick` | `ALLOCATED → PICKED` | Warehouse has assembled the order. |
| `ship` | `PICKED → SHIPPED` | Writes `quantity_shipped = quantity_ordered` on every line, inside a transaction, and stamps `shipped_at`. |
| `invoice` | `SHIPPED → INVOICED` | Stamps `invoiced_at`. AR posting arrives with the double-entry GL milestone. |
| `close` | `INVOICED → CLOSED` | Terminal state for a fulfilled order. |
| `cancel` | `DRAFT`/`CONFIRMED`/`ALLOCATED` → `CANCELLED` | Requires a `reason` (persisted to `cancellation_reason`). **Not** available from `PICKED` onward. |

Every transition goes through one private `requireStatus(id, tenantId, allowed, verb)` helper, so an invalid transition always yields the same shape of `409`: *"Sales order SO-2026-00001 is CLOSED; only DRAFT, CONFIRMED or ALLOCATED sales orders can be cancelled."*

### Why not a mirror of the PO workflow

A purchase order's central question is *"are we allowed to commit this spend?"* — hence `PENDING_APPROVAL`, `ApprovalLimitsService`, and maker-checker. A sales order's central question is *"can we actually deliver this?"* — the money flows toward us, so internal spend authority is not the gate. What matters is warehouse progress, which is why the states track fulfilment (allocate → pick → ship) and billing (invoice) rather than approval.

Two consequences worth being explicit about:

- **No `ApprovalLimitsService` call and no maker-checker.** `confirm` is not `approve`. The creator of an SO may confirm it. If sales-side approval (discount authority, credit override) is wanted later, that's a new gate *before* `CONFIRMED`, not a rename of it.
- **No `reject`.** A PO can be sent back to `DRAFT` by an internal approver. A sales order that we can't fulfil is `CANCELLED`, not rejected — there's no second internal party in the loop to send it back to.

### Cancellation cutoff

`cancel` stops being available at `PICKED` because that's the first state where stock has physically moved. Unwinding after that needs a return/credit-note document, not a status flip — the same reasoning that stops PO cancellation at `APPROVED`.

### Why no `isDeleted`

Same as purchase orders: master data soft-deletes, transactional documents don't. `DELETE /sales-orders/:id` means "cancel a `DRAFT` sales order," not a hard delete or an `isDeleted` toggle — consistent with CLAUDE.md's reversals-not-edits discipline.

---

## Implementation PRs

### PR 1 — Database Schema `chore: add sales-orders Prisma schema + migration`

**Status:** [x] Built | [ ] Merged

- `apps/api/prisma/schema.prisma` — adds `SalesOrder`, `SalesOrderLine`, `SalesOrderStatus`, plus `salesOrderLines` back-relations on `UnitOfMeasure` and `Item` and `salesOrders` on `Warehouse`
- `apps/api/prisma/migrations/20260906000000_add_customers_and_sales_orders/migration.sql` — creates both enums, all three tables (with `customers`), indexes and FKs

Additive only: no existing table, column, or enum was altered.

### PR 2 — API CRUD `feat: add Sales Order CRUD API endpoints`

**Status:** [x] Built | [ ] Merged

`apps/api/src/sales/sales-orders/` — module, controller, service, five DTOs.

| Method | Route | Notes |
|---|---|---|
| `GET` | `/api/sales/sales-orders` | Filters: `status`, `customerId`, `warehouseId`, `search` (SO number), `limit`, `offset`. Includes customer + warehouse. |
| `GET` | `/api/sales/sales-orders/:id` | Full detail incl. lines with item/UOM |
| `POST` | `/api/sales/sales-orders` | 201; computes line totals + SO number |
| `PATCH` | `/api/sales/sales-orders/:id` | `DRAFT` only; `lines` replaces the whole set |
| `DELETE` | `/api/sales/sales-orders/:id` | 204; `DRAFT` only; sets `CANCELLED` |

### PR 3 — API Fulfilment Workflow `feat: add Sales Order fulfilment workflow`

**Status:** [x] Built | [ ] Merged

`POST /:id/confirm`, `/allocate`, `/pick`, `/ship`, `/invoice`, `/close`, `/cancel` — all `200`, all returning the full updated order. `cancel` takes a required `reason` (≤ 500 chars).

### PR 4 — Frontend UI `feat: add Sales Order management UI`

**Status:** [x] Built | [ ] Merged

- `app/(authenticated)/sales-orders/page.tsx` — list
- `app/(authenticated)/sales-orders/new/page.tsx` — parallel-fetches customers, warehouses, items, UOMs
- `app/(authenticated)/sales-orders/[id]/page.tsx` — detail, 404s on a missing/other-tenant id
- `app/(authenticated)/sales-orders/[id]/edit/page.tsx` — new draft-only edit route backed by the shared form
- `components/sales-orders/SalesOrderTypes.ts` — shared types, status labels/badges, and `NEXT_ACTION`
- `components/sales-orders/SalesOrderTable.tsx`, `SalesOrderForm.tsx`, `SalesOrderLinesEditor.tsx`, `SalesOrderDetail.tsx`, `SalesOrderActions.tsx`
- `components/AppNav.tsx` — adds the **Sales Orders** tab after Purchase Orders
- `components/ai-chat/AiChatContext.tsx` — adds direct sales-order shortcuts for `open sales order <so number>` and `edit sales order <so number>`; the edit variation is restricted to `DRAFT` orders
- `components/ai-chat/AiFloatingOverlay.tsx`, `AiSidePanel.tsx`, `AiChatLauncher.tsx`, `AivaChat.tsx` — chat can be collapsed to a small launcher when it would otherwise cover page content, with a manual collapse control in the floating chat header

`SalesOrderActions` renders **one** context-appropriate next-step button rather than a fixed set, driven by the `NEXT_ACTION` map in `SalesOrderTypes.ts`. That map duplicates the service's state machine in the client — deliberately, to avoid a round-trip just to learn which button to show, but it means **the two must be kept in step**; the server remains the authority and rejects anything invalid with a `409`.

### Recent UI / workflow updates (2026-09-11)

**Status:** [x] Added to this branch | [ ] Merged

The sales-order frontend received a follow-up UX pass on top of the original CRUD/UI build:

- `SalesOrderDetail.tsx` now exposes a pencil icon beside the status badge only when the order is in `DRAFT`, so non-draft orders stay read-only.
- `SalesOrderForm.tsx` now supports edit mode with two explicit return paths: `Cancel and return` and `Save and return`, both with confirmation prompts before leaving the edit page.
- The editor no longer shows the extra text labels on the top-right action buttons; the controls are now icon-only and aligned to the right side of the header for a cleaner edit experience.
- `AiChatContext.tsx` now recognizes direct sales-order prompts and routes users straight to the existing view page or the new edit page. The edit prompt is intentionally blocked for non-draft orders with an assistant reply explaining the restriction.
- The chat overlay/panel UI was refined so the user can manually collapse the floating chat window and re-open it via the blue launcher, improving full-page visibility on data-heavy screens.

These updates are already reflected in the running web app and are ready to be included in the branch documentation and commit set.

### PR 5 — Chat agent registration *(not done — see Deliberate simplifications)*

**Status:** [ ] Deferred

---

## Tests

`apps/api/src/sales/sales-orders/sales-orders.service.spec.ts` — 20 tests, all passing, Prisma fully mocked:

- `findOne` — found / not-found (tenant isolation)
- `create` — line-total + SO-number computation; `P2003` → `BadRequestException`
- `confirm` — happy path, empty-lines rejection, wrong-status rejection
- every forward transition, table-driven, happy path and wrong-status path
- `ship` — asserts the `quantity_shipped` rollup is written per line
- `cancel` — persists the reason; refuses once shipped
- `update` — refuses on a non-`DRAFT` order

---

## Implementation Progress

| PR | Title | Status | Notes |
|---|---|---|---|
| PR 1 | DB schema | Built | Migration applied to the Neon dev DB |
| PR 2 | API CRUD | Built | |
| PR 3 | API fulfilment workflow | Built | Full DRAFT→CLOSED walk verified against a live order |
| PR 4 | Frontend UI | Built | All three routes render 200; recent draft-edit, chat-navigation, and chat-collapsing UX additions are included in the frontend scope |
| PR 5 | Chat agent registration | Deferred | See below |

Verification at time of writing: `tsc --noEmit` clean on web, api, and the api Vercel entry; 20/20 unit tests pass; `SO-2026-00001` walked `DRAFT → CONFIRMED → ALLOCATED → PICKED → SHIPPED → INVOICED → CLOSED` with the `quantity_shipped` rollup landing correctly at the `ship` step.

Built in a single pass rather than as a PR sequence, and **not yet committed** — the work sits uncommitted on `feature/ncb_06131`. A full production `next build` has **not** been run (it would clobber the running dev server's `.next`); only typechecks.

---

## Commit labels and rollback notes

### Suggested commit labels

Use one of the following labels when preparing the branch for commit:

- `feat: add sales order draft edit flows and chat navigation`
- `feat: add sales order detail edit actions and chat collapse UX`
- `docs: update sales order implementation plan with latest frontend changes`

> If the work is being split into multiple commits, keep the functional UI changes and the documentation update separate so they can be reverted independently.

### Safe rollback steps

If the branch needs to be rolled back for any reason, use the following sequence:

1. Review the current branch state:

```bash
git status --short
git --no-pager log --oneline -n 12
```

2. Back up any local work you want to keep before reverting anything:

```bash
git stash push -u -m "sales-order-rollback-backup"
```

3. Revert the latest commit only:

```bash
git revert --no-edit HEAD
```

4. Revert a specific earlier commit by SHA:

```bash
git revert --no-edit 1576893
```

5. If you need to undo only documentation changes while keeping code intact:

```bash
git restore --source=HEAD -- docs/sales/sales-orders/implementation-plan.md
```

6. If you need to fully discard the branch and reset to a known-good commit:

```bash
git reset --hard <good-commit-sha>
```

### Rollback checklist

- [ ] Confirm which commit or file set must be reversed
- [ ] Create a backup stash if anything uncommitted should be preserved
- [ ] Use `git revert` for shared/committed work whenever possible
- [ ] Use `git reset --hard` only when a full branch rollback is explicitly required
- [ ] Re-run `tsc --noEmit` after any restore/revert to validate the branch state

---

## Deliberate simplifications

- **No `tax_codes` / `number_sequences` / `currencies` tables.** `tax_amount` is always 0; `tax_code_id` is an unused nullable column with no FK; SO numbering is a per-tenant/year counter; `currency` is a plain string. All the same choices the PO plan made, for the same reasons.
- **Full shipment only.** `ship` sets `quantity_shipped = quantity_ordered` on every line and moves straight to `SHIPPED`. There is no partial-shipment path and no `PARTIALLY_SHIPPED` status — partial fulfilment needs a Shipments document with its own lines, which is a separate milestone. `quantity_shipped` is modeled per-line now so that milestone doesn't need a schema change.
- **`allocate` and `pick` are status flips only.** Neither touches stock. Real allocation needs the `inventory_ledger` (§7), which no flow writes to yet — the same gap the PO plan notes for goods receipt.
- **No credit checking.** `Customer.credit_limit` is never read. See the [Customers plan](/docs/customers/implementation-plan.md).
- **No ship-to address.** The order ships *from* `warehouse_id`, but there's no customer address to ship *to* — `customer_addresses` isn't built. Fine while nothing generates a delivery note.
- **No line editing in the UI.** The API supports replacing lines via `PATCH` while `DRAFT`, but the detail page is read-only plus workflow actions. Purchase Orders have the identical gap; worth closing for both at once rather than diverging.
- **`fx_rate` is stored and ignored.** Carried for parity with `purchase_orders`; multi-currency reporting would be the first consumer.
- **No chat agent registration.** `api-capability.service.ts` is already 564 lines, well past CLAUDE.md's 300-line limit. Registering customers and sales orders should follow an extraction of that file into per-module capability definitions, not precede it.

---

## After Sales Orders

The natural next milestones, in dependency order:

1. **Shipments / delivery notes** — partial fulfilment, the `PARTIALLY_SHIPPED` state this plan skipped, and the first sell-side writer to the `inventory_ledger` (§7). The mirror of Goods Receipt Notes on the buy side.
2. **AR invoices** — turning `INVOICED` from a status flip into a real document, and the first sell-side producer of balanced GL entries (§8).
3. **Customer price lists** — replacing hand-entered `unit_price`.
4. **Credit management** — giving `credit_limit` something to be checked against at `confirm`.
