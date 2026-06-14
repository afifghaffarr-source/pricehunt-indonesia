# Deploy & Rollback SOP — BijakBeli.app

> **Purpose**: One page. Deploy, verify, roll back. Phase 9 hardening.

This document is the **operational runbook** for shipping BijakBeli.
It is intentionally short. Anything that lives here is expected to be
used during a real deploy or rollback. If you find yourself improvising
a new step, write it down here afterwards.

---

## 1. Pre-deploy checklist

Run in order, top to bottom. **Do not skip.**

- [ ] `git status` is clean (or all changes are intentional).
- [ ] Branch is up to date with `main`: `git fetch origin && git rebase origin/main`.
- [ ] Migrations under `supabase/migrations/` are reviewed and
      **additive only** for production path. No `DROP TABLE`, no
      `DROP COLUMN` without an explicit two-step plan.
- [ ] Env changes are listed (added / renamed / removed). Update
      `.env.local.example`, `.env.production.local.example`, and the
      relevant `docs/` page (see §6).
- [ ] `npm ci` completes with no peer-dep errors.
- [ ] `npm run lint` → green.
- [ ] `npm run typecheck` → green.
- [ ] `npm run test` → green. (Vitest)
- [ ] `npm run build` → green. The first build can be slow on Vercel.
- [ ] CI on the PR is green (lint, typecheck, test, build all blocking).
- [ ] No secrets in the diff (`git diff origin/main | grep -E
      "BEGIN|API_KEY|SECRET|PASSWORD"`).
- [ ] `docs/PRODUCTION_CHECKLIST.md` reviewed.

If anything in the list fails → **stop**. Fix the root cause, do not
work around it.

---

## 2. Deploy (Vercel + Supabase)

The standard deploy path is **merge to `main`** → Vercel auto-deploys
the production environment.

### 2.1 Migrations

1. Review the migration filename order. Migrations run **lexicographically**
   in the Supabase CLI, so new migrations should bump the prefix
   (e.g. `125_...` → `126_...`).
2. Apply via Supabase CLI:
   ```bash
   npx supabase db push --project-ref <ref>
   ```
3. Verify the new table/column exists in the Supabase dashboard
   (Table Editor).
4. Re-check RLS: `select * from pg_policies where schemaname='public';`

### 2.2 Env vars

1. Vercel → Project → Settings → Environment Variables.
2. Public (`NEXT_PUBLIC_*`) values are baked into the client bundle at
   build time, so a redeploy is required after a change.
3. Secret values (`CRON_SECRET`, `RESEND_API_KEY`, `INGESTION_SECRET`,
   `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_*`, `OPENAI_API_KEY`,
   `VEXO_API_KEY`) are server-only.
4. `NEXT_PUBLIC_APP_URL` should be the **production URL** for prod env
   and the **preview URL** for preview envs. Don't reuse.

### 2.3 Cron

`vercel.json` schedules are picked up on the next deploy. To verify:

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  https://<production>/api/cron/prices | jq
```

The endpoint must respond 200. If you get 401, `CRON_SECRET` is
missing or wrong in that env.

### 2.4 Smoke tests (post-deploy)

Run **immediately after** the production deploy:

- [ ] `curl https://<production>/api/health` → 200 `{status:"healthy"}`.
- [ ] `curl https://<production>/api/health/db` → 200 (DB connected).
- [ ] `curl https://<production>/` → 200, HTML title is "BijakBeli".
- [ ] Sign in as a test user → dashboard loads.
- [ ] Open a product page → prices load.
- [ ] Run a cron manually (see §2.3) → 200.
- [ ] `/admin` returns 403/redirect for non-admin.
- [ ] `/sitemap.xml` returns 200 with at least the static pages.

If any check fails, **start rollback** (§3).

---

## 3. Rollback

Two distinct scopes. Pick the one that matches the failure.

### 3.1 Code-only rollback (most common)

Vercel keeps every deploy. The fastest revert is to **promote a
previous deployment to production**:

1. Vercel → Project → Deployments.
2. Find the last known-good deployment (typically the one immediately
   before the failing deploy).
3. Click "..." → "Promote to Production".
4. Smoke test (§2.4).
5. The promoted deploy does **not** auto-revert env vars or cron
   schedules. If you also need to revert those, follow §3.2 or §3.3.

**Time to recover: < 5 minutes** for code-only regressions.

### 3.2 Env-var rollback

If a bad env var was introduced (e.g. wrong `NEXT_PUBLIC_APP_URL`):

1. Vercel → Settings → Environment Variables → edit the offending var.
2. **Redeploy** (the new build will pick up the new value). Redeploys
   are not destructive — the previous deployment remains available
   for a rollback via §3.1.

### 3.3 Database rollback

> **This is the only path that can lose data.** Migrations are
> additive. Rollbacks should be done by writing a *new* migration
> that undoes the change, not by restoring from a backup during an
> active incident.

1. **Stop the bleeding**: if the app is currently broken because of a
   bad migration, **roll back the code first** (§3.1) so the app
   stops touching the new schema. Do not try to "fix forward" with
   hot migrations during an incident.
2. Write a **down migration** in `supabase/migrations/126_undo_*.sql`
   that:
   - Does the inverse DDL (e.g. `drop column`, `drop table`,
     `drop policy`).
   - Is reviewed by 2 people before applying.
3. Apply via `npx supabase db push`.
4. Re-deploy the code that targets the old schema.
5. Smoke test.
6. Write a post-mortem in `docs/INCIDENTS/YYYY-MM-DD-<slug>.md`.

If a destructive migration was applied and data was lost, restore
from the Supabase point-in-time backup. **This is a last resort.**

---

## 4. Hot-fix procedure

For a fast, small fix (e.g. one-liner revert, config tweak):

1. Branch from `main`: `git checkout -b hotfix/<short-name>`.
2. Make the smallest possible change.
3. Run `npm run lint && npm run typecheck && npm run test`.
4. Push and open a **draft** PR. Get one reviewer's eyes on it.
5. Merge to `main`. Vercel auto-deploys.
6. Smoke test (§2.4).
7. Mark the PR as a hotfix in the title prefix: `[HOTFIX] ...`.

For multi-file or behaviour-changing fixes, treat as a normal PR.

---

## 5. Incident checklist

When something is on fire:

- [ ] Open an incident channel / thread.
- [ ] Identify scope: code / env / DB / external (Vercel, Supabase,
      Resend, VexoAPI, OpenAI, push).
- [ ] Roll back to last good state (§3).
- [ ] Confirm user-visible recovery via smoke test.
- [ ] Communicate status to stakeholders.
- [ ] Post-mortem: timeline, root cause, what we'd do differently.
- [ ] Add a regression test or guard.

---

## 6. Related docs

- `docs/PRODUCTION_CHECKLIST.md` — go/no-go gate.
- `docs/MIGRATION_ROLLBACK.md` — DB-specific rollback notes.
- `docs/SECURITY.md` — secrets, keys, rotation.
- `docs/DEPLOYMENT.md` — first-time deploy guide.
- `docs/architecture.md` — system overview.

---

## 7. Change log

- **Phase 9 (2026-06-14)**: initial version. Codified the deploy flow
  that has been used informally up to this point.
