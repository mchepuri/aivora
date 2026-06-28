# Accessibility Standards

These rules apply to every frontend file in the Aivora web app. Target compliance: **WCAG 2.1 Level AA** as the floor; aim for AAA where it costs nothing extra.

---

## 1. Semantic HTML — use the right element every time

The single highest-impact accessibility rule. Correct elements give screen readers, search engines, and keyboard users meaning for free.

| Need | Correct element | Never use |
|---|---|---|
| Clickable action (submit, open modal, toggle) | `<button type="button">` or `<button type="submit">` | `<div onClick>`, `<span onClick>` |
| Navigate to a URL | `<a href="…">` | `<button>` wired to `router.push` |
| Page-level title | `<h1>` — one per page | `<p>`, `<div>` with large font |
| Section headings | `<h2>` → `<h3>` → `<h4>` in document order, never skip levels | Visual-only styling |
| Top navigation | `<nav aria-label="Main">` | `<div className="nav">` |
| Page landmark | `<main>` — one per page | `<div id="main">` |
| Page header / footer | `<header>`, `<footer>` | `<div>` |
| Grouped content with a heading | `<section aria-labelledby="…">` | `<div>` |
| Self-contained content (blog post, card) | `<article>` | `<div>` |
| Data table | `<table>` with `<thead>`, `<tbody>`, `<th scope="col|row">` | CSS grid styled to look like a table |
| Ordered list | `<ol>` | `<div>` with numbered `<span>` |
| Unordered list | `<ul>` | `<div>` with `•` characters |
| Form field group (radios, checkboxes) | `<fieldset>` + `<legend>` | `<div>` with a `<p>` label |

---

## 2. ARIA — when and how

ARIA supplements HTML when native semantics are insufficient. **First rule of ARIA: don't use ARIA if a native HTML element can do the job.**

### Labelling

Every interactive element must have an accessible name — the text announced by a screen reader.

```tsx
// ✅ visible label (best)
<button>Save changes</button>

// ✅ aria-label when no visible text (icon buttons)
<button aria-label="Close dialog">
  <XIcon aria-hidden="true" />
</button>

// ✅ aria-labelledby when an existing element IS the label
<section aria-labelledby="section-heading">
  <h2 id="section-heading">Inventory</h2>
</section>

// ✅ aria-describedby for supplemental description (e.g. error message)
<input aria-describedby="email-error" id="email" />
<p id="email-error" role="alert">Please enter a valid email address.</p>
```

### Roles

Only add `role` when HTML semantics are insufficient:

```tsx
// status messages that update without user action
<div role="status" aria-live="polite">3 items updated</div>

// error messages
<p role="alert">Something went wrong. Please try again.</p>

// progress indicators
<div role="progressbar" aria-valuenow={40} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress" />
```

### Live regions

Use for content that updates asynchronously without a page navigation:

```tsx
// polite — announces after the user finishes their current action
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// assertive — interrupts immediately (use sparingly, only for errors)
<div aria-live="assertive" role="alert">
  {errorMessage}
</div>
```

### State

```tsx
// expanded / collapsed (accordion, dropdown)
<button aria-expanded={isOpen} aria-controls="panel-id">Toggle</button>

// selected (tabs, list options)
<button role="tab" aria-selected={isActive}>Overview</button>

// pressed (toggle buttons)
<button aria-pressed={isActive}>Bold</button>

// disabled (custom controls — also set native disabled)
<button disabled aria-disabled="true">Submit</button>

// required fields
<input required aria-required="true" />

// invalid fields
<input aria-invalid={hasError} aria-describedby="field-error" />
```

### Hidden content

```tsx
// decorative icons — hide from AT, they add no meaning
<svg aria-hidden="true" focusable="false">…</svg>

// purely decorative images
<img src="…" alt="" />

// skeleton / shimmer placeholders — hide from AT while loading
<div aria-hidden="true" className="animate-pulse …" />
```

---

## 3. Forms

Forms are the most accessibility-sensitive part of any app. Follow all of these:

### Every field needs a label

```tsx
// ✅ Always link label to input
<Label htmlFor="email">Work email</Label>
<Input id="email" name="email" type="email" />

// ❌ Never rely on placeholder as the only label
<input placeholder="Email" />  // disappears on focus, low contrast
```

### Error messages

```tsx
// Error message must be:
// 1. Programmatically linked via aria-describedby
// 2. Role="alert" so it is announced immediately on appearance
// 3. Specific — say what is wrong and how to fix it
<div>
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    aria-invalid={!!emailError}
    aria-describedby={emailError ? 'email-error' : undefined}
  />
  {emailError && (
    <p id="email-error" role="alert" className="mt-1 text-[13px] text-red-600">
      {emailError}
    </p>
  )}
</div>
```

### Required fields

```tsx
<Label htmlFor="name">
  Full name <span aria-hidden="true" className="text-red-500">*</span>
</Label>
<Input id="name" required aria-required="true" />
// Note: the * is aria-hidden; the required/aria-required conveys this to AT
```

### autoComplete attributes

Set `autoComplete` on every credential and personal-data field so password managers and autofill work:

| Field | autoComplete value |
|---|---|
| Full name | `name` |
| Email | `email` |
| Current password | `current-password` |
| New password | `new-password` |
| Phone | `tel` |
| Organisation | `organization` |
| Address line 1 | `address-line1` |
| City | `address-level2` |

### Group related controls

```tsx
<fieldset>
  <legend className="text-[13px] font-medium text-ink">Notification preferences</legend>
  <div className="mt-3 space-y-2">
    <label className="flex items-center gap-2">
      <input type="checkbox" name="email_notif" />
      Email notifications
    </label>
  </div>
</fieldset>
```

---

## 4. Keyboard navigation

Every interactive element must be fully operable without a mouse.

### Tab order

- Tab order must follow the visual reading order (top-left to bottom-right).
- Never use `tabIndex` > 0 — it breaks the natural document order and is confusing.
- `tabIndex="0"` is acceptable only to make a non-interactive element focusable (rare).
- `tabIndex="-1"` is for elements that receive programmatic focus only (e.g. modal content div).

### Expected keyboard behaviour

| Pattern | Keys |
|---|---|
| Activate a button | Enter or Space |
| Follow a link | Enter |
| Close a dialog | Escape |
| Move through a list / menu | Arrow Up / Down |
| Move between tab panels | Arrow Left / Right |
| First / last item in a group | Home / End |
| Dismiss a tooltip | Escape |

Radix UI implements all of the above patterns internally. Do not suppress or override Radix's key handlers.

### Focus traps

Modals must trap focus — Tab cycles only within the dialog while it is open. Radix `Dialog` does this automatically. For any custom overlay not using Radix, implement a focus trap using a hook.

### Skip links

For pages with substantial navigation, add a skip link as the very first focusable element:

```tsx
// apps/web/components/SkipLink.tsx
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[200] focus-visible:rounded-full focus-visible:bg-ink focus-visible:px-4 focus-visible:py-2 focus-visible:text-[14px] focus-visible:font-medium focus-visible:text-white"
    >
      Skip to main content
    </a>
  );
}
// In root layout, render <SkipLink /> before everything else.
// The target: <main id="main-content">
```

---

## 5. Focus rings

Focus rings are the primary orientation tool for keyboard users. They must always be visible.

```tsx
// ✅ Correct — keyboard-only ring using focus-visible
className="focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"

// ❌ Never suppress without replacement
className="outline-none focus:outline-none"

// ❌ Never use plain focus: for rings — it shows on mouse click too, which is noisy
className="focus:ring-2 focus:ring-accent"
```

`focus-visible` uses the browser's heuristic: ring shows for keyboard focus, not mouse clicks. This is the correct UX.

Ring colour must always be `ring-accent` (`#0071e3`) — sufficient contrast against white and `bg-canvas`.

---

## 6. Images and icons

### Images with meaning

```tsx
<Image src="/chart.png" alt="Monthly revenue chart showing 23% growth in Q4" width={800} height={400} />
```

- Alt text describes the meaning, not the appearance. "Bar chart" is not useful; "Revenue by quarter, Q4 up 23%" is.
- If the image is purely decorative: `alt=""` (empty string, not omitted).

### Icons

```tsx
// Icon with adjacent text — hide icon, text is sufficient
<button>
  <TrashIcon aria-hidden="true" className="size-4" />
  Delete
</button>

// Icon-only button — hide icon, provide sr-only label
<button aria-label="Delete item">
  <TrashIcon aria-hidden="true" className="size-4" />
</button>

// Never omit both aria-label and alt on a meaningful icon
```

---

## 7. Colour and motion

### Colour contrast

Never convey information through colour alone — always pair with text, icon, or pattern.

| Combination | Contrast ratio | WCAG level |
|---|---|---|
| `text-ink` (`#1d1d1f`) on white | ~16:1 | AAA |
| `text-ink` on `bg-canvas` (`#fbfbfd`) | ~15:1 | AAA |
| `text-muted` (`#86868b`) on white | ~4.5:1 | AA |
| White text on `bg-accent` (`#0071e3`) | ~4.6:1 | AA |
| `text-muted` on `bg-canvas` | ~4.3:1 | AA (borderline) |

Do not use `text-muted` for body copy — only for labels, captions, and supplementary text where AA is the floor. Body copy uses `text-ink`.

### Reduced motion

Respect users who have `prefers-reduced-motion` enabled. Tailwind's `motion-safe:` / `motion-reduce:` prefixes handle this:

```tsx
// animate only when motion is safe
className="motion-safe:animate-pulse"
className="motion-safe:transition motion-safe:duration-200"

// provide a static fallback when motion is reduced
className="motion-reduce:transition-none"
```

Never use `animate-*` on content-critical elements without a `motion-reduce:` counterpart.

---

## 8. Screen-reader-only text

Use Tailwind's `sr-only` utility for text that must be announced but not shown visually:

```tsx
// Standalone visually-hidden text
<span className="sr-only">Loading users, please wait</span>

// Skip link (visible only on focus — see section 4)
className="sr-only focus-visible:not-sr-only"
```

Common uses:
- Labelling icon-only buttons when `aria-label` would be repetitive
- Providing context for screen readers that is implicit from visual layout ("column header: Status")
- Announcing dynamic changes not covered by `aria-live`

---

## 9. Radix UI and accessibility

Radix handles the hard parts automatically. Know what you get for free and what you must still provide:

| Primitive | Automatic | You must still provide |
|---|---|---|
| Dialog | `role="dialog"`, `aria-modal`, focus trap, Escape to close | `<DialogTitle>` (even if `sr-only`) |
| DropdownMenu | `role="menu"`, arrow-key nav, Escape to close | Trigger label |
| Tabs | `role="tablist"`, arrow-key nav, `aria-selected` | Each `TabsTrigger` label |
| Checkbox | `role="checkbox"`, Space to toggle | Linked `<Label>` |
| Select | `role="listbox"`, keyboard nav | `<Label>` linked to trigger |
| Tooltip | `role="tooltip"`, Escape to dismiss | Non-redundant content (not just the button label repeated) |
| Toast | `role="status"`, `aria-live="polite"` | Meaningful title + description |

Never suppress Radix's key handlers or ARIA props by overriding them without understanding the consequence.

---

## 10. Testing accessibility

Run these checks before marking any UI task done:

1. **Keyboard-only test** — unplug (or disable) the mouse. Tab through every interactive element. Can you reach everything? Does focus never disappear?
2. **Screen reader smoke test** — enable VoiceOver (Mac: Cmd+F5) or NVDA (Windows). Navigate the page. Do landmarks, headings, and interactive elements make sense when read aloud?
3. **Zoom test** — set browser zoom to 200%. Does the layout hold without horizontal scroll on content (scrollable data tables excepted)?
4. **Colour contrast check** — use browser DevTools' accessibility panel or the axe extension to flag contrast failures.
5. **`axe` or `Lighthouse` audit** — run in DevTools. Zero critical violations before merge.
