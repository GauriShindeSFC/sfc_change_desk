# SFC Change Desk

An IT Change Management portal ("ChangeDesk") — raise change requests, route them
through a CAB approval workflow, manage the change catalog, and report on change
volume and SLA compliance.

Monorepo with two independent packages:

| Package    | Stack                                              | Dev port |
| ---------- | ------------------------------------------------- | -------- |
| `frontend` | React 18 + Vite, `lucide-react` icons, inline CSS | `5174`   |
| `backend`  | Express 4 (ESM) + Sequelize 6 + PostgreSQL        | `5001`   |

---

## Repository layout

```
sfc_change_desk/
├── package.json              # root convenience scripts (delegate to frontend/backend)
├── frontend/
│   ├── .env                  # VITE_API_BASE_URL  (gitignored)
│   ├── .env.example
│   └── src/
│       ├── lib/config.js     # reads import.meta.env.VITE_API_BASE_URL
│       ├── lib/apiClient.js
│       ├── pages/            # one component per route (no router lib; state-switched)
│       └── components/
└── backend/
    ├── .env                  # PORT, CORS_ORIGIN, DATABASE_URI  (gitignored)
    ├── .env.example
    ├── server.js             # app entry: CORS, routes, DB connect, listen
    ├── config/
    │   ├── env.js            # loads backend/.env by absolute path
    │   └── database.js       # Sequelize instance from DATABASE_URI (SSL on)
    ├── models/index.js       # 11 models + their associations
    ├── data/
    │   ├── seed.js           # seed rows + seedDatabase()
    │   └── store.js          # risk/status style + date/relative-time helpers
    ├── scripts/syncDatabase.js   # `npm run db:sync` / `db:sync:force`
    ├── routes/dashboard.js
    ├── controllers/dashboardController.js
    ├── services/dashboardService.js   # all DB access, returns UI-shaped payloads
    ├── utils/serializers.js           # model rows (+ joins) -> frontend JSON
    ├── utils/asyncHandler.js
    ├── validations/changeRequestValidation.js
    └── middlewares/errorHandler.js     # notFoundHandler + errorHandler
```

---

## Prerequisites

- **Node.js 18+**
- A **PostgreSQL** database (the project is developed against a Supabase session
  pooler; any Postgres 12+ works).

---

## Setup

### 1. Install dependencies

```bash
npm run install:backend
npm run install:frontend
```

### 2. Configure environment

Copy each `.env.example` to `.env` and fill in the values.

```bash
cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env
```

**`backend/.env`**

| Variable       | Purpose                                             | Example                                             |
| -------------- | -------------------------------------------------- | -------------------------------------------------- |
| `PORT`         | API listen port                                    | `5001`                                             |
| `NODE_ENV`     | `development` \| `production`                      | `development`                                      |
| `CORS_ORIGIN`  | Comma-separated allow-list (`*` = any)             | `http://localhost:5174`                            |
| `DATABASE_URI` | PostgreSQL connection string                       | `postgresql://user:pass@host:5432/postgres`        |
| `DB_LOGGING`   | `true` to log every SQL statement                  | `false`                                            |
| `DB_SYNC`      | `true` to run `sequelize.sync()` on server boot    | *(unset)*                                          |

**`frontend/.env`**

| Variable            | Purpose                            | Example                               |
| ------------------- | --------------------------------- | ------------------------------------- |
| `VITE_API_BASE_URL` | Base URL of the backend API       | `http://localhost:5001/api/dashboard` |

### 3. Create the database schema

From `backend/`:

```bash
npm run db:sync         # CREATE TABLE IF NOT EXISTS + seed empty tables
npm run db:sync:force   # DROP & recreate every table, then reseed  (destructive)
node scripts/syncDatabase.js --alter   # ALTER tables to match the models
```

`db:sync:force` is the one to use after a model change.

---

## Running

Two terminals:

```bash
npm run server   # backend  -> http://localhost:5001
npm run dev      # frontend -> http://localhost:5174  (opens a browser)
```

The backend still starts if the database is unreachable, but DB-backed routes
will return `500` until the connection succeeds.

---

## Root scripts

| Script                     | Action                                   |
| -------------------------- | --------------------------------------- |
| `npm run dev` / `start`    | frontend dev server (Vite, port 5174)   |
| `npm run server`           | backend API (`node backend/server.js`)  |
| `npm run build`            | production build of the frontend        |
| `npm run preview`          | serve the built frontend                |
| `npm run install:frontend` | `npm install` inside `frontend/`        |
| `npm run install:backend`  | `npm install` inside `backend/`         |

Backend-only scripts (run from `backend/`): `npm run db:sync`, `npm run db:sync:force`.

---

## Database model

11 tables. Foreign keys link the entities; a few values are **derived** rather
than stored.

```
roles ◄─────────── role_id ──────────── users
                                          │
users ◄────── requester_id ──┐            │
users ◄────── approver_id ───┤  change_requests ──── workflow_id ──►┐
users ◄────── actor_id ── audit_logs                                │
                                                        workflows ◄─┤
                             catalog_items ──── workflow_id ────────┘
```

| Table                | Key columns / FKs                                                        | Notes |
| -------------------- | --------------------------------------------------------------------- | ----- |
| `roles`              | `id`, `name`, `description`, `permissions` (jsonb)                     | `usersCount` is derived (`COUNT(users)`) |
| `users`              | `id`, `name`, `email`, `status`, **`role_id → roles.id`**             | |
| `workflows`          | `id`, `name`, `steps`                                                 | `usedBy` is derived from `catalog_items` |
| `catalog_items`      | `id`, `title`, `category`, `sla`, `risk`, `icon_bg/color`, `status`, **`workflow_id → workflows.id`** | serves both the browse and admin catalog views |
| `change_requests`    | `id`, `title`, `category`, `status`, `risk`, `submitted_at`, `closed_at`, **`requester_id`**, **`approver_id`**, **`workflow_id`** | the CAB worklist = rows where `status = 'Pending'`; `raisedDate`/`closedDate` derived from the timestamps |
| `audit_logs`         | `id`, `timestamp`, `action`, `ref`, `detail`, **`actor_id → users.id`** (nullable) | `actor` serialized as the user's name, or `System` |
| `category_breakdown` | `label`, `count`, `max`, `color`                                      | dashboard chart data (standalone) |
| `status_breakdown`   | `label`, `count`, `color`                                             | dashboard chart data (standalone) |
| `monthly_volume`     | `month`, `count`, `bar_height`, `sort_index`                          | reports chart data (standalone) |
| `department_volume`  | `name`, `count`, `percentage`, `color`, `sort_index`                  | reports chart data (standalone) |
| `app_config`         | `key`, `value` (jsonb)                                               | singletons: `dashboard_stats`, `worklist_metrics`, `report_metrics` |

Presentation fields the frontend expects (`riskColor`, `riskBars`, `statusBg`,
`statusColor`, `statusDot`, …) are **not stored** — `utils/serializers.js` adds
them when shaping each response.

---

## API

Base path: `/api/dashboard` · health check: `GET /api/health`

| Method & path                        | Purpose |
| ------------------------------------ | ------- |
| `GET  /metrics`                      | dashboard metric cards |
| `GET  /categories`                   | category breakdown |
| `GET  /status-breakdown`             | status breakdown |
| `GET  /change-requests/recent?limit` | recent change requests |
| `GET  /my-requests?category=`        | all change requests (optional category filter) |
| `POST /change-requests`              | create a change request / draft |
| `GET  /catalog`                      | change catalog (browse view) |
| `GET  /catalogue-management`         | catalog templates + workflows (admin view) |
| `POST /catalogue-management/item`    | add a catalog template |
| `GET  /worklist`                     | CAB worklist (pending CRs) + metrics |
| `POST /worklist/action`             | `{ id, action: approve\|reject\|sendback }` |
| `GET  /settings/users`               | users (with role name) |
| `GET  /settings/roles`               | roles (with derived user counts) |
| `GET  /settings/audit-logs?filter=`  | audit log (optional activity filter) |
| `GET  /reports/metrics`              | report KPIs + monthly / department volume |
| `POST /reports/export`               | stub — returns a success message |

Response envelope: `{ success: true, data }` (lists add `count`); writes return
`{ success: true, message, data }`. Errors return `{ success: false, message }`
with an appropriate status code.

`POST` routes mutate the database within a transaction and append an
`audit_logs` row; creating a CR or acting on the worklist also updates the
counters in `app_config`.

---

## Notes

- **No auth.** The login page is a 600 ms fake delay; the acting user defaults to
  `Gauri Shinde` (`usr-1`).
- `dashboard_stats` and the `*_breakdown` / `*_volume` tables hold curated demo
  numbers, not counts computed from `change_requests`.
- `frontend/dist/` is checked in (a prebuilt bundle); `npm run build` regenerates it.
