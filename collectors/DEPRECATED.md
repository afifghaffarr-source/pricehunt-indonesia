# ⚠️ DEPRECATED - Use tools/price-collector instead

This folder contains **experimental collectors** that are NOT recommended for production use.

## Why Deprecated?

1. **Contains experimental/debug files:**
   - `test_stealth.py` - Anti-detection experiments (not ethical)
   - `debug_tokopedia.py` - Debug scripts
   - `test_real_2026.py` - Test files

2. **No clear transparency:**
   - Mixed approach between automation and semi-manual
   - Unclear boundaries on what's acceptable

3. **Duplicate with tools/price-collector:**
   - Official collector is in `tools/price-collector/`
   - Better structure, clearer ethics

## ✅ Use Instead

**Official collector:** `tools/price-collector/`

```bash
cd tools/price-collector
python collector.py --help
```

## 📦 Archive Status

This folder is kept for reference only. Files here:
- Should NOT be deployed to production
- Should NOT be used for live data collection
- May contain outdated or experimental code

## 🔄 Migration Path

If you have scripts using this collector:

1. Switch to `tools/price-collector/`
2. Update your cron jobs
3. Update your documentation

## 📋 Files in This Folder

| File | Status | Notes |
|------|--------|-------|
| `base_collector.py` | ⚠️ Old | Use tools/price-collector/base_collector.py |
| `tokopedia_collector.py` | ⚠️ Old | Use tools/price-collector/marketplaces/ |
| `test_stealth.py` | ❌ Experimental | Do NOT use in production |
| `debug_tokopedia.py` | ❌ Debug | For development only |
| `test_real_2026.py` | ❌ Test | For testing only |

## 🗑️ Removal Plan

This folder will be removed in a future release. Timeline:
- 2026-06-12: Marked as deprecated
- 2026-07-01: Archive to separate repo
- 2026-08-01: Remove from main branch

## 📞 Questions?

Contact: @AGR on Telegram
