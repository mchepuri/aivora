# New React Component

Create a new React component for the Aivora web app following the project's design system and conventions.

## Instructions

Ask the user for:
1. **Component name** (PascalCase) — e.g. `ProductCard`
2. **Type** — Server Component (default) or Client Component (needs browser APIs / event handlers / hooks)
3. **Location** — `apps/web/components/` (shared) or inside a specific route folder
4. **Props** — what data/callbacks the component accepts

Then generate the component file following ALL of these rules:

### File structure
- One component per file, named `ComponentName.tsx`
- Named export (not default) for all non-page components
- Place in `apps/web/components/` unless it is tightly coupled to a single route

### Server vs Client
- **Server Component** (no directive) — use when the component only renders markup, fetches data, or has no interactivity
- **Client Component** (`'use client'` at top) — only when using: `useState`, `useEffect`, `useRef`, event handlers (`onClick`, `onChange`), or browser-only APIs
- Never add `'use client'` "just in case" — default to Server

### Styling rules (Tailwind v4 — Apple design system)
Use ONLY these theme tokens — never raw Tailwind colours like `blue-500`:

| Token | Usage |
|---|---|
| `text-ink` / `bg-ink` (`#1d1d1f`) | Primary text, dark buttons |
| `text-muted` (`#86868b`) | Secondary text, labels, placeholders |
| `bg-canvas` (`#fbfbfd`) | Page / card backgrounds |
| `text-accent` / `bg-accent` (`#0071e3`) | Links, primary CTA, focus rings |

Layout conventions:
- Max width: `max-w-6xl mx-auto px-6`
- Cards: `rounded-2xl border border-black/5`
- Buttons: `rounded-full` pill shape, always include `transition`
- Inputs: `rounded-xl border border-black/10 focus:border-accent focus:ring-1 focus:ring-accent`
- Always style `focus:` states — never rely on browser defaults

### TypeScript
- Define a `Props` interface above the component, never inline
- No `any` — type every prop explicitly
- Use `React.ReactNode` for children props

### Template (Server Component)
```tsx
interface Props {
  // define props here
}

export function ComponentName({ }: Props) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6">
      {/* content */}
    </div>
  );
}
```

### Template (Client Component)
```tsx
'use client';

import { useState } from 'react';

interface Props {
  // define props here
}

export function ComponentName({ }: Props) {
  const [state, setState] = useState();

  return (
    <div>
      {/* content */}
    </div>
  );
}
```

After creating the component, confirm:
- [ ] No raw colour values (only theme tokens)
- [ ] Props interface is typed — no `any`
- [ ] `'use client'` is only present if genuinely needed
- [ ] Focus states are styled
- [ ] File is in the correct location
