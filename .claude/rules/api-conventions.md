# API / Server Action conventions

- Mutations live in `app/*/actions.js` as Server Actions; recompute money/points server-side.
- Auth: page loads use `requireSession()`; admin pages also gate in the page + RLS.
- Supabase RPCs that change data should be `SECURITY DEFINER` with explicit `grant execute … to authenticated` and tight internal checks.
- New `business_config` keys: document RLS tier in `harden_security.sql` / CLAUDE.md if write access differs from defaults.
- Prefer returning `{ status, message }` style objects from loyalty/admin actions for client `window.alert` / toast UX.
