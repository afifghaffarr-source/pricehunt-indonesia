"""Test VexoAPI search + AI for marketplace price discovery."""
import json
import os
import sys
import urllib.parse
import urllib.request

VEXO_BASE = "https://vexoapi.dev"
VEXO_KEY = os.environ.get("VEXO_API_KEY", "")

if not VEXO_KEY:
    print("VEXO_API_KEY not set in env")
    sys.exit(1)


def vexo_get(path: str, params: dict) -> dict:
    qp = {"key": VEXO_KEY, **params}
    url = f"{VEXO_BASE}{path}?" + urllib.parse.urlencode(qp)
    req = urllib.request.Request(url, headers={"User-Agent": "bijakbeli-test/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            body = r.read().decode()
            try:
                return {"ok": True, "status": r.status, "data": json.loads(body)}
            except json.JSONDecodeError:
                return {"ok": True, "status": r.status, "data": body[:500]}
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": e.code, "error": e.read().decode()[:500]}
    except Exception as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}"}


def vexo_post(path: str, payload: dict) -> dict:
    body = json.dumps(payload).encode()
    url = f"{VEXO_BASE}{path}?key={VEXO_KEY}"
    req = urllib.request.Request(
        url, data=body, method="POST",
        headers={"Content-Type": "application/json", "User-Agent": "bijakbeli-test/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            resp = r.read().decode()
            try:
                return {"ok": True, "status": r.status, "data": json.loads(resp)}
            except json.JSONDecodeError:
                return {"ok": True, "status": r.status, "data": resp[:500]}
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": e.code, "error": e.read().decode()[:500]}
    except Exception as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}"}


print("=" * 70)
print("TEST 1: VexoAPI /api/search/google with site:tokopedia.com")
print("=" * 70)
res = vexo_get("/api/search/google", {"q": "site:tokopedia.com iPhone 15 Pro Max 256GB"})
print(json.dumps(res, indent=2)[:2500])
print()

if res.get("ok") and res.get("data"):
    print("=" * 70)
    print("TEST 2: Extract first result's snippet to AI for price extraction")
    print("=" * 70)
    data = res["data"]
    # Try various shapes
    items = data.get("results") or data.get("data", {}).get("results") or data.get("items") or []
    if not items and isinstance(data, list):
        items = data
    if items:
        first = items[0]
        title = first.get("title", "")
        snippet = first.get("snippet") or first.get("description") or first.get("body", "")
        url = first.get("url") or first.get("link") or ""
        print(f"First result:")
        print(f"  title:   {title[:80]}")
        print(f"  url:     {url[:80]}")
        print(f"  snippet: {snippet[:200]}")
        print()
        # AI extraction
        prompt = (
            "Extract the product price in IDR from this search result. "
            "Reply with ONLY a JSON object: {\"price_idr\": <number>, \"product_name\": <string>, \"confidence\": \"high|medium|low\"}. "
            "If no price, return {\"price_idr\": null}."
        )
        context = f"Title: {title}\nURL: {url}\nSnippet: {snippet}"
        ai_res = vexo_post("/api/ai/gptoss120b", {"prompt": prompt, "context": context, "intent": "general"})
        print(f"AI extraction result:")
        print(json.dumps(ai_res, indent=2)[:1500])
    else:
        print("No items in response to test AI")
