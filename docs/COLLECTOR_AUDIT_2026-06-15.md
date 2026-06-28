# Collector Architecture Audit (2026-06-15)

## Summary

Tiga sistem Python collectors exist dengan status berbeda. **Rekomendasi: hapus `collectors/`** setelah verifikasi final dan pivot semua workflow ke `tools/price-collector/` + `tools/refresh_cron.py`.

## 1. `collectors/` — DEPRECATED (per DEPRECATED.md)

**Status:** Legacy, deprecated since 2026-06-09.

**Isi:** 44 file:
- 5 core: `base_collector.py`, `tokopedia_collector.py`, `bukalapak_collector.py`, `cron_scraper.py`, `ingestion_client.py`
- 25 debug/one-off/test scripts: `debug_*.py`, `test_*.py`, `fix_*.py`, `phase_*.py`, `backfill_*.py`, `use_*.py`, `vexo_*.py`, `image_*.py`
- Config: `config.py`, `requirements.txt`
- Docs: `README.md`, `DEPRECATED.md`

**Real use:** None. Vercel cron panggil Next.js route `/api/cron/prices` (bukan Python). CI tidak panggil Python. `cron_scraper.py` (yang sudah di-edit untuk OR filter) adalah orphaned script.

**Edit terakhir:** `cron_scraper.py` (commit `6ca2a1f`) — filter `crawl_status IN (pending, queued)`. Tidak dipakai runtime, tapi disimpan untuk reference.

**Risk kalau dihapus:** Low. Tidak ada CI/CD dependency. README + DEPRECATED.md eksplisit arahkan user ke `tools/`.

**Rekomendasi:** Hapus setelah user verify nothing in `tools/` atau Vercel cron panggil `collectors/`.

## 2. `tools/price-collector/` — PRODUCTION (semi-manual browser tool)

**Status:** Active, **transparency-first** design.

**Isi (10 file):**
- `collector.py` — main entry
- `api_client.py` — POST ke `/api/ingestion/offer-snapshot` dengan INGESTION_SECRET
- `base_collector.py`, `config.py`, `normalizer.py`, `generic_parser.py`, `queue_collector.py`
- `marketplaces/tokopedia.py`, `marketplaces/shopee.py`
- `README.md`, `QUEUE_COLLECTOR.md`, `README_BATCH.md`, `requirements.txt`

**Cara kerja:** Admin (user) menjalankan CLI semi-manual dari laptop:
- Browse ke product URL di visible browser (headless=false default)
- Extract data via Playwright
- POST ke `/api/ingestion/offer-snapshot` (yang kita sudah audit di Fase 2)
- Server simpan ke tabel `offers` + `price_snapshots`

**Ethics:** NO anti-detection, NO stealth, NO bot hiding. Respectful rate limiting (2-5s). Sesuai policy BijakBeli (compare harga public).

**Gap yang ditemukan:**
1. **No monitoring/alerting** — kalau script crash, tidak ada notifikasi. Acceptable karena manual tool.
2. **Single host deployment** — depends on user's local Playwright install. Acceptable per design.

**Verdict:** ✅ Production-ready, no changes needed.

## 3. `tools/refresh_cron.py` — AUTOMATED ENQUEUE (systemd cron)

**Status:** Active, runs on user's VPS via crontab (per docstring: `*/30 * * * *`).

**Cara kerja:**
1. Hit API untuk calculate refresh priority untuk semua crawl_targets
2. Enqueue high-priority targets
3. Trigger `tools/price-collector` untuk queued targets
4. Update `crawl_targets` table

**Verdict:** ✅ Production-ready.

**Concern:** Kalau VPS down → silent failure (cron tidak jalan). User aware, per memory: "monitoring di VPS minim untuk hemat token".

## Cross-cutting Findings

### Monitoring/Alerting Gap
- **Status:** Tidak ada alerting untuk collector failures.
- **Impact:** Medium. Manual tool bisa undetected crash. Automated cron silently fails kalau VPS down.
- **Acceptable?** **Yes**, by design (user preference: "hemat token", "essential-only automation").
- **Mitigation:** User monitor manual via VPS logs.

### Code duplication
- `base_collector.py` exist di `collectors/` DAN `tools/price-collector/`. Different implementations.
- `config.py` sama-sama ada. Different env handling.
- `tokopedia_collector.py` vs `marketplaces/tokopedia.py` — different parsers.

**Rekomendasi:** Konsolidasi via hapus `collectors/` (1 source of truth = `tools/`).

### Test coverage
- 25 test/debug/fix scripts di `collectors/` — kebanyakan one-off untuk debugging session spesifik.
- `tools/price-collector/` punya `output/` directory (run results), no formal tests.
- **Acceptable:** Manual tool tidak butuh unit test suite. Integration test via real browser session.

## Decision (2026-06-15)

**Defer deletion of `collectors/` ke Fase 3** karena:
1. `cron_scraper.py` masih punya history edit (commit `6ca2a1f`)
2. User mungkin masih reference di shell history / scripts
3. Tidak blocking — `tools/` is source of truth

**Actionable untuk user:**
- Review apakah `collectors/cron_scraper.py` masih dipakai. Kalau tidak, boleh dihapus batch dengan `collectors/` lain.

**No code changes required for production.**
