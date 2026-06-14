# Deploy Verification (Phase 12)

> Ensures that `bijakbeli.app` (production alias) is always serving the
> same commit as `main` HEAD. Catches "preview built but never promoted"
> gaps automatically.

## Why this exists

On **2026-06-14** we merged commit `cfefb8d` (CI migration linter, Phase
11) to `main`. Vercel built it as a **preview** deployment
(`pricehunt-indonesia-m3rgutdv6-...`), but the production alias
`bijakbeli.app` kept pointing at the previous production deployment
(`pricehunt-indonesia-obwi3nz0e-...`, ~4 hours older). The gap was
invisible from the GitHub side - CI was green, the merge succeeded, the
preview URL worked fine when tested directly. Only the production
custom domain served stale code.

We noticed by hand and ran `vercel promote` to fix it. This script makes
that class of bug impossible to repeat silently: every CI run that pushes
to `main` now compares the current production deployment's
`meta.githubCommitSha` to HEAD and warns (or, optionally, fails) on
mismatch.

## How it works

`scripts/verify-vercel-prod.mjs` calls the Vercel REST API:

```
GET https://api.vercel.com/v6/deployments
    ?projectId={VERCEL_PROJECT_ID}
    &target=production
    &limit=1
    &teamId={VERCEL_TEAM_ID}
Authorization: Bearer {VERCEL_TOKEN}
```

The first result's `meta.githubCommitSha` is compared to:

- `EXPECTED_SHA` env var, falling back to
- `GITHUB_SHA` env var (set automatically by GitHub Actions), falling
  back to
- `git rev-parse HEAD` (works in local dev)

### Behavior

| Mode | Trigger | Mismatch behavior |
| --- | --- | --- |
| **warn-only** (default) | step is not gated | logs a `WARN:` line and exits 0 (CI stays green) |
| **strict** | `VERCEL_PROD_REQUIRE_MATCH=1` | logs an `ERROR:` line and exits 1 (CI fails) |
| **skipped** | `VERCEL_TOKEN` not set | logs a notice and exits 0 |

### Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Match, OR warn-only mismatch, OR check skipped (no token) |
| 1 | Mismatch in strict mode |
| 2 | Internal error (network failure, parse failure, git failure) |

## GitHub Actions setup (one-time)

The CI workflow at `.github/workflows/ci.yml` runs the script on every
push to `main`. To make the check actually query Vercel, add three
repository secrets:

| Secret name | Value | Where to get it |
| --- | --- | --- |
| `VERCEL_TOKEN` | A Vercel personal access token | <https://vercel.com/account/tokens> (create a token with **Read** scope; the default `Full Account` is fine but not required) |
| `VERCEL_PROJECT_ID` | `prj_ePJ5M4ZKeZHBxwWtxfZ2CyOTEbNT` | `.vercel/project.json` in this repo, or `vercel inspect pricehunt-indonesia --scope afif-s-projects5` |
| `VERCEL_TEAM_ID` | `team_tvCiOpIP6AuQp0cHIyG0Wd1q` | Same file, field `orgId`. Alternatively the team slug `afif-s-projects5` works for the CLI but the REST API wants the `team_…` ID |

To set the secrets: GitHub repo → **Settings** → **Secrets and
variables** → **Actions** → **New repository secret**.

If any of the three secrets is missing the step exits 0 with a notice -
this is intentional so the script is safe to run before the secrets are
configured.

## Local usage

```bash
# 1. Sanity check (no token, just verifies the script runs and exits 0)
npm run verify:vercel-prod

# 2. Real check using secrets from .env.local
VERCEL_TOKEN=... VERCEL_PROJECT_ID=prj_ePJ5M4ZKeZHBxwWtxfZ2CyOTEbNT \
  VERCEL_TEAM_ID=team_tvCiOpIP6AuQp0cHIyG0Wd1q \
  npm run verify:vercel-prod

# 3. Strict mode (exit 1 on mismatch)
VERCEL_PROD_REQUIRE_MATCH=1 npm run verify:vercel-prod
```

## What to do on a mismatch warning

The warning looks like this:

```
[verify-vercel-prod] WARN: MISMATCH: HEAD is abc1234 but production serves def5678.
  HEAD  (abc1234): https://github.com/<owner>/<repo>/commit/abc1234...
  PROD  (def5678): https://github.com/<owner>/<repo>/commit/def5678...
If you just merged to main, Vercel built a preview deployment but did
not promote it to production. Run:
  vercel promote <preview-deployment-id> --scope <team-slug>
```

Steps to recover:

1. List recent deployments:
   ```bash
   vercel ls pricehunt-indonesia --scope afif-s-projects5
   ```
2. Find the preview deployment built from the expected commit. Its URL
   will look like `pricehunt-indonesia-<hash>-afif-s-projects5.vercel.app`.
3. Promote it:
   ```bash
   vercel promote dpl_<deployment-id> --scope afif-s-projects5
   ```
4. Verify:
   ```bash
   curl -sSI https://bijakbeli.app
   ```
   The `X-Vercel-Id` should be fresh (Age: 0, no CDN cache) and the
   `Server` header should report a recent timestamp.

A more thorough runbook is in [`docs/DEPLOY_ROLLBACK.md`](DEPLOY_ROLLBACK.md).

## Future hardening

- Once the check has been green for a week or two in warn-only mode,
  switch the CI step to strict mode by setting
  `VERCEL_PROD_REQUIRE_MATCH=1` in the workflow env.
- A separate scheduled job could re-run this check hourly and open a
  GitHub issue if production drifts from main HEAD for more than
  ~30 minutes.
