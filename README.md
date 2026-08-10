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
- **`sql/harden_loyalty_rls.sql`** — after loyalty schema; blocks direct points tampering on `customers`
- **`sql/fix_loyalty_staff_profiles_rls.sql`** — only if you already ran an older copy of `add_loyalty_system.sql` before the `staff_profiles` policies were added (idempotent)

After SQL: Admin → **สาขา / พนักงานสะสมแต้ม** (`/admin/loyalty`) to link each staff user to a branch.
