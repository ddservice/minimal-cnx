# Testing — minimalcnx

- Prefer `npm run build` as the smoke gate after app/SQL-client changes (standalone Docker build path).
- After loyalty SQL changes: manually smoke earn → redeem → void on `/loyalty` + `/loyalty/history`.
- After analytics RPC: open `/analytics` with a multi-month range; confirm income/expense/profit still match `/reports` for one month.
- Do not invent unit-test scaffolding unless the user asks — this repo has no Jest/Vitest suite today.
