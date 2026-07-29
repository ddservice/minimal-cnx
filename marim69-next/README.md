# Minimal Maerim (marim69) — Next.js + Supabase

Coffee-shop sales/expense/payroll tracking system. Live production app for `minimalcnx.ddserviceth.com`, replacing the original single-HTML-file dashboard (kept for reference at `../archive/minimal_marim69_dashboard.html`).

**For the full picture — architecture, security model, business formulas, feature status, deploy instructions — see [`../CLAUDE.md`](../CLAUDE.md) at the repo root. That file is the maintained source of truth; this README is intentionally just a quick-start.**

## Local dev

```bash
cd marim69-next
npm install
cp .env.local.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev                        # http://localhost:3000
```

Needs an existing user in the shared Supabase project to log in (`sql/admin_user_functions.sql` at repo root has the SQL to create one).

## Build check

```bash
npm run build
```

## Deploy

Production runs on a VPS via Docker, not Vercel/Netlify — see the "Run / build / deploy" section in `../CLAUDE.md`.
