# Minimal Maerim (minimalcnx) — Next.js + Supabase

Coffee-shop sales/expense/payroll + loyalty tracking system. Live at `minimalcnx.ddserviceth.com` (prod) and `minimal.ddserviceth.com` (staging).

**Canonical folder (portable):** `Z:\independentz\Web\files` — open the project from here on every machine. Remote: `ddservice/minimal-cnx` (`main`).

**Full docs (architecture, security, formulas, features, deploy):** see [`CLAUDE.md`](./CLAUDE.md) — that file is the maintained source of truth. This README is a quick-start only.

**คู่มือสะสมแต้มสำหรับพนักงาน/ผู้จัดการ:** [`LOYALTY-USER-GUIDE.md`](./LOYALTY-USER-GUIDE.md) (รวมเปรียบเทียบกับระบบแต้มแบบ LINE + สแกน QR)

## Local dev

```bash
npm install
cp .env.local.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev                        # http://localhost:3000
```

Needs an existing user in the shared Supabase project (`sql/admin_user_functions.sql` has the SQL to create one).

## Build check

```bash
npm run build
```

## Deploy (on the VPS)

```bash
cd ~/apps/minimalcnx && bash deploy.sh
```

## Deploy notes (VPS)

Container binds **`127.0.0.1:3011`** (not 3001 — MikroTik). See `CLAUDE.md` § Run / build / deploy.

## New migrations (run in Supabase SQL Editor if not already applied)

Full list + order lives in [`CLAUDE.md`](./CLAUDE.md). Highlights:

- **`sql/harden_security.sql`** + **`sql/fix_bugs.sql`** — core security / report fixes
- **`sql/add_audit_context.sql`** — Super Admin audit (IP / device / login) at `/admin/audit` (re-run if you re-run `harden_security.sql`)
- **Loyalty (order):** `add_loyalty_system.sql` → `harden_loyalty_rls.sql` → `harden_loyalty_writes.sql` → `add_loyalty_indexes.sql` → `harden_loyalty_reads.sql` → `add_loyalty_rewards.sql` → `add_customer_privacy_consent.sql`
- **`sql/add_analytics_range_kpis.sql`** — speeds `/analytics`
- **`sql/fix_loyalty_staff_profiles_rls.sql`** — only if older loyalty migration lacked staff_profiles policies

After SQL: Admin → **สาขา / พนักงานสะสมแต้ม** (`/admin/loyalty`) to link each staff user to a branch. Partner counters: role **`loyalty_staff`**.

## Claude Code project layout

See `CLAUDE.md` § "Claude Code layout". Shared config lives under `.claude/` (`rules/`, `commands/`, `skills/`, `agents/`, `hooks/`). Local overrides: `CLAUDE.local.md` + `.claude/settings.local.json` (gitignored).
