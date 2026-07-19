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

- Real boundary = Supabase **RLS + `SECURITY DEFINER` RPCs**. Client code is not a security layer — the browser holds the publishable anon key + the user's own JWT, so it can call Supabase directly (bypassing the Next.js server and every Server Action guard) via browser devtools. **`requireAdmin()` checks in Server Actions are defense-in-depth, not the boundary — RLS is.**
- Only `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable) reach the browser. **Never** put the service_role key client-side.
- Money (net revenue, VAT, expense totals, payslip figures) is **recomputed server-side** (Server Actions / `lib/payslip.js` `computePayslip()`) — never trust client-sent totals.
- Auth: login is a Server Action (also checks `profiles.is_active`); `middleware.js` guards every route; pages use `requireSession()` (`lib/session.js`, also re-checks `is_active` and signs out disabled accounts).
- **`lib/perms.js` role-visibility matrix (`role_perms`) is UI-only** — it hides nav tabs, it does not restrict data access. Do not treat it as an access-control mechanism; RLS is what actually gates reads/writes.
- **Run `harden_security.sql` (repo root) in Supabase SQL Editor if not already applied** — fixes a profiles self-role-escalation gap (`profiles: update own` had no column restriction, so any logged-in user could set their own `role` to `'admin'` via a direct Supabase call) and restricts a few sensitive `business_config` keys (`role_perms`, `form50_payees`, `emp_pay_history`, `opex_defaults`) + `audit_log` reads to admin only. See the file's comments for a documented, commented-out optional tightening of `sales_daily`/`expenses` UPDATE to exclude `staff` (a business-trust-model tradeoff, not applied by default since the app intentionally lets any role fix its own entries).
- `audit_log` (with `old_data`/`new_data`, trigger-populated, `SECURITY DEFINER` so it can't be forged by clients) already tracks every INSERT/UPDATE/DELETE on `sales_daily` and `expenses` — useful for detecting/investigating tampering after the fact. No UI reads it yet (candidate follow-up feature).

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

**Ported ✅:** sales entry (+delete), expense entry (+edit/delete, supplier-first for materials, DB last-price + unit memory catalog, client-side instant category switch, unit presets), OPEX 3 categories, rent WHT, VAT-auto, payslip calculator + print slip, monthly report + 2 charts, Excel export, user management, business info settings (`/settings` → `business_config.biz_info`, feeds the print slip), **Excel import** (`/settings`, admin-only, sales/expense via `exceljs`; matches the exported Thai-header format, dd/mm/yyyy incl. พ.ศ.).

Also ported ✅: **Analytics** (`/analytics`) — defaults to current year (Jan→current), with a manual from/to month range; income/expense/profit table + MoM %, signed profit trend chart, **top materials by spend & by order count**, and top suppliers. Dashboard shows 6 KPI tiles (income/expense/profit + cups/pastry/free-cups).

Also ported ✅: **bakery presets** (`lib/bakery.js`, auto-fill default price), **admin data tools** (`/settings`: delete-month, dedup — admin, double-confirm), **role-visibility matrix** (`/settings` → `business_config.role_perms`; `lib/perms.js` + `requireSession().allowed` filters nav tabs per role; admin always full — visibility only, RLS still the real guard), **payroll remittance summary** (สปส. + ภ.ง.ด. [rent 5% + staff-sub 3% + commission 3%] + ภ.พ.30 — for the accounting office), staff_sub 3% WHT breakdown, employee detail fields (name/title/ID/bank) on the slip.

**Payroll formula is verified identical to legacy `calEmpTotal`.** SSO 5% each side on min(salary,15000); commission = income×rate; commission WHT 3%; company cost = gross + companySSO.

Also ported ✅: **Form 50 ทวิ** (`app/opex/form50.js`) — withholding-tax certificate for rent 40(5)ก 5% and staff-sub 40(2) 3%; enter payee (name/tax id/address/date/condition, saved to `business_config.form50_payees`), print an HTML certificate with correct Thai baht-text.

Also ported ✅: **free-cup unit-cost config** (`/settings` → `business_config.biz_info.free_cup_cost`, default 55, feeds the sales form's default coffee price), **material/bakery price history** (expense form catalog now carries up to 8 recent price points per item+category; "ประวัติราคา" toggle shows date+price), **editable OPEX defaults** (`/settings` → `business_config.opex_defaults`, admin; overrides the static placeholders/pre-filled values in `lib/opex.js`'s `OPEX_OPERATING`/`OPEX_STAFF` items via `defFor()` in `opex-form.js`).

Also ported ✅: **employee pay-history + reprint** (`lib/payslip.js` exports `computePayslip()` shared by client and server so recorded numbers are authoritative; `saveOpexAction` recomputes each paid employee's payslip server-side using its own month-income query and upserts an entry — keyed `emp{n}`, deduped by month, max 60/employee — into `business_config.emp_pay_history`; `/opex` shows a "ประวัติ" panel per employee with totals + a "พิมพ์ซ้ำ" button that reconstructs the certificate using that month's historical salary/position/diligence/payslip numbers plus the employee's *current* personal/bank details; same >6-months-requires-admin gate as regular slip printing).

Also ported ✅: **free-cup promo evidence upload** (`app/sales/sales-form.js`) — when `free_cups > 0`, an image/PDF file input uploads to Supabase Storage bucket `evidence` (path `free_cups/{date}_{ts}.{ext}`) via the browser client, stores the public URL in `sales_daily.free_cup_evidence_url` through `upsert_sales_daily`. **Requires `add_free_cup_actual_cost.sql` (repo root) to have been run in the Supabase SQL editor** — it adds the column, updates the RPC to accept/coalesce the URL, and creates the `evidence` bucket + RLS policies (authenticated insert, public read). Until run, uploads fail with a friendly "ยังไม่ได้รัน add_free_cup_actual_cost.sql" hint (same pattern as legacy) and the URL is silently dropped from the save payload (harmless no-op against the currently-deployed RPC).

Also ported ✅: **user activate/deactivate** (`/admin`, admin-only `toggleActiveAction`) — a lighter-weight alternative to deleting a user; `requireSession()`/login now enforce `profiles.is_active`, signing out and blocking access immediately when a user is deactivated (previously the column existed but was never checked, so a "deactivated" user could still use the app).

**Migrations to run once (if not already applied):**
- `add_free_cup_actual_cost.sql` — needed only for the free-cup evidence upload above; everything else in this app works against the schema already in `supabase_migration.sql`.
- **`harden_security.sql` — security fix, recommend running regardless of which features you use.** See "Security model" above.

Feature parity with the legacy dashboard is now complete for practical purposes — no remaining tracked gaps.

See memory `[[marim69-migration]]` for ongoing plan.
