# Security — minimalcnx

- Real boundary = Supabase **RLS + SECURITY DEFINER RPCs**. Server Action checks are defense-in-depth only.
- Never put `service_role` in client / `NEXT_PUBLIC_*`.
- Recompute money/payslip/loyalty points server-side — never trust client totals.
- `lib/perms.js` gates nav + page actions (view/create/edit). Enforce writes with `requireCap()` in Server Actions. RLS remains the real data boundary — the matrix cannot grant more than RLS.
- `/admin/audit` is Super Admin (`role = admin`) only. Requires `sql/add_audit_context.sql`. Do not log passwords in audit details.
- Loyalty writes: earn/redeem must go through app actions + RLS in `harden_loyalty_writes.sql`; void only via `loyalty_void_transaction` RPC.
- Staff cannot spoof another branch (only manager+ may pick branch).
- After schema changes, document required SQL in `CLAUDE.md` migrations list.
- Never commit `.env.local` or real passwords. `sql/fix_imm_login.sql` must not ship a production default password.
