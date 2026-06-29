import pytest
from base_collector import _normalize_variant


class TestNormalizeVariant:
    def test_phone_storage_and_color(self):
        result = _normalize_variant("128GB Hitam")
        assert result["storage"] == "128GB"
        assert result["color"] == "hitam"
        assert result["ram"] is None

    def test_ram_and_color_indonesian(self):
        result = _normalize_variant("8GB RAM Putih")
        assert result["ram"] == "8GB"
        assert result["color"] == "putih"

    def test_full_attribute_string(self):
        # NB: "ultramarine" is NOT in the closed color list (limited to hitam/putih/merah/biru/hijau/ungu/emas/perak/black/white/red/blue/green/purple/pink/gold/silver/gray/grey). Expect None for color.
        result = _normalize_variant("iPhone 16 Pro Max 256GB Ultramarine 5G")
        assert result["storage"] == "256GB"
        assert result["color"] is None  # ultramarine not in list
        assert result["model"] == "max"
        assert result["connectivity"] == "5g"

    def test_empty_string(self):
        result = _normalize_variant("")
        assert all(v is None for v in result.values())

    def test_none(self):
        result = _normalize_variant(None)
        assert all(v is None for v in result.values())

    def test_storage_tb(self):
        result = _normalize_variant("1TB Silver")
        assert result["storage"] == "1TB"
        assert result["color"] == "silver"

    def test_dual_sim(self):
        result = _normalize_variant("Dual-SIM")
        assert result["connectivity"] == "dualsim"

    def test_nfc(self):
        result = _normalize_variant("with NFC")
        assert result["connectivity"] == "nfc"

    def test_color_english(self):
        result = _normalize_variant("256GB - Midnight Black")
        assert result["color"] == "black"

    def test_no_match(self):
        result = _normalize_variant("lorem ipsum dolor sit amet")
        assert all(v is None for v in result.values())
