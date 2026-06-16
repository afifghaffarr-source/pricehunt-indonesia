#!/usr/bin/env python3
"""Check which missing tables are referenced by app code (src/ and tools/)."""
import re
from pathlib import Path

MISSING = {
    'admin_users', 'api_source_categories', 'api_source_credentials',
    'api_source_health_checks', 'api_source_usage_logs', 'api_sources',
    'job_logs', 'product_reviews', 'review_helpfulness', 'review_votes',
    'reviews',
}

# Find all references to these tables in src/ and tools/
refs = {table: [] for table in MISSING}
for root in ['src', 'tools']:
    p = Path(root)
    if not p.exists():
        continue
    for f in p.rglob('*'):
        if f.is_file() and f.suffix in ('.ts', '.tsx', '.js', '.jsx', '.py'):
            try:
                content = f.read_text()
            except Exception:
                continue
            for table in MISSING:
                # Match the table name as a whole word, in string literals or .from()
                patterns = [
                    rf"['\"`]({table})['\"`]",          # "table_name"
                    rf"\.from\(['\"`]({table})['\"`]\)",  # .from('table_name')
                ]
                for pat in patterns:
                    for m in re.finditer(pat, content):
                        line_no = content[:m.start()].count('\n') + 1
                        rel = f.relative_to(Path('.'))
                        refs[table].append(f"{rel}:{line_no}")

# Print results
print('=== USAGE OF MISSING TABLES (src/ + tools/) ===\n')
for table in sorted(MISSING):
    usages = refs[table]
    if usages:
        print(f'⚠️  USED: {table}  ({len(usages)} refs)')
        for u in usages[:5]:
            print(f'      {u}')
        if len(usages) > 5:
            print(f'      ... +{len(usages)-5} more')
    else:
        print(f'✅ UNUSED: {table}')
    print()
