# UOM (Unit of Measure) — Implementation Plan

**Module:** Master Data → Inventory
**Status:** Planned
**Branch prefix:** `feature/uom-`
**Source:** [Enterprise SCM Architecture Design Document §5.4](/docs/Enterprise_SCM_Architecture_Design_Document.md)

---

## Architecture Reference

The architecture document (§5.4 Master Data, §4.1 Domain C) defines two UOM tables and references UOM across 7 other tables.

### `units_of_measure` — UOM master catalog

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `tenant_id` | UUID → tenants | NOT NULL — multi-tenant isolation |
| `code` | VARCHAR(16) | NOT NULL, UNIQUE — e.g. 'EA', 'KG', 'BOX', 'DOZ' |
| `name` | VARCHAR(50) | NOT NULL — e.g. 'Each', 'Kilogram', 'Box' |
| `uom_class` | ENUM | NOT NULL — COUNT, WEIGHT, VOLUME, LENGTH, TIME |
| `is_deleted` | BOOLEAN | NOT NULL, default false — soft delete |
| `created_at` / `created_by` | TIMESTAMPTZ / UUID | Standard audit columns |
| `updated_at` / `updated_by` | TIMESTAMPTZ / UUID | Standard audit columns |

### `uom_conversions` — Per-item conversion factors

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID PK | |
| `item_id` | UUID → items | NOT NULL |
| `from_uom_id` | UUID → units_of_measure | NOT NULL |
| `to_uom_id` | UUID → units_of_measure | NOT NULL |
| `conversion_factor` | NUMERIC(18,8) | NOT NULL — 1 from_uom = factor × to_uom |
| `is_deleted` | BOOLEAN | NOT NULL, default false |
| `created_at` / `created_by` | TIMESTAMPTZ / UUID | Standard audit columns |
| `updated_at` / `updated_by` | TIMESTAMPTZ / UUID | Standard audit columns |
| UNIQUE | (item_id, from_uom_id, to_uom_id) | |

### UOM referenced in other tables

| Table | Column | Purpose |
|---|---|---|
| `items` | `base_uom_id` | Item's primary unit of measure |
| `purchase_order_lines` | `uom_id` | Unit ordered on a PO line |
| `goods_receipt_note_lines` | `uom_id` | Unit received on a GRN line |
| `price_list_items` | `uom_id` | Unit for which price applies |
| `warehouse_bins` | `capacity_uom_id` | Unit for bin capacity |
| `inventory_ledger` | `uom_id` | Unit of every stock movement |
| `sales_order_lines` | `uom_id` | Unit ordered on a SO line |

---

## Implementation PRs

### PR 1 — Database Schema `chore: add units_of_measure and uom_conversions Prisma schema + migration`

**Status:** [ ] Planned | [ ] In Progress | [ ] Merged

**Branch:** `chore/uom-db-schema`

**Changes:**
- `apps/api/prisma/schema.prisma` — add `UnitOfMeasure` model, `UomConversion` model, `UomClass` enum
- `apps/api/prisma/migrations/` — generated migration SQL

**Prisma models to add:**
```prisma
enum UomClass {
  COUNT
  WEIGHT
  VOLUME
  LENGTH
  TIME
}

model UnitOfMeasure {
  id        String    @id @default(cuid())
  code      String    @unique @db.VarChar(16)
  name      String    @db.VarChar(50)
  uomClass  UomClass
  isDeleted Boolean   @default(false)
  createdAt DateTime  @default(now())
  createdBy String?
  updatedAt DateTime  @updatedAt
  updatedBy String?

  uomConversionsFrom UomConversion[] @relation("FromUom")
  uomConversionsTo   UomConversion[] @relation("ToUom")

  @@map("units_of_measure")
}

model UomConversion {
  id               String        @id @default(cuid())
  itemId           String
  fromUomId        String
  toUomId          String
  conversionFactor Decimal       @db.Decimal(18, 8)
  isDeleted        Boolean       @default(false)
  createdAt        DateTime      @default(now())
  createdBy        String?
  updatedAt        DateTime      @updatedAt
  updatedBy        String?

  fromUom UnitOfMeasure @relation("FromUom", fields: [fromUomId], references: [id])
  toUom   UnitOfMeasure @relation("ToUom", fields: [toUomId], references: [id])

  @@unique([itemId, fromUomId, toUomId])
  @@map("uom_conversions")
}
```

**PR description to use:**
> Adds the `units_of_measure` and `uom_conversions` tables as defined in §5.4 of the Enterprise SCM Architecture Design Document. This is a schema-only PR — no application logic. All subsequent UOM PRs depend on this migration.

---

### PR 2 — API CRUD `feat: add UOM CRUD API endpoints`

**Status:** [ ] Planned | [ ] In Progress | [ ] Merged

**Branch:** `feature/uom-api`
**Depends on:** PR 1

**New files:**
```
apps/api/src/master-data/uom/
├── uom.module.ts
├── uom.controller.ts
├── uom.service.ts
└── dto/
    ├── create-uom.dto.ts
    └── update-uom.dto.ts
```

**Endpoints:**

| Method | Route | Status Code | Notes |
|---|---|---|---|
| `GET` | `/api/v1/master-data/uom` | 200 | List — filterable by `uomClass`, paginated |
| `GET` | `/api/v1/master-data/uom/:id` | 200 / 404 | Single UOM |
| `POST` | `/api/v1/master-data/uom` | 201 | Create |
| `PATCH` | `/api/v1/master-data/uom/:id` | 200 / 404 | Partial update |
| `DELETE` | `/api/v1/master-data/uom/:id` | 204 / 404 | Soft delete (`isDeleted = true`) |

**DTO fields:**
- `create-uom.dto.ts`: `code` (string, max 16), `name` (string, max 50), `uomClass` (UomClass enum) — all required
- `update-uom.dto.ts`: same fields, all optional via `PartialType`

**Error mapping:**
- Prisma `P2002` (unique constraint on `code`) → `409 ConflictException`
- Prisma `P2025` (record not found) → `404 NotFoundException`

**PR description to use:**
> Implements the UOM master data CRUD API (§5.4, §14.3). Follows the existing NestJS module structure (controller → service → Prisma). Duplicate `code` returns 409; missing record returns 404. No auth guard yet — that comes with the broader auth implementation.

---

### PR 3 — Frontend UI `feat: add UOM management UI page`

**Status:** [ ] Planned | [ ] In Progress | [ ] Merged

**Branch:** `feature/uom-frontend`
**Depends on:** PR 2

**New files:**
```
apps/web/app/(authenticated)/inventory/units-of-measure/
└── page.tsx                     ← Server Component — fetches UOM list

apps/web/components/inventory/uom/
├── UomTable.tsx                 ← table with edit/delete row actions (client)
└── UomDialog.tsx                ← create/edit dialog (client)
```

**UI behaviour:**
- Page title: "Units of Measure"
- Table columns: Code, Name, Class (badge), Created, Actions
- "New UOM" button → opens `UomDialog` with blank form
- Row "Edit" → same dialog pre-filled
- Row "Delete" → confirmation then soft-delete
- Form validation: `code` ≤ 16 chars, `name` ≤ 50 chars, `uomClass` required select
- Uses existing Radix UI components: Dialog, Button, Input, Label, DropdownMenu

**PR description to use:**
> UOM management page at `/inventory/units-of-measure`. Server Component fetches and renders the list; client Dialog handles create/edit without a page navigation. Uses only existing Radix UI primitives. Wired to the API from PR 2 via `apiClient`.

---

### PR 4 — Chatbot Frontend `feat: add Inventory Bot chat UI`

**Status:** [ ] Planned | [ ] In Progress | [ ] Merged

**Branch:** `feature/uom-bot-frontend`
**Depends on:** PR 3 (layout integration); can be developed in parallel with PR 5 using a stub

**New files:**
```
apps/web/components/inventory/bot/
├── InventoryBot.tsx             ← floating button + chat panel (client)
├── ChatMessage.tsx              ← single message bubble
└── ChatInput.tsx                ← textarea + send button
```

**Modified files:**
- `apps/web/app/(authenticated)/layout.tsx` — import and render `<InventoryBot />` as a fixed-position overlay

**UX spec:**
- Floating pill button: bottom-right corner, label "Inventory Bot"
- Click opens a 300×480px chat panel (card with shadow)
- User types natural language — e.g. `"Create a UOM called Dozen, code DOZ, class COUNT"`
- Shows typing indicator while awaiting backend
- Bot reply shows as a message bubble + optional "Review & Confirm" button that opens the UOM dialog pre-filled with extracted values
- Chat history persists in React state for the session (not saved to DB)
- Calls `POST /api/v1/ai/inventory-bot/chat` with `{ message: string }`
- Uses stub response (`"Coming soon…"`) until PR 5 is merged

**PR description to use:**
> Floating Inventory Bot chat widget added to the authenticated layout (§15 Phase 8 — Conversational/Agentic Interfaces). Client-only component that calls the bot API. Includes a stub response fallback so the UI is testable before the AI backend (PR 5) is merged.

---

### PR 5 — Bot Backend `feat: add inventory bot backend with Claude-powered UOM intent parsing`

**Status:** [ ] Planned | [ ] In Progress | [ ] Merged

**Branch:** `feature/uom-bot-backend`
**Depends on:** PR 2

**New files:**
```
apps/api/src/ai/inventory-bot/
├── inventory-bot.module.ts
├── inventory-bot.controller.ts
├── inventory-bot.service.ts
└── dto/
    ├── chat-message.dto.ts      (message: string, conversationId?: string)
    └── chat-response.dto.ts     (reply: string, action?: UomActionPayload)
```

**Endpoint:**
- `POST /api/v1/ai/inventory-bot/chat` — accepts `{ message }`, returns `{ reply, action? }`

**How it works:**
1. Service calls Claude API (`claude-sonnet-4-6`) with a system prompt defining available UOM intents
2. Claude returns structured JSON intent when it detects a UOM action:
   - `{ intent: "CREATE_UOM", payload: { code, name, uomClass } }` → calls `UomService.create()` and confirms
   - `{ intent: "LIST_UOMS", filters?: { uomClass } }` → calls `UomService.findAll()` and formats results
   - `{ intent: "QUERY_UOM", code }` → calls `UomService.findByCode()` and describes the UOM
   - `{ intent: "CONVERSATIONAL" }` → returns Claude's plain text reply
3. Response shape: `{ reply: string, action?: { type: "PREFILL_UOM_DIALOG", data: CreateUomDto } }`
   - `action` is returned when the user asks to create — the FE uses it to pre-fill the UomDialog for user review before actually submitting

**Key constraint (per §15.5):** All mutations flow through `UomService` — the AI layer never accesses the database directly.

**Environment variable needed:** `ANTHROPIC_API_KEY` in `apps/api/.env`

**PR description to use:**
> Inventory Bot backend using Claude (claude-sonnet-4-6) for UOM intent parsing (§15 Phase 8). Supports CREATE, LIST, and QUERY intents. All mutations route through UomService — no direct DB access from the AI layer. The `action` field in the response lets the frontend pre-fill the UOM create form for user review before committing, keeping a human in the loop per §15.3.

---

## Execution Order

```
PR 1 (DB schema)
    │
    ▼
PR 2 (API)
    │
    ├──▶ PR 3 (FE list/edit UI)
    │         │
    │         ▼
    │    PR 4 (Bot FE — stub until PR 5 merges)
    │
    └──▶ PR 5 (Bot backend)
              │
              ▼
         PR 4 wired to real backend
```

---

## Implementation Progress

| PR | Title | Status | Branch | PR Link |
|---|---|---|---|---|
| PR 1 | DB schema | Planned | `chore/uom-db-schema` | — |
| PR 2 | API CRUD | Planned | `feature/uom-api` | — |
| PR 3 | FE UI | Planned | `feature/uom-frontend` | — |
| PR 4 | Bot FE | Planned | `feature/uom-bot-frontend` | — |
| PR 5 | Bot backend | Planned | `feature/uom-bot-backend` | — |

---

## Notes

- `uom_conversions` is **not** implemented in the initial PRs — it requires the `items` table to exist first (future work, tracked separately)
- UOM `code` values are global across tenants in the initial implementation; multi-tenant scoping (`tenant_id`) can be added later without a breaking migration
- The bot intentionally uses a "human in the loop" pattern for CREATE — it pre-fills the form rather than directly calling the API, so the user reviews before committing
