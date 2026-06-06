# Aivora

Where AI powers the future of supply chains.

## Project Structure

```
aivora/
├── apps/
│   ├── api/   # NestJS backend (port 3001)
│   └── web/   # Next.js frontend (port 3000)
└── packages/
    └── shared/ # Shared types
```

---

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [PostgreSQL](https://www.postgresql.org/) running locally (or a [Neon](https://neon.tech) free account)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Key variables:

| Variable              | Where        | Default / Notes                                           |
| --------------------- | ------------ | --------------------------------------------------------- |
| `DATABASE_URL`        | `apps/api`   | `postgresql://postgres:password@localhost:5432/aivora_db` |
| `API_PORT`            | `apps/api`   | `3001`                                                    |
| `NEXT_PUBLIC_API_URL` | `apps/web`   | `http://localhost:3001/api`                               |

### 3. Set up the database

```bash
cd apps/api
npx prisma migrate dev
cd ../..
```

### 4. Run the dev server

```bash
npm run dev          # starts both API (3001) and web (3000) concurrently
```

Or individually:

```bash
npm run dev --workspace=apps/api   # http://localhost:3001/api
npm run dev --workspace=apps/web   # http://localhost:3000
```

| App          | URL                              |
| ------------ | -------------------------------- |
| Web          | http://localhost:3000            |
| API          | http://localhost:3001/api        |
| Health check | http://localhost:3001/api/health |

---

## Deployment (Vercel + Neon)

The app is deployed as **two Vercel projects** that share the same GitHub repository.
Pushing to `main` automatically triggers a production deployment for both.

### Database — Neon (free tier)

1. Create a free project at [neon.tech](https://neon.tech).
2. Copy the **connection string** (use the pooled connection string — ends with `?pgbouncer=true`).
3. Run migrations against Neon from your local machine once:

```bash
DATABASE_URL="<your-neon-url>" npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

### Vercel Project 1 — Web (Next.js)

1. Go to [vercel.com/new](https://vercel.com/new) → import `mchepuri/aivora`.
2. Leave **Root Directory** as `.` (repository root).
3. Vercel auto-detects Next.js via `vercel.json`.
4. Set these **Environment Variables** in the Vercel dashboard:

| Variable              | Value                                    |
| --------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_API_URL` | `/api`                                   |
| `API_ORIGIN`          | `https://<your-api-project>.vercel.app`  |

> `API_ORIGIN` is used by Next.js rewrites to proxy `/api/*` calls server-side to
> the NestJS project, so the browser makes same-origin requests (no CORS needed).

### Vercel Project 2 — API (NestJS)

1. Go to [vercel.com/new](https://vercel.com/new) → import the **same** `mchepuri/aivora` repo.
2. Set **Root Directory** to `.` and **Framework Preset** to **Other**.
3. Override the **Build Command** and other settings with the values from `apps/api/vercel.json`
   (Vercel reads this file automatically when the project root is `.`):

   | Setting         | Value (from `apps/api/vercel.json`)                                  |
   | --------------- | -------------------------------------------------------------------- |
   | Build command   | `npm run build --workspace=packages/shared && cd apps/api && npx prisma generate && npm run build` |
   | Install command | `npm install`                                                        |

4. Set these **Environment Variables**:

| Variable       | Value                                     |
| -------------- | ----------------------------------------- |
| `DATABASE_URL` | `<your-neon-pooled-connection-string>`    |
| `WEB_URL`      | `https://<your-web-project>.vercel.app`   |
| `NODE_ENV`     | `production`                              |

### CI — GitHub Actions

`.github/workflows/ci.yml` runs on every push and pull request to `main`:

- Typechecks both `apps/web` and `apps/api`
- Builds both apps (catches broken imports / missing env vars early)

Vercel's own GitHub integration triggers the production deployment **after** the CI
workflow passes — giving you a basic push-to-prod gate on every merge to `main`.

### Environment variable summary

| Variable              | Project | Local dev                           | Production                               |
| --------------------- | ------- | ----------------------------------- | ---------------------------------------- |
| `DATABASE_URL`        | API     | local PostgreSQL URL                | Neon pooled connection string            |
| `WEB_URL`             | API     | `http://localhost:3000`             | `https://<web>.vercel.app`               |
| `NODE_ENV`            | API     | `development`                       | `production`                             |
| `NEXT_PUBLIC_API_URL` | Web     | `http://localhost:3001/api`         | `/api`                                   |
| `API_ORIGIN`          | Web     | *(not needed — direct URL is used)* | `https://<api>.vercel.app`               |
