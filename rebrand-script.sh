#!/bin/bash
# BijakBeli.app Rebranding Script
# Replaces all PriceHunt references with BijakBeli

set -e

echo "🚀 Starting BijakBeli.app Rebranding..."
echo "Working directory: $(pwd)"

# Backup before changes
echo "📦 Creating backup..."
tar -czf ../bijakbeli-backup-$(date +%Y%m%d-%H%M%S).tar.gz . --exclude=node_modules --exclude=.next --exclude=.git

# Replace text patterns (case-sensitive)
echo "🔄 Replacing text patterns..."

# Pattern 1: PriceHunt Indonesia → BijakBeli.app
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.md" -o -name "*.sql" \) \
  ! -path "./node_modules/*" ! -path "./.next/*" ! -path "./.git/*" \
  -exec sed -i 's/PriceHunt Indonesia/BijakBeli.app/g' {} \;

# Pattern 2: PriceHunt → BijakBeli
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.md" -o -name "*.sql" \) \
  ! -path "./node_modules/*" ! -path "./.next/*" ! -path "./.git/*" \
  -exec sed -i 's/PriceHunt/BijakBeli/g' {} \;

# Pattern 3: pricehunt-indonesia → bijakbeli-app
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.md" -o -name "*.sql" \) \
  ! -path "./node_modules/*" ! -path "./.next/*" ! -path "./.git/*" \
  -exec sed -i 's/pricehunt-indonesia/bijakbeli-app/g' {} \;

# Pattern 4: pricehunt → bijakbeli (lowercase)
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.md" -o -name "*.sql" \) \
  ! -path "./node_modules/*" ! -path "./.next/*" ! -path "./.git/*" \
  -exec sed -i 's/pricehunt/bijakbeli/g' {} \;

echo "✅ Text replacement complete!"
echo "📊 Modified files:"
git status --short | wc -l
