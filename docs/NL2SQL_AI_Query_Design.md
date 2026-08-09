# Natural Language to SQL (NL2SQL) — Technical Design

**Feature:** AI Query Assistant  
**Stack:** NestJS 10 · Claude claude-sonnet-4-6 (Anthropic) · PostgreSQL · Prisma 5  
**Status:** Design

---

## 1. Overview

The AI Query Assistant lets users query the Aivora database using plain English. A user types "show me all UOMs" and receives a formatted answer drawn from live data — no SQL knowledge required.

The system translates natural language into SQL using Claude with tool use, executes the generated query against a read-only database connection, and returns a human-readable response.

---

## 2. Architecture

```
User (natural language)
         │
         ▼
┌─────────────────────┐
│   AI Controller     │  POST /api/ai/query
│  (NestJS REST)      │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│    AI Service       │  Orchestrates the agent loop
│  (agent loop)       │
└──────┬──────┬───────┘
       │      │
       ▼      ▼
┌──────────┐ ┌────────────────┐
│  Schema  │ │  SQL Executor  │
│  Service │ │    Service     │
│ (cached) │ │ (read-only DB) │
└──────────┘ └────────────────┘
       │             │
       └──────┬──────┘
              ▼
     PostgreSQL (cloud)
```

### Request flow

1. User sends a natural language message to `POST /api/ai/query`.
2. **AI Service** loads the cached schema context and opens a Claude conversation with two tools attached.
3. Claude reasons over the schema, identifies relevant tables, and calls `execute_sql` with a generated SELECT statement.
4. **SQL Executor** validates and runs the query on a read-only connection, returns rows.
5. Claude receives the rows and writes a natural language response.
6. The formatted response is returned to the user.

---

## 3. Module Structure

```
apps/api/src/ai/
├── ai.module.ts
├── ai.controller.ts          # HTTP layer — POST /api/ai/query
├── ai.service.ts             # Agent loop, Claude tool-use orchestration
├── schema.service.ts         # DB introspection and schema cache
├── sql-executor.service.ts   # Read-only query runner with safety guards
└── dto/
    └── query.dto.ts          # { message: string; tenantId: string }
```

---

## 4. Schema Context Layer

### What it stores

On application startup, `SchemaService` introspects `information_schema` and builds an in-memory schema map:

- Table names and descriptions
- Column names, data types, nullability
- Primary keys
- Foreign key relationships (for join reasoning)

### Introspection queries

```sql
-- Tables and columns
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Foreign keys
SELECT
  tc.table_name        AS source_table,
  kcu.column_name      AS source_column,
  ccu.table_name       AS target_table,
  ccu.column_name      AS target_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public';
```

### Schema snapshot format (passed to Claude)

```
Table: unit_of_measure
  id           uuid        PK
  code         varchar     NOT NULL   (e.g. EA, KG, LTR)
  name         varchar     NOT NULL
  description  text
  tenant_id    uuid        NOT NULL   FK → tenants.id
  created_at   timestamptz NOT NULL

Table: product
  id              uuid     PK
  name            varchar  NOT NULL
  uom_id          uuid     FK → unit_of_measure.id
  tenant_id       uuid     NOT NULL   FK → tenants.id
  ...
```

### Cache invalidation

Schema is cached in memory. It is refreshed:
- On application startup
- Via `SchemaService.refresh()` called from the Prisma migration hook in deployment scripts

---

## 5. The Agent (Claude Tool Use)

`AIService` uses the Anthropic SDK in an agentic loop. Claude is given two tools and reasons autonomously over multiple turns until it produces a final answer.

### Tools

#### `describe_table`

Called when Claude needs deeper column-level detail before generating a query.

```typescript
{
  name: 'describe_table',
  description: 'Returns full column definitions and a sample of 3 rows for a named table.',
  input_schema: {
    type: 'object',
    properties: {
      table_name: { type: 'string' }
    },
    required: ['table_name']
  }
}
```

#### `execute_sql`

Called when Claude has a complete SELECT ready to run.

```typescript
{
  name: 'execute_sql',
  description: 'Executes a read-only SQL SELECT against the database and returns rows as JSON.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'A valid PostgreSQL SELECT statement.' }
    },
    required: ['query']
  }
}
```

### System prompt

```
You are a data assistant for Aivora, an ERP/SCM platform.
You have access to a PostgreSQL database. The schema is provided below.

Rules:
- Only generate SELECT statements. Never generate INSERT, UPDATE, DELETE, DROP, or ALTER.
- Every query MUST include WHERE tenant_id = '<tenant_id>' to scope results to the current tenant.
- If a query spans multiple tables, use explicit JOINs based on the foreign key relationships in the schema.
- Prefer readable column aliases in your output.
- If the user's request is ambiguous, ask a clarifying question instead of guessing.
- Respond with a concise natural language summary followed by the data. Do not expose raw SQL to the user.

Schema:
<schema_snapshot>
```

### Agent loop (pseudocode)

```
messages = [{ role: 'user', content: userMessage }]

loop:
  response = claude.messages.create(model, tools, messages)

  if response.stop_reason == 'end_turn':
    return response.content  ← final answer

  if response.stop_reason == 'tool_use':
    for each tool_call in response.content:
      result = dispatch(tool_call)        ← describe_table or execute_sql
      messages.append(tool_result(result))
    continue loop
```

Max turns: 8 (prevents runaway loops on ambiguous queries).

---

## 6. SQL Executor — Safety Layer

All queries from Claude pass through `SQLExecutorService` before touching the database.

### Guards (applied in order)

| Guard | Implementation |
|---|---|
| Non-SELECT rejection | Regex check for `INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE`, `ALTER`, `GRANT`, `REVOKE` |
| Tenant isolation | Verify `WHERE tenant_id = '<expected_uuid>'` is present; reject if missing |
| Row cap | Append `LIMIT 500` if no LIMIT clause is present |
| Statement timeout | Set `statement_timeout = 10000` on the connection before executing |
| Read-only connection | Separate `DATABASE_URL_READONLY` connection string scoped to a Postgres role with `SELECT`-only grants |

### Postgres read-only role setup

```sql
CREATE ROLE aivora_readonly LOGIN PASSWORD '...';
GRANT CONNECT ON DATABASE aivora_db TO aivora_readonly;
GRANT USAGE ON SCHEMA public TO aivora_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO aivora_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO aivora_readonly;
```

### Environment variable

```
DATABASE_URL_READONLY=postgresql://aivora_readonly:<password>@<host>:5432/aivora_db
```

---

## 7. API Contract

### Request

```
POST /api/ai/query
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "message": "show me all units of measure"
}
```

`tenantId` is never supplied by the client — it is read from the verified JWT.

### Response

```json
{
  "answer": "There are 12 units of measure configured:\n\n| Code | Name        | Description          |\n|------|-------------|----------------------|\n| EA   | Each        | Individual unit      |\n| KG   | Kilogram    | Weight in kilograms  |\n| ...", 
  "rowCount": 12,
  "executedQuery": null
}
```

`executedQuery` is `null` in production. It can be returned in development mode for debugging.

---

## 8. Multi-Tenant Safety

This is non-negotiable. Two layers enforce it:

1. **System prompt** instructs Claude to always include `WHERE tenant_id = '<tenantId>'`.
2. **SQL Executor** independently verifies the tenant filter is present before executing. If Claude omits it (hallucination), the query is rejected with a logged error — it never reaches the database.

The `tenantId` injected into both the prompt and the validator comes exclusively from the JWT — never from user input.

---

## 9. Handling Complex Queries

Claude handles multi-table joins autonomously using the foreign key graph in the schema snapshot. Example:

> "Show me all open purchase orders with their line items and supplier names"

Claude reasons:
1. `purchase_order` table → filter `status = 'OPEN'`
2. FK: `purchase_order_line.po_id → purchase_order.id`
3. FK: `purchase_order.supplier_id → supplier.id`
4. Generates a three-table JOIN

If Claude is uncertain about which columns to use, it calls `describe_table` first, then generates the query.

---

## 10. Error Handling

| Scenario | Behaviour |
|---|---|
| Claude generates invalid SQL | Postgres error is returned to Claude as a tool result; Claude retries with a corrected query (up to 2 retries) |
| Table name hallucinated | Postgres returns "relation does not exist"; Claude recovers using schema context |
| Query times out | Statement timeout fires; user receives "Query took too long — try narrowing your request" |
| Schema cache stale | `describe_table` falls back to a live `information_schema` query |
| Max turns reached | Return "Unable to answer this query — please rephrase or contact support" |

---

## 11. Frontend Integration

A minimal chat component in `apps/web/components/AiQueryChat.tsx`:

- Text input + submit
- Renders the `answer` field as markdown (tables, lists)
- Streaming optional: poll `POST /api/ai/query` for now; migrate to SSE when needed
- Scoped to authenticated layout only — never exposed to public routes

---

## 12. Future Enhancements

| Enhancement | When to add |
|---|---|
| **Vector schema search** | When schema exceeds ~60 tables — embed table descriptions, semantic-search to select relevant subset before calling Claude |
| **Query history** | Store past queries per user; surface "you asked this before" suggestions |
| **Streaming responses** | Replace polling with Server-Sent Events for long-running queries |
| **Saved queries** | Let users bookmark NL queries; store as named reports |
| **Audit log** | Log every executed SQL with user, tenant, timestamp for compliance |
