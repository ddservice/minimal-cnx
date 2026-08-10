# Loyalty / สะสมแต้ม

- Staff guide: `LOYALTY-USER-GUIDE.md`
- Routes: `/loyalty`, `/loyalty/history`, `/loyalty/analytics`, `/admin/loyalty`
- Catalog: `lib/loyalty-rewards.js` (server is source of truth for redeem cost)
- Required SQL (order): `add_loyalty_system.sql` → `harden_loyalty_rls.sql` → `harden_loyalty_writes.sql` → `add_loyalty_indexes.sql`
- Business analytics speed (optional): `add_analytics_range_kpis.sql` → RPC `get_months_kpis`
- Earn requires: linked `staff_profiles`, branch, receipt, points 1–100
- Multi-branch applies to loyalty only — sales/expenses/OPEX remain single-shop
