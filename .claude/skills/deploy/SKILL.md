---
name: deploy-minimalcnx
description: Deploy minimalcnx to the VPS Docker container and verify health. Use when the user asks to deploy, cutover, or update production/staging.
---

# Deploy minimalcnx

## VPS (run on the server)

```bash
cd ~/apps/minimalcnx && bash deploy.sh
```

If the clone is still nested (pre-flatten):

```bash
cd ~/apps/minimalcnx/marim69-next && bash deploy.sh
```

`deploy.sh` will `git pull`, `docker build`, recreate container `minimalcnx` on `127.0.0.1:3001`.

## Before deploy

- Required SQL applied (see `CLAUDE.md` migrations)
- `main` pushed to GitHub (VPS uses read-only deploy key)

## After deploy

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/login
curl -sk -o /dev/null -w "%{http_code}\n" https://minimalcnx.ddserviceth.com/login
```

Expect `200`. Staging `minimal.ddserviceth.com` shares the same container.
