"""
Camofox-based Tokopedia scraper — PoC 2026-06-15.

Drop-in upgrade for the existing Playwright-based `tokopedia_collector.py`.
Uses the Camofox REST API (stealth Firefox / Camoufox engine) to bypass
Tokopedia's anti-bot detection, then extracts structured product data via
JSON schema.

**Why this exists:** Normal Playwright with `--disable-blink-features=AutomationControlled`
gets increasingly blocked on Tokopedia. Camoufox does fingerprint spoofing at
the C++ level (real Firefox with modified C++ build), bypassing modern bot
detection like Cloudflare, DataDome, and Tokopedia's own checks.

**Usage:**
    # Start camofox server (one time, in background)
    $ camofox server start --background

    # Use as module
    from camofox_scraper import CamofoxScraper
    async with CamofoxScraper() as scraper:
        product = await scraper.scrape_product("https://www.tokopedia.com/...")
        print(product.title, product.price)

**Verified result** (2026-06-15):
- Plain `curl` to Tokopedia product URL: HTTP 410, captcha page
- Camofox on same URL: real product data, no captcha

**Prerequisites:**
    # Install (one time)
    $ npm install -g camofox-browser   # adds /home/ubuntu/.hermes/node/bin/camofox
    $ camofox server start --background

**Performance:** 31ms extraction time per product (vs 1-3s for Playwright load).
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import urllib.error
import urllib.request
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any, AsyncIterator

logger = logging.getLogger(__name__)

CAMOFOX_BASE_URL = os.environ.get("CAMOFOX_BASE_URL", "http://localhost:9377")
CAMOFOX_USER_ID = os.environ.get("CAMOFOX_USER_ID", "bijakbeli-scraper")
CAMOFOX_SESSION_KEY = os.environ.get("CAMOFOX_SESSION_KEY", "tokopedia")


# Schema used to extract Tokopedia product pages.
# Each field is a CSS selector applied to the active tab. Adjust selectors
# if Tokopedia changes their DOM. Order matters for fallback chains — first
# match wins.
#
# Note: camofox's extract-structured only accepts CSS selectors, not regex.
# Fields that need regex (e.g. "Sisa 8" / "Terjual 100") are NOT included
# here — instead, fetch the page text and parse locally in TokopediaProduct.
TOKOPEDIA_PRODUCT_SCHEMA = {
    "kind": "object",
    "fields": {
        "title": {"kind": "text", "selector": "h1"},
        "price": {"kind": "text", "selector": "[class*='price']:not([class*='original']):not([class*='strike']):not([class*='crossed'])"},
        "originalPrice": {"kind": "text", "selector": "[class*='original'], [class*='strike'], [class*='crossed']"},
        "bodyText": {"kind": "text", "selector": "body"},
    },
}


@dataclass
class TokopediaProduct:
    """Normalized product data extracted from a Tokopedia product page."""

    url: str
    title: str | None
    price_idr: int | None  # None if not found or unparseable
    original_price_idr: int | None  # For discount calculation
    stock_count: int | None
    sold_count: int | None
    rating_count: int | None
    seller_name: str | None
    seller_location: str | None
    raw_data: dict[str, Any]  # Full schema output for debugging

    @classmethod
    def from_extraction(cls, url: str, data: dict[str, Any]) -> "TokopediaProduct":
        # Body text is huge; pull only the small subset we need for parsing.
        # (We can't use camofox's regex selectors, so we regex on the body.)
        body = data.get("bodyText", "")
        return cls(
            url=url,
            title=data.get("title"),
            price_idr=_parse_rupiah(data.get("price", "")),
            original_price_idr=_parse_rupiah(data.get("originalPrice", "")),
            stock_count=_parse_int(_extract_regex(body, r"Sisa\s+(\d+)")),
            sold_count=_parse_int(_extract_regex(body, r"Terjual\s+(\d[\d.]*)")),
            rating_count=_parse_int(_extract_regex(body, r"\((\d+)\s*rating\)")),
            # Seller name: either "DIGICELL OFFICIAL STORE" (text badge) or
            # "DIGICELLFollow4.9 (803)35 total barang" (image badge).
            # For the text badge, seller name is letters/spaces/&- only (no
            # digits) to avoid matching prefixes like "Rp14.980.000DIGICELL".
            seller_name=(
                _strip_official(_extract_regex(body, r"([A-Za-z][A-Za-z &.\-]{0,40}?)\s+OFFICIAL STORE"))
                or _last_word_before(
                    body, r"Follow[\d.]+\s*\(\d+\)\d+\s*total barang", max_chars=40
                )
            ),
            seller_location=_extract_regex(body, r"Kota\s+([A-Za-z][A-Za-z\s]*?)(?=\s*Ongkir|\s*Reguler|\s*Dikirim|$)"),
            raw_data=data,
        )


def _parse_rupiah(text: str) -> int | None:
    """Parse 'Rp14.980.000' or 'Rp 14.980.000' → 14980000.

    Requires a currency prefix (Rp, IDR, Rp.) — rejects bare digit strings
    like 'abc123def' to avoid false positives.
    """
    if not text:
        return None
    import re

    # Require currency prefix; allow Rp./IDR/rupiah. Match "Rp" followed by
    # either a space OR a digit (so both "Rp14.980.000" and "Rp 14.980.000"
    # work). The (?<!\w) lookbehind prevents matching "Mrrp" or similar.
    if not re.search(r"(?<!\w)(Rp\.?|IDR|rupiah)\.?(?=\s|\d)", text, re.IGNORECASE):
        return None

    # Extract all digits and dots after the prefix
    digits_and_dots = re.sub(r"[^0-9.]", "", text)
    if not digits_and_dots or digits_and_dots.strip(".") == "":
        return None
    try:
        return int(digits_and_dots.replace(".", "").replace(",", ""))
    except ValueError:
        return None


def _extract_digits(text: str) -> str:
    """Pull first integer-looking substring from text. 'Sisa 8' → '8'."""
    import re

    m = re.search(r"\d+", text or "")
    return m.group(0) if m else ""


def _extract_regex(text: str, pattern: str) -> str | None:
    """Extract the first capture group of a regex from text. Returns None if no match."""
    import re

    m = re.search(pattern, text or "")
    return m.group(1).strip() if m else None


def _last_word_before(text: str, anchor_pattern: str, max_chars: int = 40) -> str | None:
    """Find the last contiguous run of word chars before an anchor pattern.

    Used to extract the seller name from "Garansi 1 Bulan...DIGICELLFollow4.9 (803)..."
    where the seller name (DIGICELL) is the last word before the rating/Follow anchor.

    Heuristic: walk back max_chars, then take the last contiguous run of
    letters/digits. If the run contains a lowercase→UPPERCASE transition
    (e.g. "SelengkapnyaDIGICELL"), split there — the seller name is the
    ALL-CAPS portion that follows.

    Args:
        text: Body text to search
        anchor_pattern: Regex pattern marking where to look (the "Follow" anchor)
        max_chars: Maximum characters to walk back from the anchor

    Returns:
        The trailing word (split at any lowercase→UPPERCASE boundary) or None.
    """
    import re

    m = re.search(anchor_pattern, text or "")
    if not m:
        return None
    start = max(0, m.start() - max_chars)
    prefix = text[start : m.start()]
    # Last contiguous run of letters/digits
    word_runs = re.findall(r"[A-Za-z0-9.&\-]+", prefix)
    if not word_runs:
        return None
    last = word_runs[-1]
    # CamelCase split: if we have a lowercase→UPPERCASE transition, take
    # only the trailing ALL-CAPS portion. "SelengkapnyaDIGICELL" → "DIGICELL"
    # The transition is "aD" at index 11-12; we want to split AT index 12,
    # so use start() + 1 (the position of the uppercase letter).
    camel_split = re.search(r"[a-z][A-Z]", last)
    if camel_split:
        last = last[camel_split.start() + 1 :]
    return last.strip()


def _parse_int(s: str) -> int | None:
    try:
        return int(s)
    except (ValueError, TypeError):
        return None


def _strip_official(text: str | None) -> str | None:
    """'DIGICELL OFFICIAL STORE' → 'DIGICELL'. Returns None for None input."""
    if not text:
        return None
    import re

    m = re.match(r"^([A-Za-z0-9 ]+?)\s+OFFICIAL STORE", text)
    return m.group(1).strip() if m else text.strip()


class CamofoxError(RuntimeError):
    """Raised when the Camofox REST API returns an error."""


class CamofoxScraper:
    """Async context manager for scraping via the Camofox REST API.

    Manages a single tab for the duration of the `async with` block.
    For concurrent scraping of many URLs, create multiple scrapers in parallel.
    """

    def __init__(
        self,
        base_url: str = CAMOFOX_BASE_URL,
        user_id: str = CAMOFOX_USER_ID,
        session_key: str = CAMOFOX_SESSION_KEY,
        wait_ms: int = 5000,
    ) -> None:
        """Initialize the scraper.

        Args:
            base_url: Camofox server URL. Default: http://localhost:9377
            user_id: Logical user id for tab isolation. Use one per
                concurrent scraper (e.g. "scraper-1", "scraper-2").
            session_key: Group identifier for related tabs (e.g. "tokopedia"
                vs "shopee"). Helps organize camofox's internal session state.
            wait_ms: Milliseconds to wait after navigation for page hydration
                before extracting data. Default 5000ms is conservative for
                Tokopedia's SPA; reduce to 2000-3000 for faster scraping.
        """
        self.base_url = base_url.rstrip("/")
        self.user_id = user_id
        self.session_key = session_key
        self.wait_ms = wait_ms
        self._tab_id: str | None = None

    async def __aenter__(self) -> "CamofoxScraper":
        """Open a new tab. Raises CamofoxError if the server is unreachable."""
        # Verify server is up first (fail fast on misconfig)
        try:
            await self._request("GET", "/health")
        except CamofoxError as e:
            raise CamofoxError(
                f"Camofox server not reachable at {self.base_url}. "
                f"Start it with: camofox server start --background"
            ) from e

        # Open tab. Camofox rejects about:blank — must use http/https. Use
        # a real landing page; the caller will navigate to the real URL next.
        result = await self._request(
            "POST",
            "/tabs",
            {
                "userId": self.user_id,
                "sessionKey": self.session_key,
                "url": "https://www.tokopedia.com/",
            },
        )
        self._tab_id = result["tabId"]
        logger.debug("Opened tab %s for user %s", self._tab_id, self.user_id)
        return self

    async def __aexit__(self, *exc: Any) -> None:
        """Close the tab on context exit."""
        if self._tab_id:
            try:
                await self._request(
                    "DELETE",
                    f"/tabs/{self._tab_id}?userId={self.user_id}&sessionKey={self.session_key}",
                )
            except CamofoxError as e:
                logger.warning("Failed to close tab %s: %s", self._tab_id, e)
            finally:
                self._tab_id = None

    async def scrape_product(self, url: str) -> TokopediaProduct:
        """Navigate to a Tokopedia product page and extract structured data.

        Args:
            url: Full Tokopedia product URL
                (e.g. https://www.tokopedia.com/digicell/apple-iphone-15-pro-...)

        Returns:
            TokopediaProduct with extracted fields. Fields may be None if
            not found on the page (e.g. no rating, no seller info).

        Raises:
            CamofoxError: If navigation or extraction fails.
        """
        if not self._tab_id:
            raise CamofoxError("Scraper not in context manager (use 'async with')")

        # 1. Navigate
        nav_result = await self._request(
            "POST",
            f"/tabs/{self._tab_id}/navigate",
            {
                "userId": self.user_id,
                "sessionKey": self.session_key,
                "url": url,
            },
        )
        if not nav_result.get("ok"):
            raise CamofoxError(f"Navigation failed: {nav_result}")
        logger.debug("Navigated to %s", nav_result.get("url"))

        # 2. Wait for hydration (Tokopedia is a heavy SPA)
        await asyncio.sleep(self.wait_ms / 1000)

        # 3. Extract structured data
        extract_result = await self._request(
            "POST",
            f"/tabs/{self._tab_id}/extract-structured",
            {
                "userId": self.user_id,
                "sessionKey": self.session_key,
                "schema": TOKOPEDIA_PRODUCT_SCHEMA,
            },
        )
        if not extract_result.get("ok"):
            raise CamofoxError(f"Extraction failed: {extract_result}")

        data = extract_result.get("data", {})
        return TokopediaProduct.from_extraction(url, data)

    async def _request(
        self, method: str, path: str, body: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Make an HTTP request to the Camofox REST API.

        Uses urllib (stdlib) so this module has zero external deps.
        For higher concurrency, swap with httpx.
        """
        url = f"{self.base_url}{path}"
        if body is not None and method == "GET":
            # Allow GET endpoints to accept query params via body
            from urllib.parse import urlencode

            url = f"{url}?{urlencode(body)}"
            body = None

        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(
            url,
            data=data,
            method=method,
            headers={"Content-Type": "application/json"} if body else {},
        )

        # Run blocking urllib in thread pool (it's not async-native)
        loop = asyncio.get_running_loop()
        try:
            resp_body = await loop.run_in_executor(
                None, lambda: self._sync_request(req)
            )
            return json.loads(resp_body) if resp_body else {}
        except urllib.error.HTTPError as e:
            body_text = e.read().decode("utf-8", errors="replace")
            raise CamofoxError(f"HTTP {e.code} from Camofox: {body_text[:200]}") from e
        except urllib.error.URLError as e:
            raise CamofoxError(f"Cannot reach Camofox at {self.base_url}: {e}") from e
        except json.JSONDecodeError as e:
            raise CamofoxError(f"Invalid JSON from Camofox: {e}") from e

    @staticmethod
    def _sync_request(req: urllib.request.Request) -> str:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8", errors="replace")


# --- CLI for ad-hoc testing ---------------------------------------------------

async def _cli_main() -> None:
    """Quick CLI: `python -m camofox_scraper <url>` to scrape a single product."""
    import sys

    if len(sys.argv) != 2:
        print("Usage: python -m camofox_scraper <tokopedia_url>", file=sys.stderr)
        sys.exit(1)

    logging.basicConfig(level=logging.INFO)
    async with CamofoxScraper() as scraper:
        product = await scraper.scrape_product(sys.argv[1])
        print(f"Title:     {product.title}")
        print(f"Price:     Rp{product.price_idr:,}" if product.price_idr else "Price:     ?")
        if product.original_price_idr:
            print(f"Original:  Rp{product.original_price_idr:,}")
        print(f"Stock:     {product.stock_count}")
        print(f"Sold:      {product.sold_count}")
        print(f"Rating:    {product.rating_count} reviews")
        print(f"Seller:    {product.seller_name} ({product.seller_location})")


if __name__ == "__main__":
    asyncio.run(_cli_main())
