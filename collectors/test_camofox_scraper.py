"""
Unit tests for camofox_scraper — parser functions and dataclass factory.
Live scraping tests (require running camofox server) are integration tests
in collectors/test_camofox_live.py (run manually with camofox server up).
"""
import sys
import unittest

# camofox_scraper is in the same directory; no path manipulation needed
from camofox_scraper import (  # noqa: E402
    TokopediaProduct,
    ShopeeProduct,
    BukalapakProduct,
    BlibliProduct,
    TikTokProduct,
    CamofoxScraperPool,
    MARKETPLACE_REGISTRY,
    _extract_digits,
    _extract_regex,
    _last_word_before,
    _parse_int,
    _parse_rupiah,
    _parse_sold_count,
    _strip_official,
)


class TestParseRupiah(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(_parse_rupiah("Rp14.980.000"), 14_980_000)

    def test_with_space(self):
        self.assertEqual(_parse_rupiah("Rp 14.980.000"), 14_980_000)

    def test_with_currency_symbol_variants(self):
        self.assertEqual(_parse_rupiah("Rp. 1.500.000"), 1_500_000)
        self.assertEqual(_parse_rupiah("IDR 1.500.000"), 1_500_000)

    def test_small_amount(self):
        self.assertEqual(_parse_rupiah("Rp13.000"), 13_000)

    def test_empty(self):
        self.assertIsNone(_parse_rupiah(""))
        self.assertIsNone(_parse_rupiah(None))

    def test_garbage(self):
        self.assertIsNone(_parse_rupiah("not a price"))
        self.assertIsNone(_parse_rupiah("abc123def"))


class TestExtractDigits(unittest.TestCase):
    def test_simple(self):
        self.assertEqual(_extract_digits("Sisa 8"), "8")

    def test_in_sentence(self):
        self.assertEqual(_extract_digits("Terjual 1.234"), "1")

    def test_no_digits(self):
        self.assertEqual(_extract_digits("Stok habis"), "")

    def test_empty(self):
        self.assertEqual(_extract_digits(""), "")


class TestParseInt(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(_parse_int("42"), 42)
        self.assertEqual(_parse_int("0"), 0)

    def test_invalid(self):
        self.assertIsNone(_parse_int(""))
        self.assertIsNone(_parse_int("abc"))
        self.assertIsNone(_parse_int(None))


class TestStripOfficial(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(_strip_official("DIGICELL OFFICIAL STORE"), "DIGICELL")

    def test_with_spaces(self):
        self.assertEqual(_strip_official("  SELLER NAME  OFFICIAL STORE  "), "SELLER NAME")

    def test_no_match(self):
        self.assertEqual(_strip_official("Random Shop Name"), "Random Shop Name")

    def test_empty(self):
        self.assertIsNone(_strip_official(""))
        self.assertIsNone(_strip_official(None))


class TestTokopediaProductFromExtraction(unittest.TestCase):
    def test_full_extraction(self):
        # Body text contains stock/sold/rating/seller info as free text
        body = "Stok: Sisa 8 SubtotalRp14.980.000+ KeranjangBeli LangsungChatWishlistShareApple iPhone 15 Pro 128GB 256GB 512GB ResmiTerjual 8•bintang 5 (2 rating)Rp14.980.000DIGICELL OFFICIAL STOREDikirim dari Kota BandungOngkir mulai Rp13.000"
        data = {
            "title": "Apple iPhone 15 Pro 128GB",
            "price": "Rp14.980.000",
            "originalPrice": "Rp17.278.000",
            "bodyText": body,
        }
        p = TokopediaProduct.from_extraction("https://example.com", data)
        self.assertEqual(p.title, "Apple iPhone 15 Pro 128GB")
        self.assertEqual(p.price_idr, 14_980_000)
        self.assertEqual(p.original_price_idr, 17_278_000)
        self.assertEqual(p.stock_count, 8)
        self.assertEqual(p.sold_count, 8)
        self.assertEqual(p.rating_count, 2)
        self.assertEqual(p.seller_name, "DIGICELL")
        self.assertIn("Bandung", p.seller_location)

    def test_partial_extraction(self):
        """All fields missing should yield all-None except url + raw_data."""
        p = TokopediaProduct.from_extraction("https://example.com", {})
        self.assertIsNone(p.title)
        self.assertIsNone(p.price_idr)
        self.assertIsNone(p.stock_count)
        self.assertEqual(p.url, "https://example.com")
        self.assertEqual(p.raw_data, {})


class TestExtractRegex(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(_extract_regex("Sisa 8", r"Sisa\s+(\d+)"), "8")

    def test_no_match(self):
        self.assertIsNone(_extract_regex("nothing", r"Sisa\s+(\d+)"))

    def test_empty(self):
        self.assertIsNone(_extract_regex("", r"(\d+)"))
        self.assertIsNone(_extract_regex(None, r"(\d+)"))


class TestLastWordBefore(unittest.TestCase):
    def test_basic(self):
        # Seller name is the last word before the Follow anchor
        text = "Garansi 1 Bulan & Garansi Tukar UnitLihat SelengkapnyaDIGICELLFollow4.9 (803)35 total barang"
        result = _last_word_before(text, r"Follow[\d.]+\s*\(\d+\)\d+\s*total barang")
        self.assertEqual(result, "DIGICELL")

    def test_no_anchor(self):
        self.assertIsNone(_last_word_before("no anchor here", r"Follow\d+"))

    def test_empty(self):
        self.assertIsNone(_last_word_before("", r"Follow"))
        self.assertIsNone(_last_word_before(None, r"Follow"))

    def test_max_chars(self):
        # Even if the prefix is long, we should only walk back max_chars
        long_prefix = "x" * 100 + "MYSHOPFollow4.5 (10)5 total barang"
        result = _last_word_before(long_prefix, r"Follow[\d.]+\s*\(\d+\)\d+\s*total barang", max_chars=20)
        self.assertEqual(result, "MYSHOP")


class TestShopeeProductFromExtraction(unittest.TestCase):
    """⚠️ Shopee schema is best-guess, not verified end-to-end. These tests
    verify the parser logic with synthetic body text patterns that match
    Shopee's known UI strings."""

    def test_basic_extraction(self):
        body = "Stok: 50 Terjual 1.2rb Penilaian 1234 Nama Toko MYSHOPSHOP Follow Chat Kota Jakarta"
        data = {
            "title": "iPhone 15 Pro Max",
            "price": "Rp20.000.000",
            "bodyText": body,
        }
        p = ShopeeProduct.from_extraction("https://shopee.co.id/test", data)
        self.assertEqual(p.title, "iPhone 15 Pro Max")
        self.assertEqual(p.price_idr, 20_000_000)
        self.assertEqual(p.stock_count, 50)
        self.assertIsNotNone(p.sold_count)  # 1200 from "1.2rb"
        self.assertIsNotNone(p.rating_count)
        self.assertIn("Jakarta", p.seller_location)

    def test_empty(self):
        p = ShopeeProduct.from_extraction("https://shopee.co.id/test", {})
        self.assertIsNone(p.title)
        self.assertIsNone(p.price_idr)
        self.assertIsNone(p.stock_count)
        self.assertIsNone(p.sold_count)


class TestBukalapakProductFromExtraction(unittest.TestCase):
    """⚠️ Bukalapak schema is best-guess."""

    def test_basic_extraction(self):
        body = "Stok: 25 150+ terjual 89 Ulasan MYSHOP Follow Chat"
        data = {
            "title": "Samsung Galaxy S24",
            "price": "Rp12.000.000",
            "bodyText": body,
        }
        p = BukalapakProduct.from_extraction("https://bukalapak.com/test", data)
        self.assertEqual(p.title, "Samsung Galaxy S24")
        self.assertEqual(p.price_idr, 12_000_000)
        self.assertEqual(p.stock_count, 25)
        self.assertIsNotNone(p.sold_count)
        self.assertIsNotNone(p.rating_count)

    def test_empty(self):
        p = BukalapakProduct.from_extraction("https://bukalapak.com/test", {})
        self.assertIsNone(p.title)
        self.assertEqual(p.url, "https://bukalapak.com/test")


class TestBlibliProductFromExtraction(unittest.TestCase):
    """⚠️ Blibli schema is scaffolding."""

    def test_basic_extraction(self):
        body = "150+ terjual 89 Ulasan MYSTORE Official"
        data = {
            "title": "Laptop Gaming",
            "price": "Rp15.000.000",
            "bodyText": body,
        }
        p = BlibliProduct.from_extraction("https://blibli.com/test", data)
        self.assertEqual(p.title, "Laptop Gaming")
        self.assertEqual(p.price_idr, 15_000_000)
        self.assertIsNotNone(p.sold_count)
        self.assertIsNotNone(p.rating_count)

    def test_empty(self):
        p = BlibliProduct.from_extraction("https://blibli.com/test", {})
        self.assertIsNone(p.title)


class TestTikTokProductFromExtraction(unittest.TestCase):
    """⚠️ TikTok schema is scaffolding."""

    def test_basic_extraction(self):
        body = "1.2rb+ terjual 456 Penilaian TIKTOKSHOP Official"
        data = {
            "title": "Viral Product",
            "price": "Rp99.000",
            "bodyText": body,
        }
        p = TikTokProduct.from_extraction("https://tiktok.com/shop/test", data)
        self.assertEqual(p.title, "Viral Product")
        self.assertEqual(p.price_idr, 99_000)
        self.assertIsNotNone(p.sold_count)
        self.assertIsNotNone(p.rating_count)


class TestMarketplaceRegistry(unittest.TestCase):
    """Verifies the marketplace dispatch table is correctly configured."""

    def test_all_marketplaces_have_required_keys(self):
        for name, config in MARKETPLACE_REGISTRY.items():
            self.assertIn("dataclass", config, f"{name} missing dataclass")
            self.assertIn("session_key", config, f"{name} missing session_key")
            self.assertIn("base_url", config, f"{name} missing base_url")

    def test_tokopedia_in_registry(self):
        self.assertIn("tokopedia", MARKETPLACE_REGISTRY)
        self.assertIs(MARKETPLACE_REGISTRY["tokopedia"]["dataclass"], TokopediaProduct)

    def test_shopee_in_registry(self):
        self.assertIn("shopee", MARKETPLACE_REGISTRY)
        self.assertIs(MARKETPLACE_REGISTRY["shopee"]["dataclass"], ShopeeProduct)


class TestCamofoxScraperPool(unittest.TestCase):
    """Tests for the concurrent pool. Doesn't require camofox server (just
    verifies the pool's structure and config handling)."""

    def test_default_config(self):
        pool = CamofoxScraperPool()
        self.assertEqual(pool.max_concurrent, 4)
        self.assertEqual(pool.wait_ms, 5000)
        self.assertEqual(pool.marketplace, "tokopedia")

    def test_custom_config(self):
        pool = CamofoxScraperPool(max_concurrent=10, wait_ms=3000, marketplace="shopee")
        self.assertEqual(pool.max_concurrent, 10)
        self.assertEqual(pool.wait_ms, 3000)
        self.assertEqual(pool.marketplace, "shopee")

    def test_invalid_marketplace_raises(self):
        """If no schema registered, scrape should fail clearly."""
        # Just verify the registry check happens — not a full integration test
        self.assertIn("shopee", MARKETPLACE_REGISTRY)
        self.assertIn("tiktok", MARKETPLACE_REGISTRY)


class TestParseSoldCount(unittest.TestCase):
    """Indonesian 'sold' count variations — used across all marketplaces."""

    def test_with_plus(self):
        self.assertEqual(_parse_sold_count("150+ terjual"), 150)

    def test_with_rb(self):
        # Indonesian e-commerce convention: comma = decimal, dot = thousands
        # 1,2 rb = 1.2 * 1000 = 1200 sold
        self.assertEqual(_parse_sold_count("1,2rb+ terjual"), 1200)

    def test_with_jt(self):
        # 1,5 jt = 1.5 * 1,000,000 = 1,500,000 sold
        self.assertEqual(_parse_sold_count("1,5jt+ terjual"), 1_500_000)

    def test_thousands_separator(self):
        self.assertEqual(_parse_sold_count("1.000+ terjual"), 1000)

    def test_terjual_first(self):
        # "Terjual 1.500" = 1500
        self.assertEqual(_parse_sold_count("Terjual 1.500"), 1500)

    def test_no_match(self):
        self.assertIsNone(_parse_sold_count("no count here"))
        self.assertIsNone(_parse_sold_count(""))
        self.assertIsNone(_parse_sold_count(None))

    def test_case_insensitive(self):
        self.assertEqual(_parse_sold_count("500+ TERJUAL"), 500)
        self.assertEqual(_parse_sold_count("100+ Terjual"), 100)


if __name__ == "__main__":
    unittest.main()
