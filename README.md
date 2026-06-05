# aivora

Where AI powers the future of supply chains.

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [PostgreSQL](https://www.postgresql.org/) running locally

## Project Structure

```
aivora/
├── apps/
│   ├── api/   # NestJS backend (port 3001)
│   └── web/   # Next.js frontend (port 3000)
└── packages/
    └── shared/ # Shared types
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example env files and fill in your values:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

The defaults assume a local PostgreSQL instance:

| Variable              | Default                                           |
| --------------------- | ------------------------------------------------- |
| `DATABASE_URL`        | `postgresql://postgres:password@localhost:5432/aivora_db` |
| `API_PORT`            | `3001`                                            |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api`                       |

### 3. Set up the database

```bash
cd apps/api
npx prisma migrate dev
```

## Running the dev server

From the repo root, start both the API and web app together:

```bash
npm run dev
```

Or run them individually:

```bash
# API only (http://localhost:3001)
npm run dev --workspace=apps/api

# Web only (http://localhost:3000)
npm run dev --workspace=apps/web
```

| App | URL |
| --- | --- |
| Web | http://localhost:3000 |
| API | http://localhost:3001/api |
| Health check | http://localhost:3001/api/health |
