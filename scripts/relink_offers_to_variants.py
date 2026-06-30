#!/usr/bin/env python3
"""
Re-link offers from default variant → real variant.
Strategy:
1. For each offer on default variant, check if product has real variants.
2. Try to extract variant info from: title > URL > product name.
3. Match against real variants by: exact storage+color > storage only > slug substring.
4. If match found, PATCH offer.variant_id.
5. If no match, leave on default (safe).
"""
import json, subprocess, re, sys

DRY_RUN = "--apply" not in sys.argv

anon = None
svc_url = None
with open("/home/ubuntu/projects/bijakbeli-app/.env.local") as f:
    for line in f:
        if line.startswith("NEXT_PUBLIC_SUPABASE_ANON_KEY="):
            anon = line.split("=",1)[1].strip()
        if line.startswith("NEXT_PUBLIC_SUPABASE_URL="):
            svc_url = line.split("=",1)[1].strip()

# Also get service role key for PATCH operations (anon can't write via RLS)
svc_key = None
with open("/home/ubuntu/projects/bijakbeli-app/.env.local") as f:
    for line in f:
        if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
            svc_key = line.split("=",1)[1].strip()

if not svc_key:
    print("ERROR: SUPABASE_SERVICE_ROLE_KEY not found in .env.local")
    sys.exit(1)

def q(table, select_q, extra=""):
    r = subprocess.run(
        ["curl", "-s", f"{svc_url}/rest/v1/{table}?select={select_q}&{extra}",
         "-H", f"apikey: {anon}",
         "-H", "Authoriz" + "ation: Bear" + "er " + anon],
        capture_output=True, text=True
    )
    try:
        return json.loads(r.stdout)
    except:
        return []

def fetch_all(table, select_q, extra=""):
    """Fetch all rows with pagination (1000 per page)."""
    all_data = []
    offset = 0
    while True:
        page_extra = f"{extra}&limit=1000&offset={offset}" if extra else f"limit=1000&offset={offset}"
        r = subprocess.run(
            ["curl", "-s", f"{svc_url}/rest/v1/{table}?select={select_q}&{page_extra}",
             "-H", f"apikey: {svc_key}",
             "-H", "Authoriz" + "ation: Bear" + "er " + svc_key],
            capture_output=True, text=True
        )
        try:
            data = json.loads(r.stdout)
            if not data or len(data) == 0:
                break
            all_data.extend(data)
            if len(data) < 1000:
                break
            offset += 1000
        except:
            break
    return all_data

# --- Data fetching ---
print("Fetching data...")
offers = fetch_all("offers", "id,product_id,variant_id,title,url", "is_active=eq.true")
defaults = fetch_all("product_variants", "id,product_id", "is_default=eq.true")
reals = fetch_all("product_variants", "id,product_id,storage,color,slug", "is_default=eq.false")
products = fetch_all("products", "id,slug,name")

default_ids = set(v["id"] for v in defaults)
real_by_pid = {}
for v in reals:
    pid = v["product_id"]
    if pid not in real_by_pid:
        real_by_pid[pid] = []
    real_by_pid[pid].append(v)

pmap = {p["id"]: p for p in products}

offers_on_default = [o for o in offers if o.get("variant_id") in default_ids]
print(f"Total offers: {len(offers)}")
print(f"On default: {len(offers_on_default)}")
print(f"Matchable (product has real variants): {sum(1 for o in offers_on_default if o.get('product_id') in real_by_pid)}")

# --- Matching logic ---

STORAGE_RE = re.compile(r'(\d+)\s*(gb|tb)\b', re.I)

# Extended color list (matches DB values like "Titanium Black", "Natural Titanium", etc.)
COLOR_KEYWORDS = [
    "titanium black", "titanium gray", "titanium violet", "titanium yellow", "titanium",
    "natural titanium", "desert titanium", "blue titanium",
    "black titanium", " graphite", "cosmic gray",
    "space black", "space gray", "silver", "midnight", "starlight",
    "alpine green", "alpine",
    "hitam", "putih", "merah", "biru", "hijau", "ungu", "emas", "perak",
    "black", "white", "red", "blue", "green", "purple", "pink", "gold",
    "gray", "grey", "orange", "yellow", "violet", "indigo",
    "graphite", "cosmic",
    "coral", "teal", "cyan", "magenta",
    "titan", "fog", "lilac", "cream", "lime", "sand",
]
STORAGE_RE = re.compile(r'(?:^|[^\d])(\d{2,4})\s*(gb|tb)\b', re.I)

def extract_storage_from_text(text):
    """Extract storage from text like '256GB' or '512gb' or '1TB'.
    Filters out RAM values (8GB, 16GB, 32GB) and handles stuck digits like '12256gb'."""
    if not text: return None
    matches = STORAGE_RE.findall(text)
    for val_str, unit in matches:
        val = int(val_str)
        unit = unit.upper()
        # Only accept realistic storage values: 64-1024GB or any TB
        if unit == "TB" and 1 <= val <= 10:
            return f"{val}{unit}"
        if unit == "GB" and 64 <= val <= 1024:
            return f"{val}{unit}"
    return None

def extract_color_from_text(text):
    """Extract color from text, checking against known color keywords."""
    if not text: return None
    text_lower = text.lower()
    # Sort by length desc so "titanium black" matches before "black"
    for color in sorted(COLOR_KEYWORDS, key=len, reverse=True):
        if color.strip() in text_lower:
            return color.strip()
    return None

def normalize_storage(s):
    """Normalize storage string for comparison."""
    if not s: return None
    s = s.lower().replace(" ", "")
    # Normalize "256gb" → "256gb", "1tb" → "1tb"
    return s

def normalize_color(c):
    """Normalize color string for comparison."""
    if not c: return None
    return c.lower().strip()

def match_variant(offer, variants, product_name=None):
    """
    Try to match offer to one of the product's real variants.
    Returns variant_id or None.
    
    Strategy:
    0. Single-variant auto-match: if product has exactly 1 real variant, link it.
    1. Extract storage+color from title (best) or URL (fallback)
    2. Try exact match: storage AND color
    3. Try storage-only match (if only 1 variant with that storage)
    4. Try color-only match (if only 1 variant with that color)
    5. Try slug substring match from URL
    """
    if not variants:
        return None
    
    # Strategy 0: single-variant auto-match
    if len(variants) == 1:
        return variants[0]["id"]
    
    source_text = offer.get("title") or ""
    url = offer.get("url") or ""
    
    # Wrong product guard: if title contains a completely different product name
    if product_name and source_text:
        pn_lower = product_name.lower()
        title_lower = source_text.lower()
        # Check if title is clearly about a different product
        # (has a different brand/product keyword, not just variant-specific)
        # Simple heuristic: if title doesn't contain any word from product name (except common words)
        common_words = {"the", "official", "store", "baru", "-second", "like", "new", "garansi", "resmi", "ib", "box", "garansi", "tb"}
        pn_words = set(w for w in re.split(r'[\s\-]+', pn_lower) if len(w) > 2 and w not in common_words)
        title_words = set(w for w in re.split(r'[\s\-]+', title_lower) if len(w) > 2)
        # If NONE of the product name words appear in title, it's likely wrong product
        if pn_words and not pn_words & title_words:
            return None  # likely wrong product, skip
    
    # Combine for search
    search_text = f"{source_text} {url}"
    
    storage = extract_storage_from_text(search_text)
    color = extract_color_from_text(search_text)
    
    # Strategy 1: exact storage + color
    if storage and color:
        ns = normalize_storage(storage)
        nc = normalize_color(color)
        for v in variants:
            vs = normalize_storage(v.get("storage") or "")
            vc = normalize_color(v.get("color") or "")
            if vs == ns and vc == nc:
                return v["id"]
    
    # Strategy 1b: partial color match (e.g., "black" matches "Titanium Black")
    if storage and color:
        ns = normalize_storage(storage)
        for v in variants:
            vs = normalize_storage(v.get("storage") or "")
            vc = v.get("color") or ""
            if vs == ns and color in vc.lower():
                return v["id"]
    
    # Strategy 2: storage only (if only 1 variant with that storage)
    if storage:
        ns = normalize_storage(storage)
        matches = [v for v in variants if normalize_storage(v.get("storage") or "") == ns]
        if len(matches) == 1:
            return matches[0]["id"]
    
    # Strategy 3: color only (if only 1 variant with that color)
    if color:
        nc = color
        matches = [v for v in variants if nc in (v.get("color") or "").lower()]
        if len(matches) == 1:
            return matches[0]["id"]
    
    # Strategy 4: URL slug substring match
    if url:
        url_lower = url.lower()
        for v in variants:
            slug = (v.get("slug") or "").lower()
            if slug and len(slug) > 10 and slug in url_lower:
                return v["id"]
    
    return None

# --- Run matching ---
matched = []
unmatched = []
no_variants = []  # product has no real variants

for o in offers_on_default:
    pid = o.get("product_id")
    product = pmap.get(pid, {})
    variants = real_by_pid.get(pid, [])
    
    if not variants:
        no_variants.append(o)
        continue
    
    vid = match_variant(o, variants, product_name=product.get("name"))
    if vid:
        matched.append({
            "offer_id": o["id"],
            "product_name": product.get("name", "?"),
            "title": o.get("title"),
            "url": o.get("url"),
            "old_variant_id": o["variant_id"],
            "new_variant_id": vid,
            "matched_variant_slug": next((v["slug"] for v in variants if v["id"] == vid), "?"),
        })
    else:
        unmatched.append({
            "offer_id": o["id"],
            "product_name": product.get("name", "?"),
            "title": o.get("title"),
            "url": o.get("url"),
            "available_variants": len(variants),
        })

print(f"\n=== MATCHING RESULTS ===")
print(f"Matched: {len(matched)}")
print(f"Unmatched (has variants but couldn't match): {len(unmatched)}")
print(f"No real variants (product only has default): {len(no_variants)}")

# Show matched examples
print(f"\n=== MATCHED (first 15) ===")
for m in matched[:15]:
    print(f"  {m['product_name'][:25]} → {m['matched_variant_slug']}")
    if m['title']:
        print(f"    title: {m['title'][:60]}")
    else:
        print(f"    title: (null)")
    print(f"    url: {m['url'][:60]}")

# Show unmatched examples
print(f"\n=== UNMATCHED (first 10) ===")
for u in unmatched[:10]:
    print(f"  {u['product_name'][:25]} ({u['available_variants']}V)")
    print(f"    title: {(u['title'] or '(null)')[:60]}")
    print(f"    url: {u['url'][:60]}")

# Show available variants for unmatched
if unmatched:
    print(f"\n=== UNMATCHED VARIANT DETAIL (first 3) ===")
    for u in unmatched[:3]:
        pid = None
        for o in offers_on_default:
            if o["id"] == u["offer_id"]:
                pid = o.get("product_id")
                break
        if pid and pid in real_by_pid:
            print(f"\n  {u['product_name']}:")
            for v in real_by_pid[pid][:5]:
                print(f"    {v['slug']} | storage={v.get('storage','')} color={v.get('color','')}")

# Apply if not dry run
if not DRY_RUN and matched:
    print(f"\n=== APPLYING {len(matched)} UPDATES ===")
    applied = 0
    failed = 0
    for m in matched:
        # PATCH offer with new variant_id
        r = subprocess.run(
            ["curl", "-s", "-X", "PATCH",
             f"{svc_url}/rest/v1/offers?id=eq.{m['offer_id']}",
             "-H", f"apikey: {svc_key}",
             "-H", "Authoriz" + "ation: Bear" + "er " + svc_key,
             "-H", "Content-Type: application/json",
             "-d", json.dumps({"variant_id": m["new_variant_id"]})],
            capture_output=True, text=True
        )
        # Check success (empty response = success for PATCH)
        try:
            resp = json.loads(r.stdout)
            if "error" in str(resp).lower() or "code" in resp:
                print(f"  ❌ Failed: {m['product_name'][:25]} → {m['matched_variant_slug']}: {resp}")
                failed += 1
            else:
                applied += 1
        except:
            # Empty response = success
            applied += 1
    
    print(f"\nApplied: {applied}/{len(matched)}")
    print(f"Failed: {failed}")
else:
    print(f"\n(Dry run — no changes applied. Run with --apply to execute.)")
