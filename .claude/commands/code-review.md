# Code Review

Review the code changes in the current branch against Aivora's engineering standards. Use before or during PR review.

## Instructions

1. Run `git diff main...HEAD` to get all changes.
2. Run `git diff main...HEAD --name-only` to see which files changed.
3. Read each changed file in full if the diff is incomplete.
4. Evaluate every section of the checklist below.
5. Output a structured review report.

---

## Review Areas

### Correctness
- [ ] Logic produces the expected output for the happy path
- [ ] Edge cases handled: empty arrays, null/undefined, zero, empty string, missing optional fields
- [ ] Async operations are awaited — no floating promises
- [ ] Error paths either throw or return — never silently swallow errors

### TypeScript Quality
- [ ] No `any` types introduced
- [ ] No `// @ts-ignore` or `// @ts-expect-error` without a comment explaining why
- [ ] No non-null assertions (`!`) on values that could genuinely be null at runtime
- [ ] Interfaces/types are defined — no inline object shapes repeated in multiple places

### React & Next.js (frontend changes)
- [ ] New components default to Server Components — `'use client'` only when hooks/events are needed
- [ ] `useEffect` has correct dependency arrays — no missing deps, no stale closures
- [ ] Data fetching in Server Components uses `fetch` with appropriate `cache` / `revalidate` options — not `useEffect` + `useState`
- [ ] No prop drilling more than 2 levels deep — consider moving state up or using a Server Component
- [ ] Keys in lists are stable IDs, not array indexes
- [ ] Images use `next/image` — not raw `<img>` tags

### Design System Compliance (frontend changes)
- [ ] Only theme tokens used: `text-ink`, `text-muted`, `bg-canvas`, `text-accent` — no raw Tailwind colours like `blue-500`, `gray-700`
- [ ] Buttons are `rounded-full` pill shape
- [ ] Cards use `rounded-2xl border border-black/5`
- [ ] All interactive elements have visible `focus:` styles
- [ ] Max content width is `max-w-6xl mx-auto px-6`

### NestJS & API (backend changes)
- [ ] Controller validates input via DTO + class-validator — no raw `req.body`
- [ ] Service scopes all DB queries to the authenticated user/org — no cross-tenant leakage
- [ ] Prisma errors are caught and mapped to HTTP exceptions — `P2025` → `NotFoundException`, `P2002` → `ConflictException`
- [ ] `PrismaClientKnownRequestError` is imported from `@prisma/client/runtime/library` (not `Prisma` namespace)
- [ ] No `findMany` without `where` clause (accidental full-table scan)
- [ ] New module is registered in `AppModule`

### Code Hygiene
- [ ] No `console.log` / `console.error` left in production code
- [ ] No TODO comments without a linked issue number (e.g. `// TODO(#42): ...`)
- [ ] No dead/commented-out code
- [ ] Functions are ≤ 40 lines; files are ≤ 300 lines
- [ ] No duplicate logic — if the same 3+ lines appear twice, extract a helper
- [ ] Variable and function names are self-explanatory — no single-letter names outside of loop indexes

### Tests (if tests are included or should be)
- [ ] New service methods have corresponding unit tests
- [ ] Tests use real Prisma (integration style) not mocked DB — per project policy
- [ ] Test descriptions say what the code DOES, not what it IS (e.g. "returns 404 when resource not found" not "findOne test")

### Security (abbreviated — run `/project:security-review` for full check)
- [ ] No hardcoded secrets
- [ ] Auth guards present on all protected routes
- [ ] No `dangerouslySetInnerHTML` with user input

---

## Output format

```
## Code Review — [branch/PR name]

### Summary
[2-3 sentence summary of what the PR does]

### Issues — Must Fix
- **[File:Line]** — [description of the problem and how to fix it]

### Issues — Should Fix
- **[File:Line]** — [description, lower severity]

### Nitpicks
- **[File:Line]** — [style, naming, minor suggestions]

### Looks Good
- [Things done particularly well worth calling out]

### Verdict
APPROVED / CHANGES REQUESTED / NEEDS DISCUSSION
```

If there are no issues, output `Verdict: APPROVED` with a brief positive summary.
