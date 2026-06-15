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
    _extract_digits,
    _extract_regex,
    _last_word_before,
    _parse_int,
    _parse_rupiah,
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


if __name__ == "__main__":
    unittest.main()
