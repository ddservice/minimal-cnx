# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page management dashboard ("Minimal Maerim 69" / "Minimal Coffee") for a coffee shop, tracking daily sales, material/expense costs, OPEX, and payroll. There is no build system, package manager, or test suite — this is a static HTML file plus SQL migrations, deployed as-is.

- `minimal_marim69_dashboard.html` — the entire application: markup, CSS, and JS in one file (~7,300 lines). This is the file actively developed; edit it directly.
- `supabase_migration.sql` — the canonical DB schema (tables, views, triggers, RLS policies, RPC functions) for the current Supabase backend.
- `admin_user_functions.sql` — `SECURITY DEFINER` Postgres functions for admin user management (create user, etc.), run manually in the Supabase SQL editor.
- `add_email_to_profiles.sql`, `add_unit_column.sql`, `fix_admin_email.sql`, `fix_bugs.sql`, `fix_passwords.sql`, `fix_imm_login.sql`, `supabase_set_admin.sql` — one-off migration/patch scripts, applied manually and individually via the Supabase SQL editor (not run as an ordered migration chain). Check the header comment in each before assuming it still needs to run.
- `Code.gs`, `minimal_marim69_gas.gs` — legacy Google Apps Script backend (Google Sheets as the datastore). Superseded by the Supabase backend but kept for reference; `_sbGet`/`_sbPost` in the dashboard JS were written as drop-in replacements for the old GAS `fetch` calls, and Thai-language field names/converters (`_sbSaleToThai`, `_sbOpexToThai`, `_sbExpToThai`) exist specifically to keep the new Supabase data shape compatible with the old GAS-era UI code.
- `import_*.xlsx` — one-time data import spreadsheets used to seed historical data.
- `netlify.toml` — leftover from the old Netlify setup; production now runs on a VPS (see Deploy below).

## Commands

There is no build, lint, or test tooling in this repo. Development is edit-the-HTML-and-reload.

- **Run locally**: open `minimal_marim69_dashboard.html` directly in a browser, or serve the directory (e.g. `npx serve .`) — it talks to the live Supabase project directly from the client, so no local backend is needed.
- **Deploy**: production runs on a self-managed VPS (`minimalcnx.ddserviceth.com`, proxied via Cloudflare), **not Netlify** — `netlify.toml` is a leftover from the old setup. Flow: push to `main` on GitHub (`push_update.bat` commits/pushes just the dashboard HTML with a canned message), then on the VPS run `cd /var/www/minimalcnx && git pull origin main`. nginx serves the HTML as static content directly (no pm2/process restart needed). After pulling, purge the Cloudflare cache (Caching → Purge Everything) and hard-refresh, or the old version will keep showing.
- **DB changes**: apply SQL files manually by pasting into the Supabase SQL editor (project ref `fkhfrylvronkmktlmmia`) — there is no migration runner.

## Architecture

**Client talks directly to Supabase — there is no application server.** The dashboard HTML embeds the Supabase URL and a publishable (anon) key (`minimal_marim69_dashboard.html:1584-1585`) and calls `supabase-js` directly for auth, reads, and writes. All access control is enforced by Postgres Row Level Security policies in `supabase_migration.sql`, not by application code.

**Auth**: Supabase Auth, but usernames instead of emails — login maps `username` → `username@marim69.internal` (see `doLogin()`) and looks up `role`/`display_name`/etc. from `public.profiles`, which is linked 1:1 to `auth.users` via a `handle_new_user`-style trigger (`fn_on_auth_user_created`). Roles are `admin` / `manager`, gating UI via `isAdmin()`/`applyRoleRestrictions()` and gating data access via RLS policies (e.g. `"expenses: delete admin only"`, though `fix_bugs.sql` loosened some of these).

**Auth gotcha — users created by direct INSERT into `auth.users`**: `admin_create_user` (and any manual SQL) must set `instance_id = '00000000-0000-0000-0000-000000000000'` and all GoTrue token columns (`confirmation_token`, `recovery_token`, `email_change*`, `phone_change*`, `reauthentication_token`) to `''` — never leave them NULL. Rows missing these fields make GoTrue fail to match the user at login, returning "Invalid login credentials" even with the correct password, and a plain password reset doesn't fix it. This bit user `imm` (July 2026). `admin_create_user`/`admin_reset_password` in `admin_user_functions.sql` now set/heal these fields (re-run that file in the SQL editor after changes); `fix_imm_login.sql` repairs already-broken rows. The email-provider `auth.identities` row should use `provider_id = user id` (not the email).

**Data layer (`_sbGet` / `_sbPost`)**: Two functions in the `<script>` block act as a thin abstraction layer standing in for the old GAS `doGet`/`doPost` endpoints. All reads/writes from the UI go through these rather than calling `supabase-js` inline elsewhere, and they dispatch on an `action` (for GET) or `formType` (for POST) string:
- Sales → `sales_daily` table, upserted via the `upsert_sales_daily(p_data jsonb)` RPC (one row per date, unique on `date`).
- OPEX → `expenses` table (category ∈ operating-cost categories) via `upsert_opex_item(p_data jsonb)` RPC, unique per `(month_label, item_key)`.
- Material/bakery/misc costs → `expenses` table, plain insert/delete (no upsert; edits are done as atomic delete+reinsert — see `_atomicEdit`).
- Monthly report/export → `get_monthly_summary(p_month_label text)` RPC, which returns combined sales+expenses JSON split back out client-side into sales/opex/expense buckets by category.
- Business settings → key/value rows in `business_config`.

**Money conventions to preserve**: delivery-platform sales (Shopee/Grab/Lineman) are stored *before* GP/commission deduction (`shopee_before_gp` etc.) — the "after GP" net figures shown in the UI are computed client-side, not stored. `net_revenue` on `sales_daily` is likewise computed in JS at save time, not by the DB. "Free cups" (แก้วฟรี) track both a count and a cost (`free_cup_cost`) used to offset revenue.

**Thai field names throughout**: table/column comments, sheet headers (`HEADERS` in `Code.gs`), and the `_sbXToThai()` converters all use Thai labels because the UI is Thai-language and historically bound directly to spreadsheet column headers. When adding fields, follow the existing Thai naming used in the nearest analogous field rather than introducing English labels into user-facing data structures.

**UI structure**: single page, tab-based (`sw(id, btn)` toggles `.tab`/panel visibility) — tabs are ภาพรวม (overview/summary), ยอดขาย (sales), รายจ่าย (expenses), ค่าดำเนินการ (OPEX), วิเคราะห์ (analytics), ตั้งค่า (settings). Per-role visibility is checkbox-configurable by admin (`PERM_ITEMS`/`applyRolePerms`, stored in `business_config` key `role_permissions`, cached in `localStorage` `mm69_role_perms`); user management and delete-whole-month cards are hard-locked to admin regardless. The header badge shows the nickname; `_auth.full_name` is what goes on documents (pay slips, 50 ทวิ). Per-row dynamic tables (material costs, bakery costs, OPEX groups) are built and recalculated via `add*Row()` / `cal*Row()` / `update*Grand()` triples — follow that pattern for new dynamic line-item sections. Non-auth user preferences and drafts (shop name, preparer name, per-item unit defaults, price-change history) are persisted in `localStorage` under `mm69_*` / `marim69_*` keys, not in Supabase.

## Security note

`push_to_github.bat` previously hardcoded a GitHub personal access token and force-pushed after wiping/reinitializing `.git` on every run. The file is `.gitignore`d and the token was never committed to history, but it did live in the local `.git/config` remote URL. Both have been cleaned up (script now does a plain `add`/`commit`/`push`; remote URL has no embedded credential — auth goes through the configured Git Credential Manager). Never embed tokens/credentials in scripts or remote URLs — rely on a credential helper or SSH key instead.
