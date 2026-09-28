# SFC Change Desk

An internal Saint Fox platform spanning three approval-driven request workflows:

- **Change Requests** — the original ITIL-style Change Advisory Board (CAB) flow: raise a change from a catalog template, route it through an approval workflow, approve/reject/implement, audit-log every step.
- **Travel Desk** — travel request submission and approval (multi-city itineraries supported).
- **Pre-Spend Request** — spend/purchase request submission and approval, including past-vendor lookup.

A fourth item, **Tribe CRM**, is not a module of this app — it's a sidebar shortcut that opens Saint Fox's separate CRM/HR portal (`tribe.stfox.com`) in a new tab.

Monorepo with two independent packages:

| Package    | Stack                                                                 | Dev port |
| ---------- | ---------------------------------------------------------------------- | -------- |
| `frontend` | React 18 + Vite 5, **react-router-dom** (real routing), **TanStack Query**, Axios, Tailwind CSS v4, `lucide-react` | `5174`   |
| `backend`  | Express 4 (ESM) + Sequelize 6 + PostgreSQL, Joi validation, `express-rate-limit` | `5001`   |

---

## Repository layout

The backend is split into one routes/controller/service file per domain (no more single
monolithic `dashboardController.js`/`dashboardService.js`):

```
sfc_change_desk/
├── package.json                 # root convenience scripts (delegate to frontend/backend)
├── frontend/
│   ├── .env                     # VITE_API_BASE_URL  (gitignored)
│   ├── .env.example
│   └── src/
│       ├── App.jsx               # BrowserRouter + role-gated routes (/dashboard, /catalog, /worklist, /pre-spend, /travel-desk, /settings, …)
│       ├── pages/                # one *.page.jsx per route
│       ├── components/           # *.component.jsx shared UI
│       ├── queries/              # TanStack Query hooks, one file per domain
│       └── lib/                  # apiFetch.lib.js, auth.lib.js, config.lib.js, …
└── backend/
    ├── .env                      # PORT, CORS_ORIGIN, DATABASE_URI, JWT_*, MICROSOFT_*  (gitignored)
    ├── .env.example
    ├── server.js                 # app entry: CORS, routes, DB connect, notification worker, listen
    ├── config/                   # env.js, database.js
    ├── models/                   # Role, ChangeRequest, ChangeRequestApproval, AuditLog, AppConfig,
    │                              # CatalogCategory/Subcategory/Field, ChangeManagerCategory,
    │                              # ChangeImplementerCategory, Employee, UserS8, UserAppRole, ChangeUser,
    │                              # PreSpendRequest, TravelRequest, NotificationJob
    ├── routes/                   # {auth,catalog,changeRequest,dashboard,worklist,preSpend,travelDesk,
    │                              #  settings,publicAction}.routes.js
    ├── controllers/               # one per domain, matching routes/
    ├── services/                  # one per domain, plus identityResolver, notificationQueue, mail,
    │                              # workflow, userManagement, auditLog, reportContent
    ├── middlewares/                # auth, rateLimit, validate, error
    ├── validations/                 # Joi schemas
    └── utils/                       # serializers, errors, dateFilterUtils, asyncHandler
```

---

## Prerequisites

- **Node.js 18+**
- A **PostgreSQL** database (developed against a Supabase session pooler; any Postgres 12+ works).
  Note: in the Saint Fox environment this database is **shared** with other internal systems
  (an HR/identity directory and an IT asset-management app both read/write tables in the same
  project) — the `UserS8`/`Employee` models below read from tables this app does not own.

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
| `DB_POOL_MAX` / `DB_POOL_MIN` | Sequelize connection pool size (keep conservative — the pooler is shared, see above) | `10` / `2` |
| `JWT_SECRET`   | secret used to sign session JWTs — **must** be a real random value, never left as the placeholder | *(long random string)* |
| `JWT_EXPIRES_IN` | session lifetime                                 | `24h`                                              |
| `SEED_USER_PASSWORD` | password given to every seeded user by `db:sync` | `changedesk123`                            |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Entra ID (Azure AD) app registration, for "Sign in with Microsoft" | — |
| `MICROSOFT_TENANT_ID` | Entra tenant (`common` for multi-tenant)      | `common`                                           |
| `MICROSOFT_REDIRECT_URI` | Must match the app registration's redirect URI | `http://localhost:5001/api/auth/microsoft/callback` |
| `FRONTEND_URL` | Where the Microsoft callback redirects back to with the issued token | `http://localhost:5174` |
| `MAIL_ENABLED` | `true` to actually send email (else it logs only) | `false`                                            |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | SMTP server (`SECURE=true` for port 465) | `smtp.example.com` / `587` / `false`  |
| `SMTP_USER` / `SMTP_PASS` | SMTP credentials                       | —                                                  |
| `MAIL_FROM`    | From header on outgoing mail                       | `ChangeDesk <no-reply@example.com>`                |
| `MAIL_APPROVER_FALLBACK` | inbox used if no active CAB Approver has an email | `cab-board@example.com`             |
| `APP_BASE_URL` | link target inside emails                          | `http://localhost:5174`                            |

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

Two terminals, from the repo root:

```bash
npm run server   # backend  -> http://localhost:5001
npm run dev      # frontend -> http://localhost:5174  (opens a browser)
```

The backend still starts if the database is unreachable, but DB-backed routes will return
`500`/`503` until the connection succeeds.

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

Backend-only scripts (run from `backend/`): `npm run db:sync`, `npm run db:sync:force`,
`npm run db:performance-indexes`.

---

## Data model

Key tables (Sequelize models in `backend/models/`):

| Model / table | Notes |
| --- | --- |
| `Role` | The 5 base application roles (see Roles below) |
| `ChangeRequest` | The Change Request lifecycle record — status, workflow, requester/approver, custom field values |
| `ChangeRequestApproval` | Per-approver decision on a change request (supports multi-stage approval) |
| `CatalogCategory` / `CatalogSubcategory` / `CatalogSubcategoryField` | The 2-level change catalog taxonomy and its dynamic form fields |
| `ChangeManagerCategory` / `ChangeImplementerCategory` | Which catalog categories a given Change Manager / Change Implementer is assigned to |
| `AuditLog` | Global audit trail, `actor_id` nullable (system-originated entries) |
| `AppConfig` | JSONB singletons for curated dashboard/report demo numbers |
| `PreSpendRequest` | Pre-Spend Request records |
| `TravelRequest` | Travel Desk records (multi-city itineraries) |
| `NotificationJob` | Async email queue — see Notifications below |
| `UserS8` | **Not owned by this app** — a Microsoft/Azure-linked identity table (`user`) shared with other Saint Fox systems |
| `Employee` | **Not owned by this app** — HR employee directory table (`employees`) shared with other Saint Fox systems |
| `UserAppRole` | This app's own mapping of a resolved identity → its ChangeDesk role |
| `ChangeUser` | A ChangeDesk-owned user record (name/email/role/status/`invitedBy`) — a growing alternative to resolving everything through `UserS8`/`Employee` |

Presentation fields the frontend expects (`riskColor`, `riskBars`, `statusBg`, `statusColor`,
`statusDot`, …) are **not stored** — `utils/serializers.js` adds them when shaping each response.

---

## Roles

Beyond the original four, the role model now includes module-scoped admin variants and a
board-level reviewer:

| Role | roleId | Notes |
| --- | --- | --- |
| Requester | `role-4` | Raise requests, track own submissions |
| Change Manager | `role-3` | Approve/reject CRs in their assigned catalog categories |
| Change Implementer | `role-5` | Implement approved CRs in their assigned categories |
| Admin | `role-2` | General admin |
| — Change Desk Admin | `role-2-change` | Admin scoped to the Change Request module |
| — Pre-Spend Admin | `role-2-prespend` | Admin scoped to Pre-Spend Request |
| — Travel Admin | `role-2-travel` | Admin scoped to Travel Desk |
| Super Admin | `role-1` | Full access, including Settings |
| Board | `role-board` | Cross-module reviewer |
| Employee | `role-employee` | Default identity with no ChangeDesk role assigned yet (blocked from worklist/admin routes) |

Route guards exist **both** server-side (`requireRole` in `middlewares/`) and client-side
(route wrapper components in `App.jsx` redirect unauthorized roles to `/dashboard`).

---

## API

Health check: `GET /api/health`

### Auth — `/api/auth`

| Method & path | Purpose |
| --- | --- |
| `POST /login` | `{ email }` → `{ token, user }`. **Email-only** — no password/OTP check today; treat as a development convenience, not production-grade auth, until it's gated behind SSO. |
| `GET  /me` | current user for the bearer token |
| `GET  /microsoft` | redirects to Microsoft Entra ID sign-in |
| `GET  /microsoft/callback` | Entra ID redirects here; issues a JWT and redirects to the frontend with `?token=` |

Every `/api/dashboard/*` route requires `Authorization: Bearer <token>`. The frontend attaches
it automatically; a `401` clears the session and returns to `/login`. A `503` means a transient
DB/pool issue, not an invalid session, and does **not** log the user out.

### Public (unauthenticated) — `/api/public`

| Method & path | Purpose |
| --- | --- |
| `GET  /change-request-action?token=` | Resolves a signed, time-limited action-link token from an approval email into the CR it targets |
| `POST /change-request-action` | `{ token, action: approve\|reject, comment }` — lets an approver act straight from the email without logging in |

### Dashboard / Change Requests — `/api/dashboard`

| Method & path | Purpose |
| --- | --- |
| `GET  /metrics` \| `/categories` \| `/status-breakdown` | dashboard KPI + chart data (`?scope=organization` for the org-wide view, Admin/Super Admin only) |
| `GET  /export` | dashboard data export |
| `GET  /users` | user directory lookup |
| `GET  /my-requests` | change requests, filterable (`status`, `dateFilter`, `search`) |
| `POST /change-requests` | create a change request / draft |
| `PATCH /change-requests/:id` | edit a draft (ownership-checked server-side) |
| `PATCH /change-requests/:id/submit` | submit a draft (ownership-checked server-side) |
| `GET  /catalog` \| `/catalog/categories` \| `/catalog/categories/:id/subcategories` \| `/catalog/subcategories/:id/fields` | change catalog browse |
| `POST /catalog/subcategories` | add a catalog subcategory (Super Admin) |
| `GET  /worklist` \| `/my-worklist` | CAB worklist (role-gated — see Roles) |
| `POST /worklist/action` | `{ id, action: approve\|reject\|sendback }` |
| `POST /worklist/comment` | add a comment to a change request |
| `GET  /settings/users` \| `/settings/roles` \| `/settings/audit-logs` | Super Admin only |
| `POST /settings/users` | invite a user |
| `PATCH /settings/users/:id` \| `/settings/roles/:id` | update a user / role permissions |
| `POST /settings/audit-logs/export` | export the audit log |
| `GET`/`PUT /settings/change-manager-categories/:userId` \| `/settings/change-implementer-categories/:userId` | manage a user's assigned catalog categories |

### Pre-Spend Request — `/api/dashboard/pre-spend`

| Method & path | Purpose |
| --- | --- |
| `GET  /` | list pre-spend requests |
| `GET  /past-vendor` | past-vendor lookup |
| `POST /` | create a pre-spend request |
| `POST /action` | approve/reject a pre-spend request |

### Travel Desk — `/api/dashboard/travel-desk`

| Method & path | Purpose |
| --- | --- |
| `GET  /` | list travel requests |
| `POST /` | create a travel request (multi-city itineraries supported) |
| `POST /action` | approve/reject a travel request |

Response envelope: `{ success: true, data }` (lists add `count`/`total`); writes return
`{ success: true, message, data }`. Errors return `{ success: false, message }` with an
appropriate status code — `503` specifically means "transient, retry," not "your session is invalid."

### Notifications (`backend/services/notificationQueue.service.js`)

Outbound email for all three modules goes through a shared, persisted job queue
(`NotificationJob` model) rather than being sent inline from request handlers: `enqueueNotification(...)`
writes a `pending` row, and a background worker (started from `server.js`, polling every 15s)
claims up to 10 jobs at a time with a 5-minute lease lock and retries up to `max_attempts`.
This replaces the older fire-and-forget `mailService` calls that used to live directly in controllers.

---

## Notes

- **Auth** is currently email-only (no password check) *or* Microsoft Entra ID SSO — see the
  Auth API table above. The acting user for audit logs / CR creation is the signed-in user,
  resolved via `IdentityResolver` against the shared `UserS8`/`Employee` tables and this app's
  own `UserAppRole`/`ChangeUser` records.
- Routing is real client-side routing (`react-router-dom`), not the older state-switched
  "activeItem" pattern — URLs are shareable and back/forward works.
- Data fetching on the frontend goes through TanStack Query (`src/queries/`), not manual
  `useEffect` polling.
- `dashboard_stats` and the `*_breakdown` / `*_volume` curated numbers still exist for some
  demo chart data — not everything is a live aggregate over the request tables yet.
- **Catalogue Management (admin) and the Reports & Analytics page have been removed** from
  this codebase (not just hidden) as part of the September 2026 restructuring. If you're
  looking for either, they no longer exist here.
- No automated tests exist yet in either package.
