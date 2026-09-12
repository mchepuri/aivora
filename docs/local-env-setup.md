# Local Environment Setup

This guide covers everything needed to get Aivora running locally, including variables missing from the main README.

---

## Step 1 — Copy the example env files

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

---

## Step 2 — Fill in `apps/api/.env`

Open `apps/api/.env` and set each variable:

### `DATABASE_URL` (required)
Local PostgreSQL connection string. Replace `password` with your actual Postgres password.
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/aivora_db"
```
If you don't have PostgreSQL installed locally, create a free database at [neon.tech](https://neon.tech) and use the connection string they provide.

### `JWT_SECRET` (required)
Used to sign and verify authentication tokens. Generate a secure random value:
```bash
openssl rand -hex 32
```
Paste the output into your `.env`:
```
JWT_SECRET=<paste generated value here>
```
The API will crash at startup if this is missing or empty.

### `OPENROUTER_API_KEY` (required for AI features)
Used by the Inventory Bot. Get a free key at [openrouter.ai/keys](https://openrouter.ai/keys).
```
OPENROUTER_API_KEY=sk-or-...
```
Without this, the Inventory Bot endpoint will fail. All other features work without it.

### `WEB_ORIGIN` (optional locally)
The CORS allowed origin. Defaults to `http://localhost:3000` which is correct for local dev.
```
WEB_ORIGIN=http://localhost:3000
```

### `API_PORT` (optional)
Port the NestJS server listens on. Defaults to `3001`.
```
API_PORT=3001
```

---

## Step 3 — Fill in `apps/web/.env`

Only one variable is needed for local dev:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```
This is already set correctly in the example file — no changes needed unless your API runs on a different port.

---

## Step 4 — Install dependencies

```bash
npm install
```

---

## Step 5 — Generate the Prisma client

```bash
cd apps/api && npx prisma generate && cd ../..
```

Run this whenever the Prisma schema changes (e.g. after pulling new migrations from main). Skipping this causes TypeScript errors about missing Prisma types.

---

## Step 6 — Run database migrations

```bash
cd apps/api && npx prisma migrate dev && cd ../..
```

---

## Step 7 — Start the dev servers

```bash
npm run dev
```

| App          | URL                              |
|--------------|----------------------------------|
| Web          | http://localhost:3000            |
| API          | http://localhost:3001/api        |
| Health check | http://localhost:3001/api/health |

---

## After pulling from main

Always run these two commands after pulling new commits:

```bash
npm install                              # picks up new/updated dependencies
cd apps/api && npx prisma generate && cd ../..   # regenerates Prisma client if schema changed
```

Skipping either of these is the most common cause of local build failures.

---

## Complete `apps/api/.env` reference

| Variable           | Required | Description                                      |
|--------------------|----------|--------------------------------------------------|
| `DATABASE_URL`     | Yes      | PostgreSQL connection string                     |
| `JWT_SECRET`       | Yes      | Secret for signing JWTs — generate with `openssl rand -hex 32` |
| `OPENROUTER_API_KEY` | AI features only | OpenRouter API key for the Inventory Bot |
| `WEB_ORIGIN`       | No       | CORS allowed origin (default: `http://localhost:3000`) |
| `API_PORT`         | No       | API port (default: `3001`)                       |
| `NODE_ENV`         | No       | `development` locally, `production` on Vercel    |
