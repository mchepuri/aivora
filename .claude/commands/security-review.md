# Security Review

Run a pre-PR security checklist against the changed files in the current branch. Use this before raising a PR to main.

## Instructions

1. Run `git diff main...HEAD --name-only` to identify changed files.
2. Read each changed file.
3. Evaluate every item in the checklist below.
4. Output a report: PASS / FAIL / N/A per item, with a brief note on any FAIL.

---

## Checklist

### Authentication & Authorization
- [ ] Every API endpoint that handles user data is behind `JwtAuthGuard` (or has an explicit documented reason for being public)
- [ ] Every service method that queries the database scopes the query to `userId` or `orgId` — no query that could return another user's data
- [ ] No `id` passed from the client is trusted without verifying ownership in the service layer
- [ ] Password fields are never returned in API responses (check `select` / `omit` in Prisma queries and serialized response shapes)

### Input Validation
- [ ] All controller `@Body()` parameters use a DTO class decorated with `class-validator`
- [ ] All `@Param()` values that are IDs are validated with `@IsUUID()`
- [ ] No raw `req.body` access that bypasses the DTO pipeline
- [ ] File upload endpoints (if any) validate MIME type and enforce size limits

### Injection
- [ ] No raw SQL strings built by concatenating user input — use Prisma parameterised queries exclusively
- [ ] No `eval()`, `Function()`, `child_process.exec()` with user-controlled strings
- [ ] No template literals that embed user input into shell commands

### Frontend XSS
- [ ] No `dangerouslySetInnerHTML` with user-controlled content
- [ ] External URLs (user-supplied `href`) are validated to start with `https://` before rendering
- [ ] `<iframe>` / `<script>` tags are not constructed from user input

### Secrets & Environment
- [ ] No hardcoded secrets, API keys, or tokens anywhere in changed files
- [ ] Any new environment variable is added to `.env.example` (not `.env`) and documented
- [ ] `console.log` is not printing sensitive values (tokens, passwords, PII)

### Dependencies
- [ ] Any new `npm` package added in this PR has been checked on npmjs.com for: weekly downloads > 10k, active maintenance, no known CVEs
- [ ] No package is imported with a `*` wildcard in a way that could shadow built-ins

### Data Exposure
- [ ] Prisma `findMany` queries that return lists are paginated or limited (no unbounded `findMany()` on large tables)
- [ ] Error responses do not include stack traces or internal Prisma error details (NestJS built-in exception filter handles this — do not override with raw `catch` that re-throws Prisma errors directly)
- [ ] Audit-sensitive operations (delete, privilege change) are logged

### CORS & Headers
- [ ] No new `Access-Control-Allow-Origin: *` added to the API
- [ ] Content-Security-Policy is not weakened by changes to Next.js config or API response headers

---

## Output format

```
## Security Review — [branch name]

### PASS
- JWT guard on all endpoints
- Queries scoped to userId
...

### FAIL
- **XSS risk**: `UserCard.tsx:42` renders `user.bio` via dangerouslySetInnerHTML — switch to text content
- **Missing validation**: `POST /invoices` body has no DTO — raw req.body is used

### N/A
- File upload checks (no file upload in this diff)
...

### Verdict
FAIL — 2 issues must be resolved before merge.
```

If all items pass, output `Verdict: PASS — safe to raise PR`.
