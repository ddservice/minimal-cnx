Prepare a production deploy checklist for minimalcnx:

1. Confirm `git status` clean and `main` pushed
2. List any pending Supabase SQL files not yet applied
3. Give the exact VPS command: `cd ~/apps/minimalcnx && bash deploy.sh`
4. Smoke-test URLs: `/login`, `/loyalty`, `/admin/loyalty`
5. Remind: Admin must link staff → branch before earn/redeem works

Do not SSH unless credentials are available and the user asked to deploy.
