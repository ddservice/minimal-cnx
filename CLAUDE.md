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
- **Run `harden_security.sql` (repo root) in Supabase SQL Editor if not already applied — it's idempotent, safe to re-run any number of times.** Fixes, in order: (1) profiles self-role-escalation — `profiles: update own` had no column restriction, so any logged-in user could set their own `role` to `'admin'` via a direct Supabase call; now a trigger blocks self-changes to `role`/`is_active` unless already admin; (2) `business_config` writes tiered by key — `role_perms`/`form50_payees`/`opex_defaults` admin-only, `emp_details` admin+co-admin, everything else (`biz_info`, `emp_pay_history`, etc.) unchanged/open; (3) `audit_log` reads restricted to admin; (4) `sales_daily`/`expenses` UPDATE restricted to admin/co-admin/manager (excludes `staff` — staff can still INSERT new entries, just not edit existing ones).
- **⚠️ RLS gotcha discovered 2026-07-19: Postgres RLS `UPDATE ... USING` (no `WITH CHECK`) fails silently, not loudly.** If a row already exists and the caller's role fails the `USING` clause, the UPDATE matches **zero rows** — no error, `error` stays `null`. `.upsert()` calls that don't `.select()` can't even detect this, so a blocked save just looks like "the button does nothing." All `business_config` upserts now go through `lib/config-store.js` `upsertBusinessConfig()`, which `.select('key')` and treats an empty result as a permission error. **Any new `business_config` write must use this helper**, not a bare `.upsert()`. Also: `emp_pay_history`'s RLS tier must always match whatever role can trigger `saveOpexAction` (currently any authenticated user) — restricting it tighter than that silently breaks pay-history recording for non-admin OPEX saves, which is exactly what happened before this fix. UI now also disables (not just hides) `emp_details`/`form50_payees` edit fields for roles that can't save them, so the mismatch fails visibly and early instead of silently at submit time.
- `audit_log` (with `old_data`/`new_data`, trigger-populated, `SECURITY DEFINER` so it can't be forged by clients) tracks every INSERT/UPDATE/DELETE on `sales_daily` and `expenses`. Viewable at **`/admin/audit`** (admin-only) — filterable by table/action, shows who + when + a diff of changed fields per row; useful for detecting/investigating tampering after the fact.
- Password minimum length is `MIN_PASSWORD_LENGTH` in `lib/auth-policy.js` (currently 8), enforced in `createUserAction`/`resetPasswordAction`. **Also set the same (or higher) minimum in Supabase Dashboard → Authentication → Providers → Email → Minimum password length** — the app-side check alone doesn't constrain Supabase Auth itself.

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
- `components/` — `app-shell`, `sidebar`, `sign-out-button`, `page-header`, `data-table`, `kpi`, `date-field`
- `lib/` — `supabase/{client,server,middleware}`, `session`, `format`, `gp`, `opex`, `expense-categories`, `suppliers` (curated supplier→item catalog), `config-store`
- Design: see "Design system" below.

## Design system (2026-07-20 redesign — soft/modern, sidebar layout)

**Everything is driven by CSS custom properties defined once at the top of `app/globals.css` (`:root`).** To retheme the whole app, edit values there only — never hardcode a color/radius/shadow in a component.

- **Brand tokens:** `--color-primary` (coffee, primary actions/active states), `--color-accent` (taupe, highlights/focus). Swap these two to rebrand entirely.
- **Neutrals:** `--color-bg` (page canvas), `--color-surface`/`--color-surface-2`, `--color-border`, `--color-text`/`--color-text-muted`.
- **Radius scale:** `--radius-sm` (8px) / `--radius-md` (12px, default for cards/inputs/buttons) / `--radius-lg` (16px, cards/login) / `--radius-full` (pills/badges/chips). This is *the* lever for "soft vs boxy" — the previous Swiss-style redesign used a flat 2px everywhere, which read as rigid; this pass replaced it app-wide.
- **Shadow scale:** `--shadow-sm`/`--shadow-md`/`--shadow-lg` — soft, layered, multi-stop shadows instead of hard 1px borders for depth.
- **Legacy aliases:** `--coffee`, `--taupe`, `--border`, `--surface`, etc. all map onto the tokens above, so the many components using inline `style={{ ...: 'var(--coffee)' }}` continue to work without edits.
- **Inline-style radius:** components still use inline `style={{}}` objects (not just `className`) for layout-specific spacing — but every `borderRadius` value in those objects is `'var(--radius-md)'` (or `--radius-full` for true pills), never a hardcoded number. Grep for `borderRadius: [0-9]` before adding new inline styles — if you find a literal number, that's a bug, use a token.

**Layout — sidebar shell, not the old top-tab bar:**
- `components/app-shell.js` (client component — needs `mobileOpen` state + `usePathname`) renders `<div class="shell"><Sidebar .../><div class="shell-main"><div class="mobile-topbar">...</div><div class="desktop-topbar">...</div><div class="shell-container">{children}</div></div></div>`.
- **⚠️ Gotcha (2026-07-20): `.mobile-topbar` must be an actual DOM child of `.shell-main`, never a flex sibling of `.sidebar` inside `.shell`.** An earlier version rendered it as a top-level sibling returned by `Sidebar` (so it became a flex item of `.shell`, a row-flex container, alongside `.shell-main`). On real iPhone Safari this caused `.mobile-topbar` to shrink-to-fit instead of taking its own row (tried `flex-wrap:wrap` + `width:100%` first — spec-correct but Safari didn't reliably honor it), squeezing `.shell-main` into a sliver and wrapping KPI numbers one digit per line. Fixed by moving `.mobile-topbar` to be a literal child of `.shell-main` (a column-flex container, so `align-items:stretch` gives it full width unconditionally — no flex-wrap dependency at all). **`mobileOpen` state now lives in `AppShell`** (passed down to `Sidebar` as `mobileOpen`/`setMobileOpen` props) since both the hamburger button (in `.mobile-topbar`, inside `.shell-main`) and the drawer/overlay (in `Sidebar`, a `.shell` sibling of `.shell-main`) need to share it, and they're no longer in the same DOM subtree.
- `components/sidebar.js` (client) renders `lib/perms.js` `NAV_TABS` (same source of truth as before) as a **collapsible left rail on desktop** (icon-only toggle, state remembered in `localStorage` key `mm69_sidebar_collapsed` — pure UI preference, not business data, so this doesn't violate the localStorage rule elsewhere in this doc) and a **slide-in drawer on mobile** (`<960px`, hamburger trigger + backdrop overlay, auto-closes on route change). Only renders the overlay + `<aside>` now — no longer owns `mobileOpen` (see above) or renders `.mobile-topbar` itself.
- `.desktop-topbar` (≥961px only) shows the logged-in user's name/role — the one piece of session context that's otherwise hidden when the sidebar is collapsed to icon-only (`.sidebar-brand-text` hides in that state). Real session data only (`name`/`role` props `AppShell` already receives) — no fabricated notification bell/badge; don't add one without an actual notification data source behind it.
- `.wrap` class still exists (aliased to the same container styles) for anything not going through `AppShell`.

**KPI tiles — `components/kpi.js`:** icon-in-a-circle on the left, label/value/sub stacked on the right (`<Kpi icon="ti-xxx" label="..." value="..." sub="..." cls="green|red|blue" plain />`). Single shared component used by `dashboard`, `reports`, `analytics` — previously 3 near-duplicate inline implementations (one of which formatted money *inside* the component, two of which expected pre-formatted strings). All callers now pre-format via `fmtMoney()` before passing `value`.

**Date/month fields — `components/date-field.js`, mandatory for any new date or month picker:**
- **⚠️ Gotcha: iOS Safari (WebKit) does not allow full CSS control over `input[type=date]`/`input[type=month]` internals.** Setting `background`/`color` works, but a native hairline/chrome inside the control still renders and can't be removed — not via `overflow:hidden` on the input (native widget paint mostly ignores its own `overflow`), not via a wrapping `overflow:hidden` div either (fixes gross bleed/overlap onto neighboring fields, but doesn't fix the internal hairline).
- `DateField` sidesteps this rather than fighting it: the real `<input type="date"|"month">` is still there and still fully drives interaction (tapping still opens the OS-native picker; keyboard/accessibility untouched) but is rendered `opacity:0` and absolutely positioned over a plain `<span>` that we fully control and style to match every other input exactly. Props: `value`, `onChange(valueString)` (not an event — different from a raw `<input onChange>`), `type="date"|"month"`, `min`, `max`, `disabled`, `placeholder`.
- Used by all 7 date/month fields in the app: sales, expenses, analytics range picker, opex month + Form 50 date, reports month picker, settings data-tools. **Do not add a raw `<input type="date">`/`type="month">` anywhere — use `DateField`.**

**Responsive tables — `components/data-table.js`:**
- Desktop: renders a normal `<table>`. Mobile (`<720px`): pure-CSS transform (`.rtable` rules in globals.css) turns each row into a bordered, shadowed card with `data-label` pseudo-labels — no JS breakpoint logic.
- Usage: `<DataTable columns={[{key,label,align,render?}]} rows={[...]} rowKey={(r) => ...} />`. Applied to `/reports` (category breakdown) and `/analytics` (top materials, monthly comparison) as the reference implementations. **Other raw `<table>` usages in the app (e.g. `/admin/audit` inline diff table) were left as-is** (horizontal-scroll on mobile, still functional) — convert them to `DataTable` opportunistically when touching those files, not urgent.

**⚠️ Gotcha (2026-07-19, `app/layout.js`): a custom `export const viewport` object REPLACES Next.js's default viewport meta tag entirely — it does not merge.** Omitting `width`/`initialScale` silently breaks mobile rendering (iOS Safari falls back to the ~980px legacy desktop viewport, shrinking the whole page). Always include `width: 'device-width', initialScale: 1` alongside any custom `themeColor` etc.

## Feature status vs legacy

**Ported ✅:** sales entry (+delete), expense entry (+edit/delete, supplier-first for materials, DB last-price + unit memory catalog, client-side instant category switch, unit presets), OPEX 3 categories, rent WHT, VAT-auto, payslip calculator + print slip, monthly report + 2 charts, Excel export, user management, business info settings (`/settings` → `business_config.biz_info`, feeds the print slip), **Excel import** (`/settings`, admin-only, sales/expense via `exceljs`; matches the exported Thai-header format, dd/mm/yyyy incl. พ.ศ.).

Also ported ✅: **Analytics** (`/analytics`) — defaults to current year (Jan→current), with a manual from/to month range; income/expense/profit table + MoM %, signed profit trend chart, **top materials by spend & by order count**, and top suppliers. Dashboard shows 6 KPI tiles (income/expense/profit + cups/pastry/free-cups).

Also ported ✅: **bakery presets** (`lib/bakery.js`, auto-fill default price), **admin data tools** (`/settings`: delete-month, dedup — admin, double-confirm), **role-visibility matrix** (`/settings` → `business_config.role_perms`; `lib/perms.js` + `requireSession().allowed` filters nav tabs per role; admin always full — visibility only, RLS still the real guard), **payroll remittance summary** (สปส. + ภ.ง.ด. [rent 5% + staff-sub 3% + commission 3%] + ภ.พ.30 — for the accounting office), staff_sub 3% WHT breakdown, employee detail fields (name/title/ID/bank) on the slip.

**Payroll formula is verified identical to legacy `calEmpTotal`.** SSO 5% each side on min(salary,15000); commission = income×rate; commission WHT 3%; company cost = gross + companySSO.

Also ported ✅: **Form 50 ทวิ** (`app/opex/form50.js`) — withholding-tax certificate for rent 40(5)ก 5% and staff-sub 40(2) 3%; enter payee (name/tax id/address/date/condition, saved to `business_config.form50_payees`), print an HTML certificate with correct Thai baht-text.

Also ported ✅: **free-cup unit-cost config** (`/settings` → `business_config.biz_info.free_cup_cost`, default 55, feeds the sales form's default coffee price), **material/bakery price history** (expense form catalog now carries up to 8 recent price points per item+category; "ประวัติราคา" toggle shows date+price), **editable OPEX defaults** (`/settings` → `business_config.opex_defaults`, admin; overrides the static placeholders/pre-filled values in `lib/opex.js`'s `OPEX_OPERATING`/`OPEX_STAFF` items via `defFor()` in `opex-form.js`).

**⚠️ Lesson learned (2026-07-19):** employee personal/bank details (name, ID card, bank account) were originally stored **only in browser localStorage** (`mm69_emp_slip`), matching the legacy dashboard's pattern. This meant the data was per-browser and lost on any device change / cache clear — a user lost previously-entered employee details this way. **Fixed:** these fields now live in `business_config.emp_details` (keyed `emp{n}`), saved via an explicit "บันทึกข้อมูลพนักงาน" button (`saveEmpDetails` in `app/opex/actions.js`); localStorage is only consulted as a fallback for a not-yet-migrated browser, never authoritative once DB has a value. **General rule going forward: any user-entered business data (not just transient UI state) must be persisted server-side, never localStorage-only** — localStorage is fine for ephemeral form-memory (draft values, last-used unit) but never the only copy of something a user typed in.

Also ported ✅: **employee pay-history + reprint** (`lib/payslip.js` exports `computePayslip()` shared by client and server so recorded numbers are authoritative; `saveOpexAction` recomputes each paid employee's payslip server-side using its own month-income query and upserts an entry — keyed `emp{n}`, deduped by month, max 60/employee — into `business_config.emp_pay_history`; `/opex` shows a "ประวัติ" panel per employee with totals + a "พิมพ์ซ้ำ" button that reconstructs the certificate using that month's historical salary/position/diligence/payslip numbers plus the employee's *current* personal/bank details; same >6-months-requires-admin gate as regular slip printing).

Also ported ✅: **free-cup promo evidence upload** (`app/sales/sales-form.js`) — when `free_cups > 0`, an image/PDF file input uploads to Supabase Storage bucket `evidence` (path `free_cups/{date}_{ts}.{ext}`) via the browser client, stores the public URL in `sales_daily.free_cup_evidence_url` through `upsert_sales_daily`. **Requires `add_free_cup_actual_cost.sql` (repo root) to have been run in the Supabase SQL editor** — it adds the column, updates the RPC to accept/coalesce the URL, and creates the `evidence` bucket + RLS policies (authenticated insert, public read). Until run, uploads fail with a friendly "ยังไม่ได้รัน add_free_cup_actual_cost.sql" hint (same pattern as legacy) and the URL is silently dropped from the save payload (harmless no-op against the currently-deployed RPC).

Also ported ✅: **user activate/deactivate** (`/admin`, admin-only `toggleActiveAction`) — a lighter-weight alternative to deleting a user; `requireSession()`/login now enforce `profiles.is_active`, signing out and blocking access immediately when a user is deactivated (previously the column existed but was never checked, so a "deactivated" user could still use the app).

**Migrations to run once (if not already applied):**
- `add_free_cup_actual_cost.sql` — needed only for the free-cup evidence upload above; everything else in this app works against the schema already in `supabase_migration.sql`.
- **`harden_security.sql` — security fix, recommend running regardless of which features you use.** See "Security model" above.

Feature parity with the legacy dashboard is now complete for practical purposes — no remaining tracked gaps.

See memory `[[marim69-migration]]` for ongoing plan.
