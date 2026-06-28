# Testing

## Test runner
- **Unit/integration**: Vitest (`npm run test`, `npm run test:watch`, `npm run test:coverage`)
- **E2E**: Playwright (`npm run test:e2e`)
- **Lighthouse**: Custom (`npm run lhci`)
- **Typecheck**: `tsc --noEmit` (`npm run typecheck`)
- **Lint**: ESLint (`npm run lint`)

## CI
GitHub Actions runs all of the above on every push to `master`. Build is blocked on any failure. See `.github/workflows/ci.yml`.

## Strategy

### Unit tests
- Pure functions in `src/lib/*` (no DB/network)
- Validation schemas
- Price calculations, deal scores, fake-discount detection
- Buy/wait decision logic

### Integration tests
- API routes with mocked Supabase
- Auth + admin guards
- CSRF protection
- DB layer with test fixtures

### E2E tests
- Browse flow: home → search → product detail
- Report price: submit form, verify DB insert
- Auth: signup, login, logout, session
- Admin: resolve conflict, manual offer

## Layout
- `src/**/__tests__/` — co-located unit tests
- `tests/integration/` — API route tests
- `tests/e2e/` — Playwright specs
- `tests/fixtures/` — seed data

## Conventions
- Test files: `*.test.ts` or `*.spec.ts`
- Mock Supabase via `vi.mock("@/lib/supabase/server")`
- Use real DB only for E2E; unit tests are fully mocked
- Coverage target: 70% on `src/lib/`, 50% on `src/app/`

## See also
- [Architecture](architecture.md)
- [API surface](api.md)
- [Production checklist](PRODUCTION_CHECKLIST.md)
- Test status: see [TEST_REPORT.md archive](archive/TEST_REPORT.md)
