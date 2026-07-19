# CLAUDE.md — Minimal Maerim (marim69) coffee-shop system

Maintained by Claude. **Update this file after every change** to the project.

## Two apps, one database

| | Legacy | New (active) |
|---|---|---|
| Code | `minimal_marim69_dashboard.html` (single ~1 MB file, vanilla JS) | `marim69-next/` (Next.js 15 + React 19 + `@supabase/ssr`) |
| Status | superseded (kept as rollback fallback in `/var/www/minimalcnx` on VPS) | **live in production** |
| Domain | — | `minimalcnx.ddserviceth.com` (prod) + `minimal.ddserviceth.com` (staging) — both proxy to the same Docker container |

**Shared backend:** Supabase project `fkhfrylvronkmktlmmia`. Same tables (`sales_daily`, `expenses`, `profiles`, `business_config`) and RPCs (`upsert_sales_daily`, `upsert_opex_item`, `get_monthly_summary`, `admin_*`). The new app does **not** change the schema. SQL lives in `*.sql` at repo root.

## Security model (do not weaken)

- Real boundary = Supabase **RLS + `SECURITY DEFINER` RPCs**. Client code is not a security layer.
- Only `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable) reach the browser. **Never** put the service_role key client-side.
- Money (net revenue, VAT, expense totals) is **recomputed in Server Actions** — never trust client values.
- Auth: login is a Server Action; `middleware.js` guards every route; pages use `requireSession()` (`lib/session.js`).

## Run / build / deploy

- Local: `cd marim69-next && npm install && npm run dev`
- Build check: `npm run build` (standalone output; Docker uses it)
- **Deploy to VPS (one line, run ON the VPS):** `cd ~/apps/marim69-next && git pull && cd marim69-next && bash deploy.sh`
  - VPS authenticates to GitHub via a **read-only deploy key** (not a token). Container binds `127.0.0.1:3001`; nginx proxies. Cutover + rollback details in `marim69-next/CUTOVER.md`.

## Domain formulas (keep identical to legacy)

- Delivery GP rates: shopee 0.3424, grab/lineman 0.321. `net = raw × (1 − rate)`. (`lib/gp.js`)
- `sales_daily.net_revenue` = kshop + cash + delivery(after GP). Pastry & free-cup cost stored separately.
- Expense VAT 7%: `total = price × 1.07 × qty` when VAT on (baked into `total_amount`, not stored separately).
- OPEX rent WHT: pay owner 95%, withhold 5% (remit to Revenue Dept). Stored amount = full rent.
- OPEX VAT-auto suggestion = month net sales × 7%.
- Payroll (`payslip()` in `app/opex/opex-form.js`): SSO 5% of min(salary,15000) for employee AND company; commission = income × rate; commission tax 3%; gross = salary+position+commission+diligence; net transfer = salary−ssoEmp+position+diligence+(comm−commTax); **saved OPEX amount = companyCost = gross + companySSO**.
- Employee defaults (`DEFAULT_EMPLOYEES`, `lib/opex.js`): emp1 13000/1500, emp2 12000/0; salary_dir default 36000. Payslip inputs persist in `localStorage` (`mm69_emp_slip`).

## App structure (`marim69-next/`)

- `app/` — `login`, `dashboard`, `sales`, `expenses`, `opex`, `reports`, `admin`, `export` (xlsx Route Handler)
- `components/` — `app-shell`, `app-nav`, `sign-out-button`, `page-header`
- `lib/` — `supabase/{client,server,middleware}`, `session`, `format`, `gp`, `opex`, `expense-categories`, `suppliers` (curated supplier→item catalog)
- Design: Swiss/minimalist tokens in `app/globals.css` + warm taupe/beige accents; Tabler icons via CDN.

## Feature status vs legacy

**Ported ✅:** sales entry (+delete), expense entry (+edit/delete, supplier-first for materials, DB last-price catalog), OPEX 3 categories, rent WHT, VAT-auto, payslip calculator + print slip, monthly report + 2 charts, Excel export, user management, business info settings (`/settings` → `business_config.biz_info`, feeds the print slip), **Excel import** (`/settings`, admin-only, sales/expense via `exceljs`; matches the exported Thai-header format, dd/mm/yyyy incl. พ.ศ.).

Also ported ✅: **Analytics** (`/analytics`) — 12-month income/expense/profit table + MoM % + signed profit trend chart (calls `get_monthly_summary` per month).

**Not yet ported ⏳ (minor/niche):**
- Role-based visibility matrix (per-role permissions)
- Admin data tools: delete-whole-month, deduplicate-month
- Bakery preset prices (`BAKERY_DEFAULTS`), free-cup promo evidence upload (Supabase Storage)

See memory `[[marim69-migration]]` for ongoing plan.
