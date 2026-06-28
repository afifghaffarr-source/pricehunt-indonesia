#!/usr/bin/env python3
import re
from pathlib import Path

migration_dir = Path('supabase/migrations')
create_table_re = re.compile(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)', re.IGNORECASE)

table_to_migrations = {}
for f in sorted(migration_dir.glob('*.sql')):
    content = f.read_text()
    for match in create_table_re.finditer(content):
        table = match.group(1).lower()
        if table == 'as':
            continue
        table_to_migrations.setdefault(table, []).append(f.name)

PROD_TABLES = {
    'ai_cache', 'api_rate_limits', 'crawl_targets', 'data_sources',
    'ingestion_logs', 'marketplaces', 'offers', 'price_alerts',
    'price_conflicts', 'price_reports', 'price_snapshots',
    'products', 'recheck_requests', 'user_profiles', 'wishlists',
    'product_prices_view', 'offers_backup_20260612',
}

print('=== ALL TABLES DEFINED IN MIGRATIONS ===')
for table, migrations in sorted(table_to_migrations.items()):
    status = 'IN' if table in PROD_TABLES else 'OUT'
    dup = ' DUP' if len(migrations) > 1 else ''
    print(f'  [{status}{dup:4s}] {table:40s} <- {", ".join(migrations)}')

print()
print(f'Total: {len(table_to_migrations)}  In: {sum(1 for t in table_to_migrations if t in PROD_TABLES)}  Out: {sum(1 for t in table_to_migrations if t not in PROD_TABLES)}')
missing = sorted([t for t in table_to_migrations if t not in PROD_TABLES])
print(f'Missing: {", ".join(missing)}')
print()
print('=== DUPLICATES ===')
for table, migrations in sorted(table_to_migrations.items()):
    if len(migrations) > 1:
        print(f'  {table}: {migrations}')
