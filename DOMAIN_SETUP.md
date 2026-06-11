# BijakBeli.app Domain Setup Guide

## Domain Configuration (name.com → Vercel)

### Step 1: Get Vercel DNS Settings
1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select project: `pricehunt-indonesia` (will rename later)
3. Go to Settings → Domains
4. Click "Add Domain"
5. Enter: `bijakbeli.app`
6. Vercel will show you DNS records to add

### Step 2: Configure at name.com
1. Login to name.com: https://www.name.com/account/domain
2. Find domain: `bijakbeli.app`
3. Go to DNS Settings
4. Add these records (from Vercel):

**A Record:**
```
Type: A
Host: @
Answer: 76.76.21.21
TTL: Automatic
```

**CNAME Record (www):**
```
Type: CNAME
Host: www
Answer: cname.vercel-dns.com
TTL: Automatic
```

### Step 3: Wait for DNS Propagation
- Usually takes 5-30 minutes
- Check status: https://dnschecker.org/#A/bijakbeli.app

### Step 4: Verify in Vercel
- Vercel will auto-detect when DNS is ready
- Domain will show "Valid Configuration" status
- SSL certificate will be issued automatically

### Step 5: Set as Primary Domain (Optional)
- In Vercel Settings → Domains
- Click ⋯ next to bijakbeli.app
- Select "Set as Primary Domain"
- Old domain (pricehunt-indonesia.vercel.app) will redirect

## Environment Variables to Update

In Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_APP_URL=https://bijakbeli.app
```

Redeploy after changing environment variables.

## Current Status
- ✅ Code rebranded and pushed to GitHub
- ⏳ Vercel deployment in progress
- ⏳ Domain DNS configuration needed
- ⏳ Primary domain switch pending

## Commands Reference

**Deploy to production:**
```bash
cd ~/projects/bijakbeli-app
npx vercel --prod --yes --token=$VERCEL_TOKEN
```

**Check deployment:**
```bash
curl -I https://pricehunt-indonesia.vercel.app
curl -I https://bijakbeli.app  # After DNS configured
```

**Update environment variable:**
```bash
npx vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://bijakbeli.app
```
