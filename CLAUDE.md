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
│   └── web/      # Next.js 15 (App Router) frontend — port 3000
└── packages/
    └── shared/   # Shared TypeScript types (no runtime deps)
```

Tech stack: Next.js 15 App Router · React 19 · Astryx (Meta's design system) · StyleX · Tailwind CSS v4 (layout only) · NestJS 10 · Prisma 5 · PostgreSQL · TypeScript strict · npm workspaces monorepo.

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

Aivora's UI is built on **Astryx** (`@astryxdesign/core`), Meta's open-source React design
system (`astryx.atmeta.com`, `github.com/facebook/astryx`), themed to an **Apple-inspired
design language**: clean, minimal, generous whitespace, crisp typography. Migrated from a
hand-rolled Tailwind + Radix UI component set across a series of PRs (bookmarks
`chore/upgrade-nextjs-15-react-19` through `chore/astryx-cleanup-and-docs` in the commit
history) — check those commit messages for the "why" behind a given choice below, not just
the "what".

**Component-first, not class-first.** Reach for an Astryx component (`Button`, `TextInput`,
`Dialog`, `Table`, `Badge`, …) before writing markup + Tailwind utility classes by hand. Check
`apps/web/node_modules/@astryxdesign/core/dist/*/index.d.ts` (or astryx.atmeta.com/components)
for what exists before assuming you need to hand-roll it — the catalog is large (150+
components across actions, forms, data display, navigation, overlays, chat, and more).

**Version is pinned exactly** (`"@astryxdesign/core": "0.1.4"`, no `^`/`~`) — Astryx is pre-1.0
with active breaking changes even within the 0.x line. Bump deliberately, in its own PR, via
`npx astryx upgrade --apply`; don't let it drift in via a routine `npm install`.

### Theme (`apps/web/theme/apple.theme.ts`)

The Apple palette is a custom Astryx theme built with `defineTheme()`, not a preset —
`@astryxdesign/theme-neutral` was installed during the migration's foundation work but is
**not actually used** and shouldn't be reintroduced without removing this custom theme first.

| Astryx token | Value | Usage |
|---|---|---|
| `--color-text-primary` | `#1d1d1f` (ink) | Primary text |
| `--color-text-secondary` | `#86868b` (muted) | Secondary text, placeholders |
| `--color-background-body` | `#fbfbfd` (canvas) | Page background |
| `--color-accent` / `--color-text-accent` | `#0071e3` | Links, accent buttons, focus rings |
| `--color-error` | `#ff3b30` (danger) | Error states, destructive actions |
| `--color-background-inverted` | `#1d1d1f` (ink) | Primary/CTA buttons (see Buttons below) |
| `--color-border` / `--color-border-emphasized` | `rgba(0,0,0,.05)` / `.1` | Hairline borders / input borders |
| `--radius-container` | `16px` | Cards/panels (`rounded-2xl` equivalent) |
| `--radius-element` | `12px` | Inputs, non-pill buttons (`rounded-xl` equivalent) |
| `--radius-page` / `--radius-full` | `28px` / `9999px` | Hero elements / pill buttons (Astryx defaults, unchanged) |
| `--text-display-1-size` | `clamp(3rem, 2rem + 4vw, 4.5rem)` | Marketing hero headlines only — overridden from the app-UI type scale, see the comment in `apple.theme.ts` |

To change a color/radius/spacing value app-wide, edit `theme/apple.theme.ts` and run `npm run
theme:build` (also runs automatically via `predev`/`prebuild`) — never hand-edit `theme/apple.css`
or `apple.js`, they're generated and gitignored.

### Typography
- Font: **Inter** (loaded via `next/font/google`), wired into the theme as
  `var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Use `Heading`/`Text` components with their `type`/`justify`/`color`/`weight` props, not raw
  `<h1>`/`<p>` + Tailwind text classes. `<Heading level={1} type="display-1">` is the correct
  way to get a hero-scale headline — see the theme table above for why it isn't tiny.
- Body text: Astryx's `body` type scale token (~15px base). Headings: `font-semibold` (never
  bold — set via `typography.heading.weight` in the theme, not per-instance).

### Buttons — variant name mapping

Astryx's own `primary` variant is **accent-colored**, which doesn't match this app's actual
primary CTA style (`bg-ink text-white`). `apps/web/components/ui/Button.tsx` wraps
`@astryxdesign/core`'s `Button` and remaps variant names — **use this wrapper's names, not
Astryx's**, everywhere except when you have a specific reason to reach for the raw component:

| This app's `variant` prop | Astryx's real variant | Renders as |
|---|---|---|
| `primary` (default) | `secondary` | ink background, white text — the main CTA style |
| `accent` | `primary` | accent-blue background, white text |
| `ghost` | `ghost` | transparent, ink text |

This remap lives in the theme's `components.button['variant:secondary']` override (see
`apple.theme.ts`) plus the wrapper's `variantMap` — don't try to add a new Astryx variant name
instead of reusing this pattern. `astryx theme build` (0.1.4) generates variant-type
augmentations against a stale interface name (`XDSButtonVariantMap` instead of the real
`ButtonVariantMap`), so a new variant's types silently don't merge — see the comment in
`apple.theme.ts` for the full story if you hit this.

### Spacing & layout
- Max content width: `max-w-6xl mx-auto px-6` — a Tailwind convention, kept deliberately since
  Astryx has no opinion on a specific max-width value.
- Prefer Astryx's layout primitives (`Section`, `Grid`, `Stack`/`HStack`/`VStack`, `Center`,
  `Layout`) over hand-rolled `flex`/`grid` Tailwind wrappers for anything beyond simple
  one-off spacing. Tailwind utility classes are still fine for layout — spacing, positioning,
  the content-width wrapper above — just not as the default for new component-level UI.
- Shadows/elevation: Astryx's `--shadow-low/med/high` tokens (used automatically by components
  like `Card`, `ChatComposer`). Bespoke decorative elements (e.g. the landing page hero's
  gradient mockup panel) may still use inline `boxShadow` — that's fine for genuinely one-off
  visual treatments Astryx has no primitive for.

### Known Astryx 0.1.4 gaps (don't rediscover these)
- **`TextInput` has no typed `autoComplete` prop** (input-specific HTML attributes aren't on
  its base props type, though the component does forward them to the real `<input>` at
  runtime). Use `apps/web/lib/astryxCompat.ts`'s `TextInput` re-export, not the raw
  `@astryxdesign/core/TextInput` import, on any field where autofill matters.
- **`TextInput` has no `maxLength`/`minLength`** at all. Client-side length hints are gone;
  rely on the API's DTO `@MaxLength()` validation as the real source of truth.
- Astryx's `Dialog`, `DropdownMenu`, `Avatar`, and form inputs are **fully controlled,
  data-driven single components** (`isOpen`/`onOpenChange`, `items` arrays, `value`/`onChange`)
  — not Radix-style uncontrolled compound components. Don't design new code assuming
  Trigger/Content/Portal-style composition; check the component's actual prop shape first.

### Do not
- Do not introduce new color values outside the theme tokens without updating
  `theme/apple.theme.ts` (and this file if the change is significant).
- Do not use Tailwind's default colors (`blue-500`, `gray-300`, etc.) — always use theme
  tokens, either via an Astryx component or the `ink`/`muted`/`canvas`/`accent`/`danger`
  Tailwind classes still defined in `globals.css`'s `@theme` block.
- Do not hand-roll a component (button, input, dialog, table, badge, avatar, dropdown, …) with
  raw HTML + Tailwind when an Astryx component covers the case.
- Do not run `npx astryx init` against this repo — it auto-writes AI-agent doc files matching
  whatever tool it detects, which for Claude means overwriting this file.

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
