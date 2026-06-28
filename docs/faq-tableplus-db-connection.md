# Connecting to the Database with TablePlus

TablePlus is a native GUI client for PostgreSQL (and other databases). The free tier is enough for all day-to-day development work on Aivora.

---

## 1. Install TablePlus

Download and install from [tableplus.com](https://tableplus.com). Available for macOS, Windows, and Linux.

---

## 2. Create a new connection

1. Open TablePlus and click **Create a new connection** (or press `Cmd+N` on Mac).
2. Select **PostgreSQL** from the list of database types.

---

## 3. Fill in the connection details

### Option A — Paste the connection URL directly (fastest)

1. Click the **URL** tab at the top of the connection dialog.
2. Paste your `DATABASE_URL` from `apps/api/.env`:

```
postgresql://<user>:<password>@<host>/<dbname>?sslmode=require
```

3. TablePlus will auto-fill all fields from the URL.
4. Click **Test** (bottom-left) — you should see a green **OK**.
5. Click **Connect**.

### Option B — Fill in fields manually

| Field      | Value                                                                 |
|------------|-----------------------------------------------------------------------|
| Name       | `Aivora (Neon)` — any label you like                                  |
| Host       | `ep-noisy-tree-apwotbo5.c-7.us-east-1.aws.neon.tech`                 |
| Port       | `5432`                                                                |
| User       | from `DATABASE_URL` (the part before `:` after `//`)                 |
| Password   | from `DATABASE_URL` (the part between `:` and `@`)                   |
| Database   | `neondb`                                                              |
| SSL        | **Required** — tick the SSL checkbox                                  |

---

## 4. Useful queries to get started

Once connected, open a query tab with `Cmd+T` and try:

```sql
-- list all tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- inspect users and their roles
SELECT u.email, r.name AS role
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id;

-- inspect approval limits
SELECT r.name AS role, al.resource, al.max_amount, al.currency
FROM approval_limits al
JOIN roles r ON r.id = al.role_id
ORDER BY al.resource, al.max_amount;

-- inspect SoD rules
SELECT s.name, ra.name AS role_a, rb.name AS role_b
FROM sod_rules s
JOIN roles ra ON ra.id = s.role_a_id
JOIN roles rb ON rb.id = s.role_b_id;
```

---

## 5. Keyboard shortcuts worth knowing

| Shortcut | Action |
|----------|--------|
| `Cmd+T` | New query tab |
| `Cmd+R` | Run query |
| `Cmd+K` | Open table (fuzzy search) |
| `Cmd+/` | Toggle comment on selected lines |

---

## Security reminder

Never paste your `DATABASE_URL` (with password) into Slack, GitHub issues, or chat messages. Keep it in `apps/api/.env` only — that file is in `.gitignore` and will never be committed.

If you believe your credentials were exposed, reset the password immediately:
- **Neon**: Dashboard → your project → **Settings** → **Reset password**
