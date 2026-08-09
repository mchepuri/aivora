# Purchase Orders — Technical Design & Implementation Plan

**Module:** Procurement
**Status:** Planned
**Branch prefix:** `feature/purchase-orders-`
**Source:** [Enterprise SCM Architecture Design Document §5.6](/docs/Enterprise_SCM_Architecture_Design_Document.md), [Purchase Order Roadmap](/docs/procurement/purchase-order-roadmap.md)

---

## Architecture Reference

The architecture document (§5.6 Procurement) defines `purchase_orders` and `purchase_order_lines`. This is step 4 — the target feature — of the [roadmap to Purchase Order creation](/docs/procurement/purchase-order-roadmap.md). Its three hard blockers ([Items](/docs/inventory/items/implementation-plan.md), [Suppliers](/docs/suppliers/implementation-plan.md), [Warehouses](/docs/warehouses/implementation-plan.md)) are all merged, so this is now unblocked.

### `purchase_orders` — PO header

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `tenant_id` | UUID | NOT NULL — multi-tenant isolation (flat field, same pattern as `items`/`suppliers`/`warehouses`, no `companies` table yet) |
| `po_number` | VARCHAR(32) | NOT NULL — unique per `(tenant_id, po_number)`, system-generated (see "PO numbering" below) |
| `supplier_id` | UUID → suppliers | NOT NULL |
| `warehouse_id` | UUID → warehouses | NOT NULL — ship-to |
| `currency` | VARCHAR(3) | NOT NULL, default `'USD'` — plain field, not a `currencies` FK (see Deliberate simplifications) |
| `fx_rate` | NUMERIC(18,8) | NOT NULL, default `1` |
| `order_date` | DATE | NOT NULL |
| `expected_date` | DATE | nullable |
| `status` | ENUM | NOT NULL, default `DRAFT` — `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CLOSED`, `CANCELLED` (full enum per architecture doc; this PR sequence only implements transitions between `DRAFT` / `PENDING_APPROVAL` / `APPROVED` / `CANCELLED` — see Approval Workflow) |
| `subtotal_amount` | NUMERIC(18,2) | NOT NULL, default `0` — sum of line totals |
| `tax_amount` | NUMERIC(18,2) | NOT NULL, default `0` — always `0` for now (see Deliberate simplifications) |
| `total_amount` | NUMERIC(18,2) | NOT NULL, default `0` — `subtotal_amount + tax_amount` |
| `approved_by` | UUID → users | nullable |
| `approved_at` | TIMESTAMPTZ | nullable |
| `rejection_reason` | VARCHAR(500) | nullable — **addition beyond §5.6**, see Deliberate simplifications |
| `created_at` / `created_by` | TIMESTAMPTZ / UUID | Standard audit columns — `created_by` doubles as the "maker" in the maker-checker approval check |
| `updated_at` / `updated_by` | TIMESTAMPTZ / UUID | Standard audit columns |

**Uniqueness:** `po_number` is a plain `UNIQUE (tenant_id, po_number)` — **not** a partial-unique-on-`is_deleted` index like the master-data tables. Purchase orders have no soft-delete flag; they're never deleted, only moved to `CANCELLED` (see "Why no `isDeleted`" below).

### `purchase_order_lines` — PO line items

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `purchase_order_id` | UUID → purchase_orders | NOT NULL, `onDelete: Cascade` |
| `line_no` | SMALLINT | NOT NULL — 1-based, assigned by request array order |
| `item_id` | UUID → items | NOT NULL |
| `uom_id` | UUID → units_of_measure | NOT NULL |
| `quantity_ordered` | NUMERIC(18,4) | NOT NULL, > 0 |
| `quantity_received` | NUMERIC(18,4) | NOT NULL, default `0` — denormalized rollup, **written only by the future Goods Receipt Notes milestone**; this PR sequence never updates it past its default |
| `unit_price` | NUMERIC(18,4) | NOT NULL, >= 0 |
| `tax_code_id` | UUID | nullable, **no FK relation yet** — column exists for forward compatibility, same precedent as `uom_conversions.item_id` before `items` existed (see [Items plan notes](/docs/inventory/items/implementation-plan.md)); unused/ignored until a `tax_codes` table and tax engine (§11) exist |
| `line_total` | NUMERIC(18,2) | NOT NULL — `quantity_ordered * unit_price`, rounded to 2dp |

**Uniqueness:** `UNIQUE (purchase_order_id, line_no)`.

---

## PO Numbering

No `number_sequences` table yet (deferred per the roadmap). Numbering scheme: **`PO-{YYYY}-{00001}`**, sequential per `(tenant_id, year)`.

Generation, inside the create transaction:
1. Count existing `purchase_orders` for the tenant where `po_number` starts with `PO-{currentYear}-`.
2. Format `next = count + 1`, zero-padded to 5 digits.
3. Attempt the insert. On `P2002` (unique conflict on `po_number`), recount and retry — up to 3 attempts — before giving up with `409 ConflictException`.

**Known limitation:** this is a count-then-insert approach, not a DB-level atomic sequence, so it has a narrow race window under concurrent creates for the same tenant in the same year. Acceptable at current volume; the retry-on-conflict makes it correct (no duplicate numbers), just not contention-free. Replace with a real `number_sequences` table (configurable prefix/padding, atomic `nextval`-style allocation) when that lands — no breaking change to the API shape, only to the internal generator.

---

## Approval Workflow

PO status includes `PENDING_APPROVAL` / `APPROVED`, which is the first feature that actually **calls into** the existing [`approval-limits`](/apps/api/src/approval-limits) and [`sod-rules`](/apps/api/src/sod-rules) modules rather than just coexisting with them as unrelated master data. Two distinct checks are involved and it's worth being precise about which module does which job:

### 1. Amount-based approval authority — `ApprovalLimitsService.check()`

`ApprovalLimitsService.check(tenantId, roleId, resource, amount, currency)` already exists and is exactly shaped for this (`resource` examples in its own doc comment include `"purchase_order"`). On `POST /purchase-orders/:id/approve`:

- Read the acting user's roles (`UserRole` rows) from the verified JWT/session — never trust a client-supplied role.
- For each role the user holds, call `approvalLimitsService.check(tenantId, roleId, 'purchase_order', po.totalAmount, po.currency)`.
- Approve if **any** role satisfies (`allowed: true`); if none do, `403 ForbiddenException`: *"Your role(s) do not have sufficient purchase order approval authority for {currency} {totalAmount}. Ask an approver with a higher limit."*

### 2. Maker-checker — deliberately **not** `SodRulesService`

It would be tempting to reuse `SodRulesService.validateRoleCombination()` here, but that method answers a different question: *does a single user simultaneously hold two roles declared mutually exclusive* (e.g. "Buyer" + "AP Clerk")? It has no concept of "the same document" and doesn't compare a specific creator against a specific approver.

The rule we actually need — *the user who approves a PO must not be the same user who created it* — is PO-level maker-checker, not a role-pair SoD rule. It's implemented directly in `PurchaseOrdersService.approve()`:

```
if (po.createdBy === actingUserId) {
  throw new ForbiddenException(
    'You cannot approve a purchase order you created (maker-checker / segregation of duties).'
  );
}
```

This is intentionally simple and PO-specific rather than a new generalized "self-approval" concept bolted onto `SodRule` — if a second maker-checker case shows up elsewhere (e.g. GRN posting), revisit whether it's worth generalizing then.

### Status machine (this PR sequence)

```
DRAFT ──submit──▶ PENDING_APPROVAL ──approve──▶ APPROVED
  ▲                      │
  └────────reject────────┘

DRAFT / PENDING_APPROVAL ──cancel──▶ CANCELLED
```

- **`submit`**: `DRAFT → PENDING_APPROVAL`. Validates the PO has ≥ 1 line and `total_amount > 0`. Clears any prior `rejection_reason`.
- **`approve`**: `PENDING_APPROVAL → APPROVED`. Runs both checks above; sets `approved_by`/`approved_at`.
- **`reject`**: `PENDING_APPROVAL → DRAFT`. Takes a required `reason` (persisted to `rejection_reason`) so the creator sees why without needing an `audit_logs` table (not built yet).
- **`cancel`**: `DRAFT` or `PENDING_APPROVAL` → `CANCELLED`. **Not** available from `APPROVED` — reversing an approved commitment is deferred (it interacts with downstream GRN/AP flows that don't exist yet).
- `PARTIALLY_RECEIVED`, `RECEIVED`, `CLOSED` are **not reachable via this API** — they're written by the future Goods Receipt Notes milestone. Modeled in the enum now (matches §5.6 exactly) so that migration isn't a breaking change later.

### Why no `isDeleted`

Items/Suppliers/Warehouses are master data with a soft-delete flag. A PO is a transactional document with a lifecycle — "deleting" one doesn't make sense once it exists; it gets `CANCELLED` instead, same discipline as the append-only-ledger philosophy in CLAUDE.md (reversals, not edits/deletes). So the `DELETE /purchase-orders/:id` endpoint means "cancel a `DRAFT` PO," not a hard delete or an `isDeleted` toggle — see PR 2.

---

## Implementation PRs

### PR 1 — Database Schema `chore: add purchase-orders Prisma schema + migration`

**Status:** [x] Planned | [ ] In Progress | [ ] Merged
**Branch:** `chore/purchase-orders-db-schema`

**Changes:**
- `apps/api/prisma/schema.prisma` — add `PurchaseOrder`, `PurchaseOrderLine` models, `PurchaseOrderStatus` enum
- `apps/api/prisma/migrations/` — creates `purchase_orders`, `purchase_order_lines`, the enum, `UNIQUE(tenantId, poNumber)`, `UNIQUE(purchaseOrderId, lineNo)`, and FKs to `suppliers`/`warehouses`/`items`/`units_of_measure`/`users`

**Prisma model:**
```prisma
enum PurchaseOrderStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  PARTIALLY_RECEIVED
  RECEIVED
  CLOSED
  CANCELLED
}

model PurchaseOrder {
  id               String              @id @default(cuid())
  tenantId         String
  poNumber         String              @db.VarChar(32)
  supplierId       String
  warehouseId      String
  currency         String              @default("USD") @db.VarChar(3)
  fxRate           Decimal             @default(1) @db.Decimal(18, 8)
  orderDate        DateTime            @db.Date
  expectedDate     DateTime?           @db.Date
  status           PurchaseOrderStatus @default(DRAFT)
  subtotalAmount   Decimal             @default(0) @db.Decimal(18, 2)
  taxAmount        Decimal             @default(0) @db.Decimal(18, 2)
  totalAmount      Decimal             @default(0) @db.Decimal(18, 2)
  approvedBy       String?
  approvedAt       DateTime?
  rejectionReason  String?             @db.VarChar(500)
  createdAt        DateTime            @default(now())
  createdBy        String?
  updatedAt        DateTime            @updatedAt
  updatedBy        String?

  supplier   Supplier            @relation(fields: [supplierId], references: [id])
  warehouse  Warehouse           @relation(fields: [warehouseId], references: [id])
  lines      PurchaseOrderLine[]

  @@unique([tenantId, poNumber])
  @@map("purchase_orders")
}

model PurchaseOrderLine {
  id                String   @id @default(cuid())
  purchaseOrderId   String
  lineNo            Int      @db.SmallInt
  itemId            String
  uomId             String
  quantityOrdered   Decimal  @db.Decimal(18, 4)
  quantityReceived  Decimal  @default(0) @db.Decimal(18, 4)
  unitPrice         Decimal  @db.Decimal(18, 4)
  taxCodeId         String?  // no FK yet — tax_codes table doesn't exist
  lineTotal         Decimal  @db.Decimal(18, 2)

  purchaseOrder PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  item          Item          @relation(fields: [itemId], references: [id])
  uom           UnitOfMeasure @relation(fields: [uomId], references: [id])

  @@unique([purchaseOrderId, lineNo])
  @@map("purchase_order_lines")
}
```

**PR description to use:**
> Adds `purchase_orders` and `purchase_order_lines` as defined in §5.6 of the Enterprise SCM Architecture Design Document, scoped down to the fields needed to create/approve a PO (no `currencies`/`tax_codes`/`number_sequences` tables yet — see docs/procurement/purchase-orders/implementation-plan.md). Adds one field beyond §5.6, `rejection_reason`, to support the reject workflow without an `audit_logs` table. Schema-only PR — no application logic.

---

### PR 2 — API CRUD `feat: add Purchase Order CRUD API endpoints`

**Status:** [ ] Planned | [ ] In Progress | [ ] Merged
**Branch:** `feature/purchase-orders-api`
**Depends on:** PR 1

**New files:**
```
apps/api/src/procurement/purchase-orders/
├── purchase-orders.module.ts
├── purchase-orders.controller.ts
├── purchase-orders.service.ts
└── dto/
    ├── create-purchase-order.dto.ts
    ├── create-purchase-order-line.dto.ts
    ├── update-purchase-order.dto.ts
    └── list-purchase-orders.dto.ts
```

**Endpoints:**

| Method | Route | Status Code | Notes |
|---|---|---|---|
| `GET` | `/api/v1/procurement/purchase-orders` | 200 | List — filterable by `status`/`supplierId`/`warehouseId`; searchable by `poNumber`; paginated |
| `GET` | `/api/v1/procurement/purchase-orders/:id` | 200 / 404 | Detail — includes lines, supplier, warehouse |
| `POST` | `/api/v1/procurement/purchase-orders` | 201 | Create as `DRAFT`; generates `poNumber`; computes `lineTotal`/`subtotalAmount`/`totalAmount` server-side (client-sent totals, if any, are ignored) |
| `PATCH` | `/api/v1/procurement/purchase-orders/:id` | 200 / 404 / 409 | Update — **`DRAFT` only**; `lines` is a full replace, not a per-line patch; `409` if status isn't `DRAFT` |
| `DELETE` | `/api/v1/procurement/purchase-orders/:id` | 204 / 404 / 409 | **Cancels** a `DRAFT` PO (`status → CANCELLED`), not a hard delete or `isDeleted` toggle — see "Why no `isDeleted`" above; `409` if status isn't `DRAFT` |

**DTO fields:**
- `create-purchase-order.dto.ts`: `supplierId` (string, required), `warehouseId` (string, required), `currency` (string, optional, max 3, default `USD`), `orderDate` (ISO date string, required), `expectedDate` (ISO date string, optional), `lines` (array, required, min 1, `@ValidateNested({ each: true })` of `CreatePurchaseOrderLineDto`)
- `create-purchase-order-line.dto.ts`: `itemId` (string, required), `uomId` (string, required), `quantityOrdered` (number, required, `@IsPositive`), `unitPrice` (number, required, `@Min(0)`), `taxCodeId` (string, optional — accepted but not validated against anything, since no `tax_codes` table exists)
- `update-purchase-order.dto.ts`: `warehouseId?`, `expectedDate?`, `currency?`, `lines?` (same shape as create; all optional)
- `list-purchase-orders.dto.ts`: `status?`, `supplierId?`, `warehouseId?`, `search?`, `limit?`, `offset?`

**Error mapping:**
- Prisma `P2002` on `(tenantId, poNumber)` after 3 generation retries → `409 ConflictException` — "Could not allocate a unique PO number, please retry."
- Prisma `P2003` (bad `supplierId`/`warehouseId`/`itemId`/`uomId`) → `400 BadRequestException` — "One or more referenced records (supplier, warehouse, item, or unit of measure) do not exist."
- Prisma `P2025` → `404 NotFoundException`
- Update/cancel attempted outside `DRAFT` → `409 ConflictException` — "Purchase order {poNumber} is {status}; only DRAFT purchase orders can be edited or cancelled this way."
- Read `tenantId` and `createdBy` from the verified JWT, never from the request body.

**PR description to use:**
> Implements PO create/list/detail/update/cancel (§5.6). Server computes `poNumber`, line totals, and header totals — never trusts client-sent amounts. Update and cancel are DRAFT-only; approval-related transitions are a separate PR (PR 3) since they touch `approval-limits`/RBAC rather than plain CRUD.

---

### PR 3 — API Approval Workflow `feat: add Purchase Order approval workflow`

**Status:** [ ] Planned | [ ] In Progress | [ ] Merged
**Branch:** `feature/purchase-orders-approval`
**Depends on:** PR 2

**New files:**
```
apps/api/src/procurement/purchase-orders/
└── dto/
    └── reject-purchase-order.dto.ts
```

**Endpoints:**

| Method | Route | Status Code | Notes |
|---|---|---|---|
| `POST` | `/api/v1/procurement/purchase-orders/:id/submit` | 200 / 404 / 409 | `DRAFT → PENDING_APPROVAL`; 409 if not `DRAFT` or if PO has 0 lines / `totalAmount` is 0 |
| `POST` | `/api/v1/procurement/purchase-orders/:id/approve` | 200 / 403 / 404 / 409 | `PENDING_APPROVAL → APPROVED`; runs amount-based approval check + maker-checker (see Approval Workflow above); 403 on either failure |
| `POST` | `/api/v1/procurement/purchase-orders/:id/reject` | 200 / 404 / 409 | `PENDING_APPROVAL → DRAFT`; body `{ reason }`, stored in `rejectionReason` |
| `POST` | `/api/v1/procurement/purchase-orders/:id/cancel` | 200 / 404 / 409 | `DRAFT` or `PENDING_APPROVAL` → `CANCELLED`; 409 from `APPROVED` onward |

**DTO fields:**
- `reject-purchase-order.dto.ts`: `reason!: string` (`@IsString`, `@MaxLength(500)`)

**PR description to use:**
> Adds the PO approval workflow: submit/approve/reject/cancel. Approve reuses `ApprovalLimitsService.check()` (resource `"purchase_order"`) for amount-based authority and adds a PO-specific maker-checker guard (approver ≠ creator) — deliberately not routed through `SodRulesService`, which answers a different question (role-pair conflicts, not creator-vs-approver on one document). See docs/procurement/purchase-orders/implementation-plan.md for the reasoning.

---

### PR 4 — Frontend UI `feat: add Purchase Order management UI`

**Status:** [ ] Planned | [ ] In Progress | [ ] Merged
**Branch:** `feature/purchase-orders-frontend`
**Depends on:** PR 3

**New files:**
```
apps/web/app/(authenticated)/purchase-orders/
├── page.tsx                       ← Server Component — fetches PO list
├── new/page.tsx                   ← Server Component shell — renders PurchaseOrderForm
└── [id]/page.tsx                  ← Server Component — fetches PO detail, renders lines + status + actions

apps/web/components/purchase-orders/
├── PurchaseOrderTable.tsx          ← list table (client)
├── PurchaseOrderForm.tsx           ← create form: header fields + PurchaseOrderLinesEditor (client)
├── PurchaseOrderLinesEditor.tsx    ← add/remove line rows, live subtotal calc (client)
└── PurchaseOrderActions.tsx        ← Submit/Approve/Reject/Cancel buttons, gated by status (client)
```

**UI behaviour:**
- Given the line-items array and multi-step lifecycle, this follows the **Items/Suppliers `/new`-page pattern**, not the UOM/Warehouses inline-dialog pattern (too much form surface for a dialog).
- Page title: "Purchase Orders". List columns: PO Number, Supplier, Warehouse, Status (badge), Total, Order Date, Actions.
- `/purchase-orders/new`: supplier + warehouse `Selector`s, order/expected date pickers, dynamic line-item rows (item `Selector`, UOM `Selector`, quantity, unit price), running subtotal — all via Astryx (`Table`, `Selector`, `TextInput`, `Card`, `Heading`, `Text`, `Banner`).
- `/purchase-orders/[id]`: read-only header + line table, status `Badge`, and `PurchaseOrderActions` (buttons rendered conditionally per current `status`, e.g. Submit only on `DRAFT`, Approve/Reject only on `PENDING_APPROVAL`, Cancel on `DRAFT`/`PENDING_APPROVAL`). Reject opens a small `Dialog` prompting for `reason`.
- Adds a "Purchase Orders" link to the top nav (`AppNav`).

**PR description to use:**
> Purchase Order pages: list, create (`/new`, dynamic line items), and detail with lifecycle actions. Built entirely with Astryx components, wired to the PR 2/3 API via `apiClient`.

---

### PR 5 — Chatbot Frontend `feat: add Purchase Order Bot chat UI` *(deferred — see Notes)*

**Status:** [ ] Deferred
**Branch:** `feature/purchase-orders-bot-frontend`
**Depends on:** PR 4

Not currently planned — same deferral rationale as Items/Suppliers/Warehouses PR 4: the conversational/agentic pattern remains a UOM-only proof of concept (§15 Phase 8).

---

### PR 6 — Bot Backend *(deferred — see Notes)*

**Status:** [ ] Deferred
**Branch:** `feature/purchase-orders-bot-backend`
**Depends on:** PR 3

Not currently planned, for the same reason as PR 5. If ever built, approval actions in particular would need to stay human-in-the-loop (no auto-approving POs via chat), consistent with the UOM bot's confirmation-before-write pattern.

---

### Chat agent registration `feat: register Purchase Order CRUD with the chat agent`

**Status:** [ ] Planned
**Branch:** `feature/purchase-orders-chat-agent`
**Depends on:** PR 3

Registers the read/create endpoints (and, with explicit confirmation, submit) from PR 2/3 with the generic chat agent's `call_api` tool (`ApiCapabilityService`), same as Items/Suppliers/Warehouses. **Approve/reject/cancel are deliberately excluded from chat-agent registration** — those are authority-bearing actions gated by RBAC + maker-checker and shouldn't be reachable through the generic natural-language tool-calling surface until that surface has its own scoped permission model.

---

## Execution Order

```
PR 1 (DB schema)
    │
    ▼
PR 2 (API CRUD: create/list/detail/update/cancel-draft)
    │
    ▼
PR 3 (API approval workflow: submit/approve/reject/cancel)
    │
    ├──────────────┐
    ▼              ▼
PR 4 (FE UI)   Chat agent registration (read/create only)
    │
    ▼
PR 5 / PR 6 (Bot — deferred)
```

---

## Implementation Progress

| PR | Title | Status | Branch | PR Link |
|---|---|---|---|---|
| PR 1 | DB schema | Planned | `chore/purchase-orders-db-schema` | — |
| PR 2 | API CRUD | Planned | `feature/purchase-orders-api` | — |
| PR 3 | API approval workflow | Planned | `feature/purchase-orders-approval` | — |
| PR 4 | FE UI | Planned | `feature/purchase-orders-frontend` | — |
| PR 5 | Bot FE | Deferred | `feature/purchase-orders-bot-frontend` | — |
| PR 6 | Bot backend | Deferred | `feature/purchase-orders-bot-backend` | — |
| — | Chat agent registration (`call_api`, read/create only) | Planned | `feature/purchase-orders-chat-agent` | — |

---

## Deliberate simplifications

Same pattern as the Items/Suppliers/Warehouses plans:

- **No `companies`/`currencies`/`tax_codes`/`number_sequences` tables.** `tenantId` flat field; `currency` plain string (default `USD`, same precedent as `ApprovalLimit.currency`); `taxCodeId` an unused nullable column with no FK; PO numbering is a per-tenant/year counter (see "PO Numbering" above), swappable later without a breaking API change.
- **`tax_amount` is always `0` for now.** No tax engine (§11) exists yet; the column is kept so `total_amount = subtotal_amount + tax_amount` doesn't need a schema change when tax lands.
- **`rejection_reason` added beyond §5.6.** A small, justified deviation — without it, `reject` has nowhere to put its reason short of building the (much larger, separately-tracked) `audit_logs` table. One nullable `VARCHAR(500)` column is cheap and can be superseded by a real audit trail later without conflict.
- **No hard delete / `isDeleted`.** Unlike master data, POs are transactional documents — "delete" means `CANCELLED`, matching the append-only/reversal discipline in CLAUDE.md rather than the master-data soft-delete pattern.
- **`PARTIALLY_RECEIVED` / `RECEIVED` / `CLOSED` are schema-complete but API-unreachable.** They exist in the enum (matching §5.6 exactly, so the future GRN migration adds no new enum values) but nothing in this PR sequence can set them — that's the Goods Receipt Notes milestone.
- **Maker-checker is PO-specific, not a new generalized mechanism.** See "Approval Workflow" above for why this isn't routed through `SodRulesService`.
- **`goods_receipt_notes` / `goods_receipt_note_lines`** (§5.6) are out of scope entirely — the next milestone after this one, per the roadmap.

## After Purchase Orders

Once PO create/submit/approve exists, the roadmap's next milestone is **Goods Receipt Notes** (§5.6) — receiving against an `APPROVED` PO, which starts writing `quantity_received` on PO lines, transitions PO status to `PARTIALLY_RECEIVED`/`RECEIVED`, and is the first flow to actually write to the `inventory_ledger` (§7). Separate roadmap/plan doc once this lands.
