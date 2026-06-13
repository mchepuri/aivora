# New React Component

Scaffold a new component, hook, or utility for the Aivora web app.

**Before writing any code, read and apply every rule in `.claude/commands/frontend-standards.md`.** That file is the source of truth for styling, accessibility, responsiveness, Radix UI, hooks, loading states, and bundle size. Do not duplicate those rules here — just follow them.

---

## Step 1 — Ask the user for

1. **What to build** — component, hook, or utility function?
2. **Name** — PascalCase for components, `useCamelCase` for hooks, `camelCase` for utils
3. **Module or app-level?** — determines the folder (see folder map in `frontend-standards.md`)
4. **Data-heavy?** — fetches a list, renders a large table, shows a chart → lazy-load + skeleton required
5. **Props / inputs** — what data or callbacks does it accept?
6. **Server or Client Component?** — default is Server; only Client if it needs state, effects, handlers, or Radix

---

## Step 2 — Pick the right template and generate

### Server Component (default)

```tsx
// apps/web/components/<module>/ComponentName.tsx

interface Props {
  // define props
  className?: string;
}

export function ComponentName({ className = '' }: Props) {
  return (
    <div className={`rounded-2xl border border-black/5 bg-white shadow-sm ${className}`}>
      {/* content */}
    </div>
  );
}
```

### Client Component (only when state / effects / handlers are needed)

```tsx
// apps/web/components/<module>/ComponentName.tsx
'use client';

import { useResourceName } from '@/hooks/<module>/useResourceName';
import { ComponentNameSkeleton } from '@/components/<module>/ComponentNameSkeleton';

interface Props {
  className?: string;
}

export function ComponentName({ className = '' }: Props) {
  const { data, isLoading, error } = useResourceName();

  if (isLoading) return <ComponentNameSkeleton />;

  if (error) {
    return (
      <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[14px] text-red-600">
        {error}
      </p>
    );
  }

  return (
    <section aria-label="…" className={`rounded-2xl border border-black/5 bg-white shadow-sm ${className}`}>
      {/* render data */}
    </section>
  );
}
```

### Lazy-loaded data-heavy component (in the parent or page)

```tsx
import dynamic from 'next/dynamic';
import { ComponentNameSkeleton } from '@/components/<module>/ComponentNameSkeleton';

const ComponentName = dynamic(
  () => import('@/components/<module>/ComponentName').then(m => ({ default: m.ComponentName })),
  { loading: () => <ComponentNameSkeleton />, ssr: false }
);
```

### Radix UI wrapper (goes in components/ui/ only)

```tsx
// apps/web/components/ui/PrimitiveName.tsx
'use client';

import * as Primitive from '@radix-ui/react-<name>';
import { type ComponentPropsWithoutRef } from 'react';

type RootProps = ComponentPropsWithoutRef<typeof Primitive.Root>;

export function PrimitiveName({ className = '', ...props }: RootProps) {
  return (
    <Primitive.Root
      className={`/* apple-style classes */ ${className}`}
      {...props}
    />
  );
}
```

### Hook

```ts
// apps/web/hooks/<module>/useResourceName.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import type { ResourceType } from '@aivora/shared';

interface UseResourceNameResult {
  data: ResourceType[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useResourceName(): UseResourceNameResult {
  const [data, setData] = useState<ResourceType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await apiClient.get<ResourceType[]>('/endpoint'));
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

### Utility function

```ts
// apps/web/utils/<module>/functionName.ts

export function functionName(input: InputType): OutputType {
  // pure — no side effects
}
```

---

## Step 3 — Final checklist

**Structure**
- [ ] One named export per file
- [ ] Correct folder (app-level vs. module-level)
- [ ] File under 150 lines

**Radix & components/ui/**
- [ ] Interactive behaviour uses a Radix primitive
- [ ] Radix wrapper lives in `components/ui/` — no direct `@radix-ui/*` imports in feature code
- [ ] `'use client'` only on the `components/ui/` wrapper, not the feature component (unless the feature itself needs it)

**Styling**
- [ ] Only theme tokens (`ink`, `muted`, `canvas`, `accent`) — no raw Tailwind colours
- [ ] `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2` on every interactive element
- [ ] `transition` on all hover targets
- [ ] `className?: string` with default `''`

**Data & loading**
- [ ] Data-fetching is in a hook or Server Component — not in a component body
- [ ] Data-heavy component uses `dynamic()` with a skeleton `loading` fallback
- [ ] Skeleton mirrors the real component's layout

**Accessibility** (full rules in `frontend-standards.md`)
- [ ] Semantic HTML — no `<div onClick>`
- [ ] All inputs linked to a `<Label>`
- [ ] Icon-only elements have `aria-hidden` + `sr-only` sibling text
- [ ] Loading regions have `aria-label` or `aria-live`
- [ ] Error messages linked via `aria-describedby`

**Responsiveness** (full rules in `frontend-standards.md`)
- [ ] Mobile-first — default styles for mobile, `md:` / `lg:` scale up
- [ ] Touch targets ≥ 44×44px
- [ ] `px-6` on all containers

**TypeScript**
- [ ] `Props` interface above the component, no `any`
- [ ] Event handlers explicitly typed
