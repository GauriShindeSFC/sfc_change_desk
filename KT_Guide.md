# ChangeDesk — Knowledge Transfer Guide

A walkthrough of **what this application is**, **the process it models**, **how the
code is put together**, and **what still needs to be built**. Pair this with
[`README.md`](README.md) (setup, scripts, schema reference).

---

## 1. What it is

**ChangeDesk** is an IT **Change Management** portal — the tool an organisation uses
to propose, review, approve, and track changes to production systems (deployments,
patches, network/firewall edits, access grants, hardware swaps, emergency fixes).

It follows the ITIL-style **Change Advisory Board (CAB)** model:

- A **Requester** raises a *Change Request* (CR) from a catalog template.
- The CR is routed to an approval **Workflow** based on its category.
- One or more **CAB Approvers** review it and **approve / reject / send it back**.
- Approved changes move through **scheduling → implementation → closure**.
- Every action is written to an **audit log**; dashboards and reports summarise volume,
  approval rate, and SLA compliance.

### Personas / roles (`roles` table)

| Role              | Can do                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| **Requester**     | Raise CRs, save drafts, track their own submissions                      |
| **CAB Approver**  | Review CRs routed to their board; approve / reject / request more info   |
| **Change Manager**| Oversee the whole lifecycle, manage catalog templates, override CAB      |
| **Admin**         | Everything + user / role / workflow / settings administration            |

> Today every signed-in user sees every menu item. Role-based access (hiding nav +
> enforcing permissions on the API) is on the to-build list — see §5.

---

## 2. The change lifecycle

```
 Draft ─▶ Submitted ─▶ CAB Review ─▶ Approved ─▶ Scheduled ─▶ Implemented ─▶ Closed
                            │
                            ├─▶ Rejected            (dead end)
                            └─▶ Sent back ─▶ Draft  (requester revises & resubmits)
```

### How the app represents it

| Lifecycle stage        | `change_requests.status` | Where you see it |
| ---------------------- | ------------------------ | ---------------- |
| Draft (not submitted)  | `Draft`                  | My Requests |
| Submitted / CAB review | `Pending`                | **My Worklist** (approver view) + My Requests |
| Approved by CAB        | `Approved`               | My Requests, Dashboard |
| Being implemented      | `In progress`            | My Requests, Dashboard |
| Rejected               | `Rejected`               | My Requests |
| Completed / cancelled  | `Closed`                 | My Requests |

The **CAB worklist is not a separate table** — it is simply
`SELECT * FROM change_requests WHERE status = 'Pending'`.

### Workflows (`workflows` table)

Each catalog template points at one workflow (`catalog_items.workflow_id`). The
workflow defines the ordered steps a CR of that category goes through:

| Workflow                    | Steps                                                                 | Used by (derived) |
| --------------------------- | ------------------------------------------------------------------- | ----------------- |
| Standard Change Workflow    | Draft → Submitted → CAB Review → Approved → Scheduled → Implemented → Closed | Software Deployment, Network Change, Hardware Change, DB Schema Change, SSL Renewal, Vendor Integration |
| Expedited Workflow          | Draft → Submitted → CAB Review (4 hr SLA) → Approved → Implemented → Closed  | Server Patching, Emergency Change |
| Lightweight Access Workflow | Draft → Submitted → Manager Approval → Implemented → Closed          | Access & Permissions |

---

## 3. Screens & what each does

| Screen | Purpose | Backing endpoint(s) |
| ------ | ------- | ------------------- |
| **Login** | Email + password → JWT session (Microsoft SSO planned) | `POST /api/auth/login`, `GET /api/auth/me` |
| **Dashboard** | KPI cards + recent change requests | `/metrics`, `/categories`, `/status-breakdown` |
| **Change Catalog** | Browse pre-defined change types; "Use template" starts a request | `/catalog` |
| **Change Request** (form) | 3-section form → creates a CR (or a draft) | `POST /change-requests` |
| **My Requests** | All CRs (filter by status); open a CR detail modal | `/my-requests` |
| **My Worklist** | The current approver's pending queue; approve / reject / send back | `/worklist`, `POST /worklist/action` |
| **Catalogue Management** | Admin view of templates + workflows | `/catalogue-management`, `POST /catalogue-management/item` |
| **Reports** | Approval rate, lead time, monthly volume, volume by department | `/reports/metrics` |
| **Settings** | Users (with role) · Roles (with derived user counts) · Audit logs | `/settings/users`, `/settings/roles`, `/settings/audit-logs` |

### Request flow (end to end)

```
Browser page
  └─ apiFetch('/x')                 frontend/src/lib/apiFetch.js  (adds Bearer token, base URL)
       └─ Express route              backend/routes/*.js
            └─ requireAuth           backend/middlewares/auth.js  (verifies JWT, sets req.user)
                 └─ controller       backend/controllers/*.js     (thin; shapes the HTTP response)
                      └─ service     backend/services/*.js        (all DB reads/writes, transactions)
                           └─ model  backend/models/index.js      (Sequelize + associations)
                                └─ serializer  utils/serializers.js  (row + joins → the JSON the UI expects)
```

Every `POST` runs in a transaction and appends an `audit_logs` row with
`actor_id = req.user.id`. Creating a CR or acting on the worklist also bumps the
counter blobs in `app_config`.

---

## 4. Data model (relationships)

11 tables. The important links:

```
roles ◄─────────── role_id ──────────── users
                                          │
users ◄────── requester_id ──┐            │
users ◄────── approver_id ───┤  change_requests ──── workflow_id ──►┐
users ◄────── actor_id ── audit_logs                                │
                                                        workflows ◄─┤
                             catalog_items ──── workflow_id ────────┘
```

Derived, not stored: `roles.usersCount` (`COUNT(users)`), `workflows.usedBy`
(from `catalog_items`), the worklist (pending CRs), and every `*Date` display
string (from `submitted_at` / `closed_at`). Full column reference is in
[`README.md`](README.md#database-model).

---

## 5. Authentication — current state and the SSO plan

### Now (email + password)

- `users.password_hash` (bcrypt) + `users.auth_provider = 'local'`.
- `POST /api/auth/login` → validates, returns a **JWT** (`sub = user.id`, 7-day expiry,
  signed with `JWT_SECRET`).
- Frontend stores `{ token, user }` in `localStorage` (`changedesk.session`);
  `apiFetch` attaches `Authorization: Bearer <token>`; a `401` clears the session.
- `requireAuth` middleware guards **all** `/api/dashboard/*` routes.
- Seed users all share the password from `SEED_USER_PASSWORD` (default `changedesk123`).

### Later (Microsoft Entra ID / Azure AD SSO)

The seams are already in place:

1. Add routes `GET /api/auth/microsoft` and `GET /api/auth/microsoft/callback`
   (stubs noted in `backend/routes/auth.js`) using MSAL / OpenID Connect.
2. In the callback: look up the user by email (`authProvider = 'microsoft'`),
   create the row if it doesn't exist, then call the **existing**
   `issueToken(user)` — nothing downstream changes.
3. Frontend: wire the disabled **"Continue with Microsoft"** button on the login
   page to `window.location = `${AUTH_BASE_URL}/microsoft``; keep the
   email/password form as a fallback or remove it.
4. Map Entra ID groups → `roles` on first login.

---

## 6. What still needs to be built

### Access control
- [ ] Role-based navigation (hide menu items a role can't use).
- [ ] Server-side authorization — a Requester must not be able to call `POST /worklist/action`; only assigned approvers can act on a CR.
- [ ] Microsoft Entra ID SSO (see §5) + group→role mapping.

### Change lifecycle (beyond CAB approval)
- [ ] **Scheduling**: change calendar / maintenance windows, blackout & freeze periods, conflict detection.
- [ ] **Implementation**: implementation plan + checklist, assignee, start/stop, actual vs planned window.
- [ ] **Closure**: closure codes (successful / with issues / failed / cancelled), Post-Implementation Review (PIR).
- [ ] **Rollback plan** captured as a required field; **attachments / evidence** upload.
- [ ] Resume & edit **drafts** (currently create-only).

### Approvals
- [ ] Multi-approver CAB with quorum; parallel vs sequential approval chains.
- [ ] Approver **delegation** / out-of-office.
- [ ] **SLA timers** per workflow with escalation when breached.
- [x] **Email on submit** — CAB approvers + manager are notified when a CR is raised (`backend/services/mailService.js`, `nodemailer`/SMTP, config in `.env`).
- [x] **Invite email** — `POST /settings/users` creates the user and emails them a temp password + sign-in link.
- [ ] **Notifications** — extend to decision (approve/reject/send-back), SLA breach, and Microsoft Teams.
- [ ] Replace the temp-password invite with a one-time **set-password / activation token** link (moot once SSO lands).
- [ ] Per-CR **comment thread** and a per-CR **activity timeline** (today the audit log is global only).
- [ ] Bulk actions on the worklist.

### Catalog & workflow
- [ ] Working "New template" / "Edit template" / "New workflow" (buttons are inert).
- [ ] Visual **workflow builder** (steps, approvers, SLAs per step).
- [ ] Auto-route category → workflow on submit (the link exists via `catalog_items.workflow_id`; the form doesn't use it yet).
- [ ] Change types: **Standard** (pre-approved, auto-approve), **Normal**, **Emergency**.

### Integrations
- [ ] Link CRs to **Incidents / Problems** and to **CMDB assets / CIs**.
- [ ] Link to **releases / deployments** (CI/CD).

### Reporting
- [ ] Replace curated numbers (`dashboard_stats`, `*_breakdown`, `*_volume`) with real aggregates over `change_requests`.
- [ ] Real **PDF / Excel export** (endpoints are stubs today).
- [ ] KPIs: change success rate, % emergency changes, failed changes that caused incidents, first-time approval rate.

### Platform / engineering
- [ ] **Search** — the header search box is not wired up.
- [ ] Pagination / sorting / server-side filtering on list endpoints.
- [ ] Move schema management from `sequelize.sync()` to **migrations** for non-dev environments.
- [ ] Automated **tests** (none exist) + CI.
- [ ] Structured request logging + error tracking.
- [ ] Rate-limit `/api/auth/login`; refresh-token rotation; `HttpOnly` cookie option instead of `localStorage`.
- [ ] Remove the checked-in `frontend/dist/`.

---

## 7. Running it

```bash
# one-time
npm run install:backend && npm run install:frontend
cp backend/.env.example backend/.env      # fill in DATABASE_URI, JWT_SECRET
cp frontend/.env.example frontend/.env
cd backend && npm run db:sync:force        # create tables + seed (incl. user passwords)

# every day (two terminals, from repo root)
npm run server     # http://localhost:5001
npm run dev        # http://localhost:5174
```

**Demo credentials** (all seed users, password from `SEED_USER_PASSWORD`, default `changedesk123`):

| Email                       | Role           |
| --------------------------- | -------------- |
| `gauri.shinde@company.com`  | Change Manager |
| `priya.nair@company.com`    | Requester      |
| `arjun.mehta@company.com`   | CAB Approver   |
| `sana.iqbal@company.com`    | Admin          |
| `rahul.verma@company.com`   | Requester *(Inactive — login blocked)* |
