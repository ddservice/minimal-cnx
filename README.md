# Minimal Maerim (minimalcnx) — Next.js + Supabase

Coffee-shop sales/expense/payroll + loyalty tracking system. Live at `minimalcnx.ddserviceth.com` (prod) and `minimal.ddserviceth.com` (staging).

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

## New migrations (run in Supabase SQL Editor if not already applied)

- **`sql/add_loyalty_system.sql`** — required for `/loyalty` (tables, trigger, RLS, seed branches)
- **`sql/harden_loyalty_rls.sql`** — blocks direct points tampering on `customers`
- **`sql/harden_loyalty_writes.sql`** — tightens earn/redeem INSERT + void via RPC (run after loyalty is live)
- **`sql/add_loyalty_indexes.sql`** — speeds history/CDP queries
- **`sql/add_analytics_range_kpis.sql`** — speeds `/analytics` (one RPC for many months)
- **`sql/fix_loyalty_staff_profiles_rls.sql`** — only if you ran an older `add_loyalty_system.sql` before staff_profiles policies existed

After SQL: Admin → **สาขา / พนักงานสะสมแต้ม** (`/admin/loyalty`) to link each staff user to a branch.

## Claude Code project layout

See `CLAUDE.md` § "Claude Code layout". Shared config lives under `.claude/` (`rules/`, `commands/`, `skills/`, `agents/`, `hooks/`). Local overrides: `CLAUDE.local.md` + `.claude/settings.local.json` (gitignored).
