# Code style — minimalcnx

- Match existing patterns in `app/`, `lib/`, `components/` (JS not TS unless already present).
- Use design tokens from `app/globals.css` (`--radius-*`, `--color-*`). Never hardcode `borderRadius` numbers.
- Money/quantity inputs must go through `sanitizeNumberString()` (`lib/format.js`).
- Person-name fields: `stripDigits()`. ID/account/taxid: `digitsOnly()`.
- Date/month pickers: always use `components/date-field.js` — never raw `<input type="date|month">`.
- `business_config` writes: always `lib/config-store.js` `upsertBusinessConfig()` (detect silent RLS failures).
- Do not add CDN `<link>` for fonts/icons — install + import.
- Keep comments minimal; no drive-by refactors outside the task.
