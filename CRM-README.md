# DF CRM — Next.js port

A port of the Laravel application [`vishaltestin/df-laravel-crm`](https://github.com/vishaltestin/df-laravel-crm)
into this repo's tech stack: **Next.js 16 (App Router) + React 19 + Prisma 7
(@prisma/adapter-mariadb) + Auth.js v5 + Tailwind CSS 4 + shadcn/ui**.

## Design rules (kept throughout)

- **shadcn/ui everywhere** — sidebar (`components/ui/sidebar`), dialogs for
  all master CRUD, alert-dialog confirms for destructive actions, sonner
  toasts, tables, tabs, badges, selects, switches.
- **react-hook-form + zod for every form** — each form has a client-side
  string-safe schema (used via `zodResolver`) *and* a server-side schema in
  `lib/validations/` that re-validates and coerces inside the server action.
  Server validation failures are mapped back onto the form fields.
- **Server actions for every mutation** (`lib/actions/*`) — actions accept
  `unknown`, validate with zod, scope writes to the caller's organization and
  revalidate affected paths.
- **snake_case parity in MySQL** — Prisma models map to the Laravel table and
  column names (`@@map` / `@map`), so the generated database stays compatible
  with the legacy schema and the old dump can be imported table-by-table.

## Module map (Laravel → Next.js)

| Laravel | Next.js | Status |
|---|---|---|
| `LoginController` (Sentinel) | `/login`, Auth.js credentials + `proxy.ts` guard | ✅ Phase 1 |
| `DashboardController` | `/dashboard` (stats, status distribution, top sources, follow-ups) | ✅ Phase 1 |
| `LeadController` (list/detail/edit/delete) | `/leads`, `/leads/new`, `/leads/[id]`, `/leads/[id]/edit` | ✅ Phase 1 |
| Notes / status change / assignment / comm log | widgets on `/leads/[id]` + activity timeline | ✅ Phase 1 |
| `LeadStatusSettingController`, `LeadSourceController`, `LeadTypeController`, `InstituteManagerController`, `ProgramController` | `/masters` (6 tabs with dialog CRUD) | ✅ Phase 1 |
| `UserController`, `RoleController` | `/users`, `/roles` | ✅ Phase 1 |
| `LeadPipelineController` (`update-pipeline`) | `/leads/pipeline` — dnd-kit kanban (`moveLeadToStatus`) | ✅ Phase 2 |
| `LeadController@upload*` (+ `leads/upload/sample`, logs) | `/leads/import` — CSV import with row-level zod validation, duplicate detection, `lead_uploads` log | ✅ Phase 2 |
| `EmailTemplateController`, `MessageTemplateController`, `WhatsappTemplateController` | `/templates` — 3 channel tabs, `{{variable}}` chips | ✅ Phase 2 |
| `CampaignController`, `MarketingEventController` | `/campaigns` — campaigns + marketing event tabs | ✅ Phase 2 |
| `TeamController` | `/teams` — head + members checkbox list | ✅ Phase 2 |
| Reports | `/reports` | Phase 3 |
| `LeadIntegrationController`, `LeadWebhookController` | integrations UI + `/api/integrations/*` ingestion + `lead_webhook_logs` | Phase 3 |
| `AutomationRuleController` + `RunLeadAutomations` | `/automation` + action runner | Phase 3 |
| `WebFormController`, `LandingPageController`, `ApplicationFormController` | — | Phase 4 |
| Coupons (`CouponController`), documents, PWA, cookie consent | — | Phase 4 |

## Data model

`prisma/schema.prisma` covers 30 tables ported from the Laravel dump
(`db-.sql`), incl. organizations, users/roles (Sentinel-style `role_users`),
leads with status/sub-status/source/type/campaign/institute/program,
notes, communication + activity logs, teams, geo masters, templates,
`lead_uploads`, integrations and `lead_webhook_logs`.

Passwords are **bcrypt** — compatible with hashes produced by
Laravel's `Hash::make`, so existing rows from the old `users` table can be
imported directly.

## Setup

```bash
cp .env.example .env       # set DATABASE_URL (mysql://user:pass@host:3306/db)
npx auth secret            # generate AUTH_SECRET (or: openssl rand -base64 32)
npm install
npm run db:deploy          # apply prisma/migrations
npm run db:seed            # demo data: org, roles, users, masters, 40 leads
npm run dev
```

Seeded logins (password `Admin@123`): `admin@dfcrm.com` (Admin),
`manager@dfcrm.com` (Manager), `priya@dfcrm.com`, `amit@dfcrm.com` (Counselors).

Useful scripts: `db:generate`, `db:push`, `db:migrate`, `db:deploy`, `db:seed`,
`typecheck`, `lint`.

## Directory guide

```
app/(auth)/login           sign-in page
app/(dashboard)            sidebar-protected app (dashboard, leads, masters, ...)
app/api/auth/[...nextauth] Auth.js route handlers
components/crud.tsx        shared dialog CRUD helpers (RHF + zod wiring)
components/layout          app sidebar, nav user, theme toggle
components/leads           tables, filters, forms, kanban board, import
lib/actions/*              zod-validated server actions per module
lib/validations/*          server + client zod schemas
prisma/                    schema, migrations, seed
proxy.ts                   Next.js 16 proxy (auth guard, edge-safe config)
auth.ts / auth.config.ts   Auth.js: Node config + edge-safe split
```

## Phase 3 roadmap

1. Reports (assignment report, communication report, source spend).
2. Incoming webhooks/API ingestion (`lead_integrations`, `lead_webhook_logs`)
   + outgoing webhook management (`webhooks` table).
3. Automation rules (`automation_rules`) + a server action runner.
4. Channel send flows (email/SMS/WhatsApp logs) wired to templates.
