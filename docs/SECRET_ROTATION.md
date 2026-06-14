# Secret Rotation Runbook

**Project:** BijakBeli.app / PriceHunt Indonesia
**Last updated:** 2026-06-14
**Owner:** Engineering

This document describes how to rotate the shared secrets used by BijakBeli.app.
Follow the steps in order. After rotation, verify everything works end-to-end
before closing the change.

---

## Table of contents

1. [Overview of secrets](#1-overview-of-secrets)
2. [Pre-flight checklist](#2-pre-flight-checklist)
3. [Generate a strong secret](#3-generate-a-strong-secret)
4. [Rotate `CRON_SECRET`](#4-rotate-cron_secret)
5. [Rotate `INGESTION_SECRET`](#5-rotate-ingestion_secret)
6. [Rotate Supabase keys (optional)](#6-rotate-supabase-keys-optional)
7. [Rotate `OPENAI_API_KEY`](#7-rotate-openai_api_key)
8. [Rotate `RESEND_API_KEY`](#8-rotate-resend_api_key)
9. [Rotate `VEXO_API_KEY`](#9-rotate-vexo_api_key)
10. [Rotate VAPID keys](#10-rotate-vapid-keys)
11. [Post-rotation verification](#11-post-rotation-verification)
12. [Incident response: suspected leak](#12-incident-response-suspected-leak)

---

## 1. Overview of secrets

| Secret                  | Used by                                | Lives in                          | Rotation frequency |
|-------------------------|----------------------------------------|-----------------------------------|--------------------|
| `CRON_SECRET`           | GitHub Actions → Vercel cron endpoints | Vercel env + GitHub repo secret   | Annually or on leak |
| `INGESTION_SECRET`      | Python collectors → ingestion API      | Vercel env + collectors `.env`    | Annually or on leak |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin operations       | Vercel env                        | Annually or on leak |
| `SUPABASE_ANON_KEY`     | Public client (still sensitive)        | Vercel env + GitHub repo secret   | Annually or on leak |
| `OPENAI_API_KEY`        | AI Advisor                             | Vercel env                        | On leak / per OpenAI rotation |
| `RESEND_API_KEY`        | Email delivery                         | Vercel env                        | On leak / per Resend rotation |
| `VEXO_API_KEY`          | Product discovery + AI search          | Vercel env                        | On leak / per Vexo rotation |
| `VAPID_PRIVATE_KEY`     | Web push notifications                 | Vercel env                        | Rarely (breaks subs) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web push (public, low risk)      | Vercel env + repo                 | With private key   |

**Rule of thumb:** if a secret ever appeared in a public log, chat, screenshot,
or git commit, treat it as compromised and rotate immediately.

---

## 2. Pre-flight checklist

Before rotating, confirm:

- [ ] You have admin access to the Vercel project (`bijakbeli-app`).
- [ ] You have admin access to the GitHub repo
      (`afifghaffarr-source/pricehunt-indonesia`).
- [ ] You have `gh` CLI installed and authenticated
      (`gh auth status` returns "Logged in to github.com").
- [ ] You have `vercel` CLI installed and authenticated
      (`vercel whoami` returns your account).
- [ ] You have a way to make test requests (PowerShell `Invoke-RestMethod`,
      `curl`, or Postman).
- [ ] You know the production URL: `https://www.bijakbeli.app`
- [ ] The current time is **not** within ±15 minutes of a scheduled cron run
      (alerts = hourly, prices = every 6h, digest = Mon 09:00 UTC). Rotating
      during a window makes diagnosis harder.

---

## 3. Generate a strong secret

A strong secret is:

- **At least 32 characters** (48+ recommended).
- Cryptographically random.
- Stored only in secret managers — never in chat, tickets, or git.

### PowerShell (Windows)

```powershell
-join ((1..48) | ForEach-Object { [char[]]'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' | Get-Random }) | Set-Clipboard
```

### Bash / WSL / macOS

```bash
openssl rand -base64 48 | tr -d '=+/' | cut -c1-48
```

### Node

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## 4. Rotate `CRON_SECRET`

`CRON_SECRET` protects the three Vercel cron endpoints
(`/api/cron/alerts`, `/api/cron/prices`, `/api/cron/digest`).
GitHub Actions workflows call them with `Authorization: Bearer ${CRON_SECRET}`.

### 4.1 Generate the new secret

Use the method from [section 3](#3-generate-a-strong-secret).
Save it somewhere safe (1Password / Bitwarden / Windows Credential Manager).
You will paste it four times in the next steps.

### 4.2 Update GitHub repo secret

```bash
gh secret set CRON_SECRET --body "<NEW_SECRET>" --repo afifghaffarr-source/pricehunt-indonesia
```

Verify:

```bash
gh secret list --repo afifghaffarr-source/pricehunt-indonesia | findstr CRON_SECRET
```

### 4.3 Update Vercel environment variable

Pick the right command for your scope:

```powershell
# Production only (recommended for rotation)
vercel env rm CRON_SECRET production
vercel env add CRON_SECRET production
# paste the new secret when prompted
```

For local dev, update your personal `.env.local` (not committed).

### 4.4 Trigger a redeploy

The new value only takes effect after a deployment picks it up:

```powershell
vercel --prod --yes
```

Wait for the deployment to finish before testing (check the Vercel dashboard or
`vercel ls`).

### 4.5 Verify

```powershell
# Should return 401 (no auth)
$BAD = Invoke-RestMethod -Uri "https://www.bijakbeli.app/api/cron/alerts" -Method POST
# -> 401 Unauthorized

# Should return 200 (with new secret)
$GOOD = Invoke-RestMethod `
  -Uri "https://www.bijakbeli.app/api/cron/alerts" `
  -Method POST `
  -Headers @{ Authorization = "Bearer <NEW_SECRET>" }
# -> 200 OK
```

If both pass, the rotation is complete. If `GOOD` returns 401, the deployment
hasn't picked up the new value yet — wait 60s and retry.

### 4.6 (Optional) Verify GitHub Actions run

Trigger the alerts workflow manually and check the logs:

```bash
gh workflow run cron-alerts.yml --repo afifghaffarr-source/pricehunt-indonesia
gh run list --workflow=cron-alerts.yml --limit=1
```

Open the run and confirm the `curl` step returned 200.

---

## 5. Rotate `INGESTION_SECRET`

`INGESTION_SECRET` protects `/api/ingestion/offer-snapshot`. The Python
collectors in `collectors/` send it as a Bearer token.

### 5.1 Generate the new secret

Same procedure as [section 3](#3-generate-a-strong-secret).

### 5.2 Update Vercel

```powershell
vercel env rm INGESTION_SECRET production
vercel env add INGESTION_SECRET production
# paste the new secret
```

### 5.3 Update collector `.env`

On every machine that runs collectors:

```bash
# collectors/.env (not committed)
INGESTION_SECRET=<NEW_SECRET>
```

### 5.4 Redeploy

```powershell
vercel --prod --yes
```

### 5.5 Verify

```powershell
$body = @{ product_id = "00000000-0000-0000-0000-000000000000"; price = 0 } | ConvertTo-Json
Invoke-RestMethod `
  -Uri "https://www.bijakbeli.app/api/ingestion/offer-snapshot" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json"; "X-Ingestion-Secret" = "<NEW_SECRET>" } `
  -Body $body
```

A 200 or 4xx (validation) is fine. A 401 means the new value is not live yet.

---

## 6. Rotate Supabase keys (optional)

These rarely need rotation unless the service-role key leaked.
The anon key is technically public but rotating it requires updating all
clients at once.

### 6.1 Generate new keys

In Supabase dashboard: **Settings → API → "Generate new token"** (service role)
or **"Reload"** (anon key). Save the new values in your password manager first.

### 6.2 Update Vercel

```powershell
vercel env rm SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# paste the new service-role key

vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# paste the new anon key
```

### 6.3 Update GitHub repo secrets (for CI build)

```bash
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "<NEW_SERVICE_ROLE>" --repo afifghaffarr-source/pricehunt-indonesia
gh secret set SUPABASE_ANON_KEY --body "<NEW_ANON>" --repo afifghaffarr-source/pricehunt-indonesia
```

### 6.4 Redeploy and verify

```powershell
vercel --prod --yes
# Test login + a public query on https://www.bijakbeli.app
```

---

## 7. Rotate `OPENAI_API_KEY`

If the OpenAI key leaked or you want to cycle it for hygiene:

1. Create a new key in the OpenAI dashboard.
2. Update Vercel:
   ```powershell
   vercel env rm OPENAI_API_KEY production
   vercel env add OPENAI_API_KEY production
   ```
3. Redeploy:
   ```powershell
   vercel --prod --yes
   ```
4. Test the AI Advisor on a product page.

---

## 8. Rotate `RESEND_API_KEY`

1. Create a new key in the Resend dashboard.
2. Update Vercel:
   ```powershell
   vercel env rm RESEND_API_KEY production
   vercel env add RESEND_API_KEY production
   ```
3. Redeploy.
4. Trigger a test alert email from `/admin` and confirm it arrives.

---

## 9. Rotate `VEXO_API_KEY`

1. Generate a new VIP key in the VexoAPI dashboard.
2. Update Vercel:
   ```powershell
   vercel env rm VEXO_API_KEY production
   vercel env add VEXO_API_KEY production
   ```
3. Redeploy.
4. Test product search on the homepage.

---

## 10. Rotate VAPID keys

⚠️ **Warning:** rotating VAPID keys invalidates all existing push subscriptions.
Users will need to re-subscribe from settings.

1. Generate a new pair locally:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Update Vercel env vars (`VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`).
3. Update `.env.local.example` with the new public key (private key stays
   out of git).
4. Redeploy.
5. Communicate the change: "Please re-enable push notifications in settings."

---

## 11. Post-rotation verification

After any rotation:

- [ ] All cron workflows in GitHub Actions succeed on their next scheduled run.
- [ ] No 401s in Vercel logs for the rotated endpoint.
- [ ] No user-visible errors in Sentry / Vercel runtime logs.
- [ ] At least one end-to-end test of the affected feature (alert email, push
      notification, AI advisor, search, etc.).
- [ ] The previous secret is **invalidated** (old key returns 401).
- [ ] Update the `Last rotated` date in this runbook (if you maintain one).

---

## 12. Incident response: suspected leak

If a secret appears in a public place (screenshot in support ticket, leaked in
a PR, accidentally committed to a public repo):

1. **Rotate immediately** — don't wait for the next scheduled rotation. Follow
   the relevant section above. Skip optional pre-flight steps.
2. **Audit access logs** — check Vercel and Supabase logs for unexpected use
   of the old secret between the leak time and rotation time.
3. **Invalidate the leaked value** — most providers (Vercel, GitHub, Resend,
   OpenAI) let you delete the old key so it can never be reused.
4. **Notify the user** if user data was potentially accessed (per privacy
   policy commitments in `src/app/legal/privacy/page.tsx`).
5. **Document the incident** in `docs/INCIDENTS/` with timeline, impact, and
   remediation.

---

## Appendix: Quick reference card

```powershell
# Generate strong secret
-join ((1..48) | ForEach-Object { [char[]]'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' | Get-Random })

# Rotate GitHub secret
gh secret set <NAME> --body "<NEW>" --repo afifghaffarr-source/pricehunt-indonesia

# Rotate Vercel env var
vercel env rm <NAME> production
vercel env add <NAME> production

# Redeploy
vercel --prod --yes

# Test cron endpoint
Invoke-RestMethod -Uri "https://www.bijakbeli.app/api/cron/<endpoint>" -Method POST -Headers @{ Authorization = "Bearer <NEW>" }
```
