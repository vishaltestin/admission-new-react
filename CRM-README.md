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
| Reports | `/reports` — 4 reports with date filters + CSV export (`report-actions.ts`) | ✅ Phase 3 |
| `LeadIntegrationController`, `LeadWebhookController` | `/integrations` — provider credentials, per-org token, `/api/integrations/ingest/[provider]` (token auth, duplicate check, source resolution, `lead_webhook_logs`), outgoing `webhooks` CRUD | ✅ Phase 3 |
| `AutomationRuleController` + `RunLeadAutomations` | `/automation` + `lib/automation/engine.ts` (conditions + ordered actions incl. fire_webhook; status-change actions write directly — no recursion), `automation_rule_logs` audit | ✅ Phase 3 |
| Email/SMS/WhatsApp send flows | "Send message" dialog on `/leads/[id]` → `lib/messaging.ts` (template `{{variable}}` render, SMTP via nodemailer + `email_settings` — otherwise queued; logs to `email_logs`/`sms_logs`/`whatsapp_logs`) | ✅ Phase 3 |
| Laravel `MailSettingController` | Integrations → "Email (SMTP)" tab | ✅ Phase 3 |
| `WebFormController` (+ attributes) | `/webforms` — list/create + visual builder (fields, masters, theme colors); public capture at `/f/{formId}` (noindex), iframe embed (`?embed=1`), CORS-ready `POST /api/public/forms/{formId}`; view/submit counters + conversion % | ✅ Phase 4A |
| `LandingPageController` (+ sections) | `/landing-pages` — hero/features/about form editor, campaign link, embedded webform; public indexable page at `/p/{slug}` with view tracking | ✅ Phase 4A |
| `CouponController` | `/coupons` — flat/percent codes, min order, discount cap, validity window, single/multiple usage + limit; `previewCoupon`/`redeemCoupon` quote+redemption engine w/ `coupon_usages` audit | ✅ Phase 4A |
| `ApplicationFormController` (OTP, payments, documents) | — | Phase 4B |
| Custom fields editor (`extra_fields_json`), advanced XLSX imports, PWA, cookie consent | — | Phase 4B |

## Data model

`prisma/schema.prisma` covers 43 tables ported from the Laravel dump
(`db-.sql`), incl. organizations, users/roles (Sentinel-style `role_users`),
leads with status/sub-status/source/type/campaign/institute/program,
notes, communication + activity logs, teams, geo masters, templates,
`lead_uploads`, integrations and `lead_webhook_logs`; Phase-3
(`20251014150000_phase3`): `webhooks`, `automation_rules` +
`automation_rule_logs`, `email_logs`/`sms_logs`/`whatsapp_logs`,
`email_settings`; Phase-4A (`20251014180000_phase4a`): `web_forms` +
`web_form_attributes`, `landing_pages` + `landing_page_sections`,
`coupons` + `coupon_usages`.

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

## Phase 4B roadmap

1. Application forms (multi-step, OTP verification, payment gateway, documents).
2. Custom fields editor (`extra_fields_json` per lead).
3. Advanced imports (XLSX, mapping UI).
4. PWA manifest, cookie consent, maintenance mode parity with the Laravel app.
