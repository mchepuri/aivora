# Frontend Standards

These rules apply to **every frontend file** in the Aivora web app — components, pages, layouts, hooks, and utilities — regardless of which skill triggered the work.

Accessibility and responsiveness rules live in their own dedicated files. Read those too whenever touching any UI:
- **Accessibility** → `.claude/commands/accessibility-standards.md`
- **Responsiveness** → `.claude/commands/responsive-standards.md`

---

## File & folder conventions

```
apps/web/
  app/
    (public)/         ← unauthenticated pages — shares Header + Footer layout
    (authenticated)/  ← authenticated pages — always force-dynamic
  components/
    ui/               ← Radix-based primitives only (Label, Button, Dialog, …)
    <module>/         ← module-scoped feature components
  hooks/
    <module>/         ← module-scoped hooks (useInventory, useOrderFilters, …)
  utils/
    <module>/         ← module-scoped pure utility functions
```

App-level shared code (generic hooks, shared utilities) lives directly in `hooks/` or `utils/` without a module subfolder.

**One named export per file.** No barrel `index.ts` files — they defeat tree-shaking. Importing one item must never pull in unrelated code.

Files must stay under **150 lines**. Extract to a new file when approaching the limit.

---

## Design system — Tailwind v4, Apple style

Use **only** these four tokens. Never use raw Tailwind colours (`blue-500`, `gray-300`, etc.) or hardcoded hex values.

| Token | Value | When to use |
|---|---|---|
| `text-ink` / `bg-ink` | `#1d1d1f` | Body text, dark buttons, strong contrast |
| `text-muted` | `#86868b` | Secondary text, labels, captions, placeholders |
| `bg-canvas` | `#fbfbfd` | Page and card backgrounds |
| `text-accent` / `bg-accent` | `#0071e3` | Links, primary CTA buttons, focus rings |

**Layout**
- Page containers: `max-w-6xl mx-auto px-6` — always include `px-6` so content never touches screen edges
- Cards / panels: `rounded-2xl border border-black/5 bg-white shadow-sm`
- Large hero / modal: `rounded-[28px] shadow-2xl`
- Subtle borders: `border-black/5`

**Typography**
- Headings: `font-semibold tracking-tight` — never `font-bold`
- Scale: `text-[12px]` captions · `text-[13px]` labels · `text-[15px]` body · `text-[17px]` subheadings · `text-[19px]` section heads · `text-[28px]` page titles
- Page headings scale on mobile: `text-[22px] md:text-[28px]`

**Interactive elements**
- Buttons: `rounded-full` pill shape, always include `transition`
- Inputs: `rounded-xl border border-black/10 focus:border-accent focus:ring-1 focus:ring-accent`
- Focus rings: `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2` — always use `focus-visible`, not plain `focus`
- Never use `outline-none` without replacing the focus indicator

All styling is passed via `className` props — no hardcoded values inside component logic.

---

## Radix UI

Radix provides accessible, unstyled primitives. **Always prefer a Radix primitive over building interactive behaviour from scratch.**

| Need | Radix package |
|---|---|
| Modal / confirmation | `@radix-ui/react-dialog` |
| Dropdown / user menu | `@radix-ui/react-dropdown-menu` |
| Tooltip | `@radix-ui/react-tooltip` |
| Form labels | `@radix-ui/react-label` |
| Tabs | `@radix-ui/react-tabs` |
| Accordion | `@radix-ui/react-accordion` |
| Select / combobox | `@radix-ui/react-select` |
| Checkbox | `@radix-ui/react-checkbox` |
| Switch / toggle | `@radix-ui/react-switch` |
| Slider | `@radix-ui/react-slider` |
| Divider | `@radix-ui/react-separator` |
| User avatar | `@radix-ui/react-avatar` |
| Notification | `@radix-ui/react-toast` |

**Wrapping rule**: Feature components never import from `@radix-ui/*` directly. Every Radix primitive is wrapped once in a themed component under `components/ui/`. The wrapper owns the Apple-style classes; feature code imports from `@/components/ui/` only.

Radix wrappers always have `'use client'` at the top. Feature components inherit their own client/server status independently.

---

## Server vs Client components

- **Default to Server Components** — no directive needed; fetch data with `async/await`.
- Add `'use client'` only when genuinely needed: `useState`, `useEffect`, `useRef`, event handlers, browser APIs, or Radix primitives.
- Never add `'use client'` as a precaution.
- Authenticated layouts must keep `export const dynamic = 'force-dynamic'` — never remove it.

---

## Hooks architecture

**App-level hooks** (`hooks/`) — generic, reusable across the whole app:
- `useDebounce.ts`, `useMediaQuery.ts`, `useOnClickOutside.ts`, `useLocalStorage.ts`

**Module-level hooks** (`hooks/<module>/`) — own all data-fetching and local state for a feature:
- One hook per resource or concern: `useUsers.ts`, `useInventoryFilters.ts`
- Always return `{ data, isLoading, error, refetch }` — consistent shape across all hooks
- Never fetch data inside a component body — delegate to a hook or Server Component
- Stabilise references with `useCallback` / `useMemo` only when a recreated reference would cause a downstream re-render

```ts
// hooks/<module>/useResource.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import type { ResourceType } from '@aivora/shared';

interface UseResourceResult {
  data: ResourceType[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useResource(): UseResourceResult {
  const [data, setData] = useState<ResourceType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await apiClient.get<ResourceType[]>('/resource'));
    } catch {
      setError('Failed to load. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { data, isLoading, error, refetch: load };
}
```

---

## Dynamic imports & lazy loading

Any component that is data-heavy (long list, table, chart, map, rich editor) must be lazy-loaded. Use Next.js `dynamic()` — not React `lazy()`.

```tsx
import dynamic from 'next/dynamic';
import { ResourceListSkeleton } from '@/components/<module>/ResourceListSkeleton';

const HeavyComponent = dynamic(
  () => import('@/components/<module>/HeavyComponent').then(m => ({ default: m.HeavyComponent })),
  { loading: () => <ResourceListSkeleton />, ssr: false }
);
```

- Always provide a `loading` fallback — never leave the slot blank.
- `ssr: false` for components using browser-only APIs or large client-only libraries.

---

## Loading states

### Skeleton — for content that has shape

Mirror the real component's layout as closely as possible to prevent layout shift when data arrives.

```tsx
// components/ui/Skeleton.tsx
interface Props { className?: string; }

export function Skeleton({ className = '' }: Props) {
  return <div className={`animate-pulse rounded-xl bg-black/5 ${className}`} aria-hidden="true" />;
}
```

Build a named skeleton next to the component it mirrors:

```tsx
// components/<module>/ResourceListSkeleton.tsx
import { Skeleton } from '@/components/ui/Skeleton';

export function ResourceListSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm" aria-label="Loading">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Spinner — for in-flight actions

```tsx
// components/ui/Spinner.tsx
interface Props { size?: 'sm' | 'md'; className?: string; }

export function Spinner({ size = 'md', className = '' }: Props) {
  const dim = size === 'sm' ? 'size-4' : 'size-5';
  return (
    <svg className={`animate-spin text-current ${dim} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
```

Button loading pattern:

```tsx
<button disabled={isPending} aria-disabled={isPending}>
  {isPending
    ? <><Spinner size="sm" /><span className="ml-2">Saving…</span></>
    : 'Save'}
</button>
```

---

## TypeScript

- `Props` interface defined above every component — never inline.
- No `any`. Use `unknown` + type narrowing, or explicit types.
- `React.ReactNode` for `children`.
- All event handlers explicitly typed: `(e: React.ChangeEvent<HTMLInputElement>) => void`.
- Every component accepts `className?: string` with a default of `''` for composability.

---

## Bundle size

- One named export per file — no barrels, no re-export files.
- Keep files under 150 lines — split when approaching the limit.
- Prefer a small utility function over adding a library for a single operation.
- Named imports only — never `import _ from 'lodash'`.
