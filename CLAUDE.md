# Aivora — Claude Code Project Guide

This file is loaded automatically in every Claude Code session.
All rules here apply to every task unless the task explicitly overrides one.

---

## Project Overview

**Aivora** is an AI-enabled Supply Chain Management (SCM) / ERP platform.

```
aivora/
├── apps/
│   ├── api/      # NestJS 10 backend — REST API, port 3001
│   └── web/      # Next.js 14 (App Router) frontend — port 3000
└── packages/
    └── shared/   # Shared TypeScript types (no runtime deps)
```

Tech stack: Next.js 14 App Router · Tailwind CSS v4 · NestJS 10 · Prisma 5 · PostgreSQL · TypeScript strict · npm workspaces monorepo.

---

## Engineering Practices

### General
- **TypeScript strict mode is on everywhere.** Never use `any`. Prefer `unknown` for truly unknown types and narrow with guards.
- **No `console.log` in committed code.** Use structured logging in the API (NestJS `Logger`). Remove all debug logs before opening a PR.
- **No commented-out code.** Delete it; git history preserves it.
- **No TODOs in committed code** unless they reference a GitHub issue number: `// TODO(#42): ...`
- **Functions do one thing.** If you need to describe a function with "and", split it.
- **Keep files under 300 lines.** Extract to new files when approaching that limit.
- **Prefer explicit over clever.** A verbose but readable solution beats a compact but opaque one.
- **Error messages must be actionable.** "Something went wrong" is never acceptable. Say what failed and what the user can do.

### Git / PR workflow
- All changes to `main` go through a PR — direct pushes are blocked.
- Branch names: `feature/<short-description>`, `fix/<short-description>`, `chore/<short-description>`.
- PR titles follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- Every PR requires Claude automated review + 1 human approval before merge.
- Keep PRs small and focused — one logical change per PR.

### Testing
- Unit tests live next to the file they test: `foo.service.spec.ts` beside `foo.service.ts`.
- Integration tests go in `apps/api/test/`.
- Never mock the database in integration tests — use a real test database.
- A PR that adds a new endpoint must include at least one happy-path and one error-path test.

---

## Frontend — Next.js / React Rules

### Component architecture
- **Default to Server Components.** Only add `'use client'` when you need browser APIs, event handlers, or React hooks.
- **Route groups:**
  - `app/(public)/` — unauthenticated pages (landing, login, register). Shares the marketing Header + Footer layout.
  - `app/(authenticated)/` — authenticated pages. Has `export const dynamic = 'force-dynamic'` on its layout — never remove this.
- **Components live in `apps/web/components/`.** Pages in `app/` should be thin — they import components, not define them inline.
- **No prop drilling beyond 2 levels.** Lift state or use context/server data.
- **Keep components pure.** Side effects belong in hooks or server actions, not in render.

### File & naming conventions
- Component files: `PascalCase.tsx` (e.g., `ProductCard.tsx`)
- Hook files: `useCamelCase.ts` (e.g., `useInventory.ts`)
- Utility files: `camelCase.ts`
- One component per file. Default export for pages, named exports for components.

### Data fetching
- Fetch data in Server Components using `async/await` — no `useEffect` + fetch pattern for initial data.
- Use the `apiClient` in `apps/web/lib/apiClient.ts` for all API calls. Never call `fetch` directly.
- Always handle loading and error states explicitly — never silently swallow errors.

---

## Design System & Theme

Aivora uses an **Apple-inspired design language**: clean, minimal, generous whitespace, crisp typography.

### Tailwind v4 custom tokens (defined in `apps/web/app/globals.css`)

| Token | Hex | Usage |
|---|---|---|
| `text-ink` / `bg-ink` | `#1d1d1f` | Primary text, dark backgrounds, CTA buttons |
| `text-muted` | `#86868b` | Secondary text, placeholders, labels |
| `bg-canvas` | `#fbfbfd` | Page background (Apple's signature off-white) |
| `text-accent` / `bg-accent` | `#0071e3` | Links, primary action buttons, focus rings |

### Typography
- Font: **Inter** (loaded via `next/font/google`, CSS variable `--font-inter`).
- Body: `text-[15px]` or `text-[17px]` — match Apple's comfortable reading sizes.
- Headings: `font-semibold tracking-tight` — never bold for UI headings.
- Labels / captions: `text-[12px]` or `text-[13px]`.

### Spacing & layout
- Max content width: `max-w-6xl mx-auto px-6`.
- Cards / panels: `rounded-2xl` or `rounded-[28px]` for larger hero elements.
- Borders: `border border-black/5` (very subtle — Apple style).
- Shadows: `shadow-sm` for cards, `shadow-2xl` for hero/modal elements.

### Interactive elements
- Buttons: `rounded-full` pill shape. Primary = `bg-ink text-white`. Accent = `bg-accent text-white`.
- Always include `transition` on interactive elements for hover/focus states.
- Inputs: `rounded-xl border border-black/10 focus:border-accent focus:ring-1 focus:ring-accent`.
- Never use raw browser default focus outlines — always style `focus:` states.

### Do not
- Do not introduce new colour values outside the four theme tokens without updating `globals.css` and this file.
- Do not use Tailwind's default colours (`blue-500`, `gray-300`, etc.) — always use the theme tokens.
- Do not mix font sizes arbitrarily — stick to the Apple-scale sizes listed above.

---

## Backend — NestJS / API Rules

### Module structure
Every feature follows NestJS modular architecture:
```
src/feature/
├── feature.module.ts
├── feature.controller.ts
├── feature.service.ts
└── dto/
    ├── create-feature.dto.ts
    └── update-feature.dto.ts
```

### Controllers
- Controllers handle HTTP concerns only: routing, status codes, request/response shaping.
- All business logic lives in the service — never in the controller.
- Use appropriate HTTP status codes: `201` for POST creates, `204` for DELETE, `404` for not found, `409` for conflicts.
- Decorate all DTOs with `class-validator` decorators. The global `ValidationPipe` is already configured.

### DTOs
- All DTO properties that are populated by `ValidationPipe` (not a constructor) must use the definite assignment assertion: `email!: string`.
- Optional fields use `@IsOptional()` + `?` suffix: `name?: string`.
- Always set `@MaxLength()` on string fields.

### Services
- Services own all database access via `PrismaService`.
- Wrap Prisma operations in try/catch. Map `PrismaClientKnownRequestError` to NestJS HTTP exceptions:
  - `P2002` (unique constraint) → `ConflictException`
  - `P2025` (not found) → `NotFoundException`
- Import `PrismaClientKnownRequestError` from `@prisma/client/runtime/library` (not `Prisma` namespace — removed in Prisma v5).
- Never expose raw Prisma errors to the client.

### Prisma / Database
- All schema changes go through migrations: `npx prisma migrate dev --name <description>`.
- Never edit migration files after they are committed.
- All tables must have `tenant_id` for multi-tenant isolation (per the architecture document).
- Append-only tables (ledgers, audit logs) must have `INSERT`-only grants at the DB role level — never `UPDATE` or `DELETE`.

---

## Security Rules

These are non-negotiable. A PR that violates any of these will be rejected.

- **No secrets in code.** API keys, tokens, passwords, and connection strings go in environment variables only. Never commit a `.env` file.
- **No raw SQL string concatenation.** Always use Prisma's parameterised queries.
- **Validate all input at the boundary.** Every API endpoint must have a DTO with `class-validator` decorators. The `ValidationPipe` is global but DTOs must still be explicit.
- **No `any` type on request/response objects.** Type every incoming request body and every outgoing response.
- **Authentication before data.** Every authenticated route must verify the JWT before touching the database. Never trust client-supplied `userId` or `tenantId` — read them from the verified JWT.
- **CORS is configured in the NestJS bootstrap.** Do not loosen it without a documented reason.
- **Sensitive fields (bank details, tax IDs, cost prices) must be gated** behind explicit permission checks — never returned by default in list endpoints.
- **No `console.log` of request bodies or user data** — this leaks PII into logs.

---

## Architecture Decisions (do not reverse without discussion)

- **Append-only ledgers**: `inventory_ledger`, `gl_journal_*`, `audit_logs`, `tax_transactions` are immutable. Balances are derived, never mutated. See `docs/Enterprise_SCM_Architecture_Design_Document.md §7`.
- **Multi-tenant isolation**: Every query must be scoped by `tenant_id`. PostgreSQL RLS enforces this at the DB layer. See §13.
- **RBAC model**: Hybrid RBAC + ABAC + SoD. Do not bypass permission checks even for internal endpoints. See §12.
- **Double-entry accounting**: Every financial transaction produces balanced GL entries. Net GL must always be zero. See §8.
