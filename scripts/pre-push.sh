#!/bin/bash
# Pre-push hook: run lint, typecheck, and unit tests before pushing to remote.
# E2E (Playwright) tests are NOT included — they need Chrome + dev server, too heavy for a hook.
# To bypass: git push --no-verify

set -e

echo "▶ Running pre-push checks..."
echo ""

# 1. Lint (eslint)
echo "  [1/3] lint..."
npx eslint . --max-warnings=999 --quiet 2>&1 | grep -E "^$|^src/|^__tests__/" | head -20
echo "  ✓ lint passed"

# 2. Typecheck
echo "  [2/3] typecheck..."
npx tsc --noEmit 2>&1 | grep -E "^src/|^__tests__/" | head -20
echo "  ✓ typecheck passed"

# 3. Unit tests (vitest, exclude integration tests that need Supabase env)
echo "  [3/3] unit tests..."
npx vitest run --exclude "**/*.integration.test.*" --exclude "**/migration-variant*" 2>&1 | tail -15
echo "  ✓ tests passed"

echo ""
echo "✅ All pre-push checks passed. Pushing..."
