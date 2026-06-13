# Responsive Standards

These rules apply to every frontend file in the Aivora web app. Target: a layout that is fully functional and visually correct from 375px (small phone) through 1440px+ (wide desktop) without any horizontal scroll on content.

---

## 1. Mobile-first philosophy

Write styles for the smallest screen first, then progressively enhance for larger screens using Tailwind's breakpoint prefixes. Never write desktop-first styles and try to undo them.

```tsx
// ✅ Mobile-first: stack on mobile, side-by-side at md
className="flex flex-col md:flex-row gap-4 md:gap-8"

// ❌ Desktop-first: has to fight itself on mobile
className="flex flex-row gap-8 max-md:flex-col"
```

---

## 2. Breakpoints

| Prefix | Min-width | Primary target |
|---|---|---|
| (none) | 0px | Mobile phones (375px–639px) |
| `sm:` | 640px | Large phones, small tablets |
| `md:` | 768px | Tablets, small laptops |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Wide monitors (rarely needed) |

**Decision guide:**
- Layout changes (columns, stacking) → `md:` is usually the right breakpoint
- Navigation changes (hamburger → horizontal) → `md:` or `lg:`
- Fine-tuning spacing or type size → `sm:` is fine
- Do not invent breakpoints with arbitrary values (`min-[900px]:`) unless absolutely forced by content

---

## 3. Page containers and gutters

Every page and section must have horizontal padding so content never touches the screen edge on mobile. Missing `px-6` is a layout bug.

```tsx
// Standard page container — use this everywhere
<div className="mx-auto max-w-6xl px-6">…</div>

// Full-bleed section (image or colour band) that contains a centred inner container
<section className="bg-canvas">
  <div className="mx-auto max-w-6xl px-6 py-16">…</div>
</section>
```

Vertical rhythm:
- Section padding: `py-12 md:py-20 lg:py-28`
- Between siblings in a stack: `space-y-6` or `gap-6`, scaling to `gap-8` at `md:`

---

## 4. Layout patterns

### Stacking → columns

```tsx
// Two columns
<div className="flex flex-col gap-6 md:flex-row md:gap-10">
  <aside className="md:w-64 shrink-0">…</aside>
  <main className="flex-1 min-w-0">…</main>  // min-w-0 prevents flex overflow
</div>

// Card grid: 1 col → 2 → 3
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {cards.map(…)}
</div>

// Stat row: 1 col → 2 → 4
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
  {stats.map(…)}
</div>
```

### Sidebar layout

```tsx
<div className="flex min-h-screen flex-col lg:flex-row">
  <nav className="w-full lg:w-60 lg:shrink-0">…</nav>
  <main className="flex-1 min-w-0 px-6 py-8">…</main>
</div>
```

### Always use `min-w-0` on flex children that contain text

Without `min-w-0`, a flex child with long text or a table will overflow its parent:

```tsx
<div className="flex gap-4">
  <Avatar />
  <div className="min-w-0 flex-1">           {/* ← prevents overflow */}
    <p className="truncate">Long name here</p>
  </div>
</div>
```

---

## 5. Typography scaling

Page-level headings and hero text scale down on mobile so they don't overflow or dominate the screen.

| Use | Mobile | Desktop |
|---|---|---|
| Hero / marketing H1 | `text-[36px]` | `text-[64px] lg:text-[80px]` |
| Page title H1 | `text-[22px]` | `text-[28px] md:text-[28px]` |
| Section heading H2 | `text-[19px]` | `text-[22px] md:text-[28px]` |
| Card / widget title | `text-[17px]` | `text-[19px]` |
| Body copy | `text-[15px]` | `text-[15px]` (does not scale) |
| Labels / captions | `text-[13px]` | `text-[13px]` (does not scale) |

```tsx
// page title
<h1 className="text-[22px] font-semibold tracking-tight text-ink md:text-[28px]">
  Inventory
</h1>
```

Line lengths (readability): keep prose columns between 60–80 characters. Use `max-w-prose` or `max-w-2xl` on text-heavy sections.

---

## 6. Touch targets

**Minimum size: 44×44px on mobile.** This is Apple's Human Interface Guideline and WCAG 2.5.5 (AAA). Finger taps are imprecise — small targets cause mis-taps.

```tsx
// Button with visible label — padding achieves the minimum
<button className="min-h-[44px] rounded-full px-4 text-[15px]">Save</button>

// Icon-only button — must pad out to 44px
<button className="flex size-11 items-center justify-center rounded-full" aria-label="Delete">
  <TrashIcon className="size-5" aria-hidden="true" />
</button>

// Link in a nav — use block display with padding, not just text size
<a href="…" className="flex min-h-[44px] items-center px-3 text-[13px]">Dashboard</a>
```

Do not rely on font size alone to meet touch-target minimums — the clickable area is what matters.

---

## 7. Navigation on mobile

### Hamburger menu pattern

The top nav collapses on mobile. Use a Radix `Dialog` or a controlled state + transition for the mobile drawer:

```tsx
// Mobile nav trigger — visible only below md
<button className="flex size-11 items-center justify-center md:hidden" aria-label="Open menu">
  <MenuIcon aria-hidden="true" />
</button>

// Desktop nav — hidden on mobile
<nav className="hidden items-center gap-8 md:flex">…</nav>
```

### Authenticated sidebar

On mobile, the sidebar is either:
- Collapsed to a bottom tab bar (preferred for 4 items or fewer)
- A slide-in drawer triggered by a hamburger icon

Never render a full sidebar on mobile and rely on `overflow: hidden` to hide it — it wastes layout space and breaks keyboard nav.

---

## 8. Images

Always use Next.js `<Image>` — never a bare `<img>` tag. `<Image>` handles lazy loading, format selection (WebP/AVIF), and prevents layout shift.

```tsx
import Image from 'next/image';

// Fixed dimensions (avatar, logo)
<Image src={src} alt={alt} width={36} height={36} className="rounded-full" />

// Responsive image that fills its container
<div className="relative aspect-video w-full">
  <Image src={src} alt={alt} fill className="rounded-2xl object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
</div>
```

`sizes` prop is required on `fill` images — it tells the browser which source to download at each breakpoint, preventing a 2000px image loading on a 375px phone.

---

## 9. Tables and data grids

A full data table cannot fit on a 375px screen. Use one of these strategies:

### Strategy A — Column hiding (preferred for dense tables)

Hide low-priority columns on mobile; show progressively:

```tsx
<table>
  <thead>
    <tr>
      <th>Name</th>                                          {/* always visible */}
      <th className="hidden sm:table-cell">SKU</th>          {/* 640px+ */}
      <th className="hidden md:table-cell">Category</th>     {/* 768px+ */}
      <th>Stock</th>                                          {/* always visible */}
      <th className="hidden lg:table-cell">Last updated</th> {/* 1024px+ */}
    </tr>
  </thead>
</table>
```

### Strategy B — Horizontal scroll wrapper (fallback for must-see-all-columns tables)

```tsx
<div className="overflow-x-auto rounded-2xl border border-black/5">
  <table className="min-w-[640px] w-full">…</table>
</div>
```

### Strategy C — Card list on mobile (best UX for short lists)

```tsx
{/* Table on desktop, card stack on mobile */}
<div className="hidden md:block">
  <table>…</table>
</div>
<ul className="space-y-3 md:hidden">
  {rows.map(row => (
    <li key={row.id} className="rounded-2xl border border-black/5 bg-white p-4">
      <p className="font-medium text-ink">{row.name}</p>
      <p className="text-[13px] text-muted">{row.sku}</p>
    </li>
  ))}
</ul>
```

---

## 10. Spacing scale

Use Tailwind's default spacing scale consistently. Do not use arbitrary values (`p-[13px]`) unless matching a pixel-perfect design spec.

| Purpose | Value |
|---|---|
| Tight (icon gap, chip padding) | `gap-2` / `px-2 py-1` |
| Standard (card internal) | `p-4` or `px-6 py-4` |
| Comfortable (form fields) | `space-y-4` |
| Section internal | `p-6` or `p-8` |
| Between page sections | `py-12 md:py-20` |
| Page-level padding | `py-10` |

---

## 11. Forms on mobile

- `font-size` on inputs must be ≥ 16px (`text-[16px]` or `text-[15px]`) — browsers zoom in on inputs smaller than 16px on iOS, which breaks the layout. Our standard `text-[15px]` is acceptable; do not go smaller.
- Stack form fields vertically by default — side-by-side only at `md:` and only for short fields (first name / last name, city / postcode).
- Submit buttons should be `w-full` on mobile, `w-auto` or `w-full` on desktop depending on context.

```tsx
// Responsive two-column form row
<div className="flex flex-col gap-4 sm:flex-row">
  <div className="flex-1">
    <Label htmlFor="first">First name</Label>
    <Input id="first" name="first" autoComplete="given-name" />
  </div>
  <div className="flex-1">
    <Label htmlFor="last">Last name</Label>
    <Input id="last" name="last" autoComplete="family-name" />
  </div>
</div>
```

---

## 12. Testing responsiveness

Check all of the following before marking any UI task done:

1. **375px** (iPhone SE) — content fits, no horizontal scroll, touch targets are large enough, text is readable
2. **768px** (iPad) — layout transitions work (columns appear, nav switches)
3. **1280px** (standard desktop) — max-width container is centred with breathing room
4. **DevTools device toolbar** — toggle between sizes using the responsive slider to catch mid-range breakage
5. **Real device** — test on a physical phone at least once per major layout change; DevTools emulation misses some iOS behaviour (input zoom, safe area insets)
6. **Landscape phone** (667px wide) — often missed; ensure nav and forms don't break
