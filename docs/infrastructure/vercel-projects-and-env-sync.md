# Vercel Project Structure & Env Sync

**Last updated:** 2026-06-23
**Owner:** BijakBeli platform

## 🚨 Critical: Two Vercel Projects

This repo (`bijakbeli-app`) maps to **two different Vercel projects** under team `afif-s-projects5`:

| Project | Domain | Purpose |
|---------|--------|---------|
| `bijakbeli-app` | `bijakbeli-app.vercel.app` | Recent split/replica (newer, has deployment protection) |
| **`pricehunt-indonesia`** | **`bijakbeli.web.id`** ✅ | **PRODUCTION — serves custom domain** |

The custom domain `bijakbeli.web.id` is **aliased to `pricehunt-indonesia`**, NOT `bijakbeli-app`. When you push env vars or trigger deploys, verify which project you're targeting:

```bash
vercel link --project pricehunt-indonesia  # to manage production
vercel link --project bijakbeli-app        # to manage staging/replica
```

Check current link with `cat .vercel/project.json`.

## Why This Matters

If you accidentally push env vars to `bijakbeli-app` thinking it's production, the changes have **zero effect** on `bijakbeli.web.id`. You'll see your new env vars in `vercel env ls` but the production site still uses the old (or empty) values.

## How to Tell Which Project Serves a Domain

```bash
# Check x-vercel-id header — points to active deployment
curl -I https://www.bijakbeli.web.id | grep -i x-vercel-id

# List projects to see what URL each is mapped to
vercel project ls --token $VERCEL_TOKEN
```

## INGESTION_SECRET Pitfall

In `src/proxy.ts`, the CSRF bypass check is:

```ts
if (expectedIngestion) {  // empty string "" is FALSY
  // bypass CSRF
}
```

**If `INGESTION_SECRET` is set to empty string `""` in Vercel, the bypass is skipped** and ALL extension submissions get 403 "CSRF token missing" — even though the env var "exists".

**Fix:** Set `INGESTION_SECRET` to a non-empty 64-char hex string (see `.env.template`).

To verify the prod value is non-empty:

```bash
vercel env pull --environment production --yes /tmp/prod.env --token $VERCEL_TOKEN
awk -F= '/^INGESTION_SECRET/ {print "len=" length($2)}' /tmp/prod.env
# Expected: len > 2 (the `""` quotes)
```

## Syncing Local `.env.local` to Vercel

```bash
cd ~/projects/bijakbeli-app
vercel link --project pricehunt-indonesia  # if not already linked
set -a && source .env.local && set +a
export PATH="$HOME/.hermes/node/bin:$PATH"

# Sync all env vars (skip VERCEL_TOKEN itself)
for key in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY \
           SUPABASE_SERVICE_ROLE_KEY INGESTION_SECRET \
           NEXT_PUBLIC_APP_URL VEXO_API_BASE_URL VEXO_API_KEY CRON_SECRET; do
  printf '%s' "${!key}" | vercel env add "$key" production --token "$VERCEL_TOKEN"
done
```

If vars already exist with wrong values, remove first:

```bash
for key in ...; do
  vercel env rm "$key" production --yes --token "$VERCEL_TOKEN"
done
```

## Redeploy to Apply Env Changes

Vercel Edge runtime reads env vars at deploy time, not runtime. After updating env:

```bash
# Get latest production URL
LATEST=$(vercel ls --prod --token $VERCEL_TOKEN | grep -oE 'https://[^ ]+' | head -1)
vercel redeploy "$LATEST" --scope afif-s-projects5 --token "$VERCEL_TOKEN"
```

⚠️ Without `--scope afif-s-projects5`, CLI errors: `Deployment belongs to a different team`.

## Health Check Endpoint

```bash
curl https://www.bijakbeli.web.id/api/health
# → {"status":"healthy","timestamp":"...","environment":"production"}
```

## Extension Integration Test

```bash
# From extension perspective — should return 200 success
curl -X POST https://www.bijakbeli.web.id/api/ingestion/offer-snapshot \
  -H "Authorization: Bearer $INGESTION_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"marketplace":"shopee","product_url":"https://shopee.co.id/test-<ts>","title":"Test","price":"Rp 1.000"}'
```

If returns 403 "CSRF token missing" → `INGESTION_SECRET` is empty/missing in `pricehunt-indonesia` prod env.
