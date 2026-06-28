# Security Policy

## Supported Versions

| Version | Supported           |
|---------|---------------------|
| v1.5.x  | Yes (current)       |
| v1.4.x  | Critical fixes only |
| < v1.4  | No                  |

## Reporting a Vulnerability

**JANGAN** buka public GitHub issue untuk vulnerability.

Email: security@bijakbeli.web.id (atau kontak maintainer langsung via Telegram)

Sertakan:
1. Description of vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (opsional)

Response time: 24-48 jam untuk acknowledgment, 7 hari untuk fix critical.

## Security Architecture

BijakBeli.app mengimplementasikan defense-in-depth:

### Authentication & Authorization
- **Session-based auth** via Supabase Auth (HTTP-only cookies, secure flags)
- **Service auth** untuk cron jobs dan Python collectors (`INGESTION_SECRET` Bearer token)
- **Admin routes** dilindungi `requireAdmin` helper dengan fail-closed semantics
- **CSRF** double-submit token untuk semua state-changing browser requests
- **Rate limiting** dual-tier (per-target + per-IP) untuk auth endpoints, fail-closed

### Database
- **Row Level Security (RLS)** enabled di semua tabel public
- Policies: public read untuk product data, service-role write untuk ingestion
- Foreign key constraints untuk data integrity
- Check constraints untuk enum-like columns (condition, validation_status, etc.)

### Transport & Headers
- HTTPS-only (HSTS 2-year, includeSubDomains, preload)
- CSP dengan allowlist untuk image + connect sources
- X-Frame-Options: DENY (no embedding)
- COOP/COEP/CORP untuk cross-origin isolation
- Permissions-Policy: camera/mic/geo/interest-cohort all disabled

### Application
- Input validation via Zod di semua POST endpoints
- Generic error messages (no user enumeration via timing)
- Supabase parameterized queries (SQL injection safe)
- 10s AbortController timeout di semua client-side fetches

### Edge Runtime Boundaries
- Routes yang pakai edge runtime TIDAK boleh panggil admin client (Node-only)
- `src/proxy.ts` enforces auth/CSRF layering

## Security Audit History

Lihat `docs/SECURITY_AUDIT_2026-06-15.md` dan `docs/SECURITY_AUDIT_PLAN.md` untuk full audit history. Latest comprehensive audit: 2026-06-17 (overall 7.5/10).

## Known Limitations

- **Vercel auto-deploy doesn't gate on CI** — bisa ship ke production dengan CI merah. Mitigasi: monitor Actions tab setelah push.
- **No Sentry** — production errors invisible. Setup Sentry planned (v1.5.13).
- **No error monitoring on cron jobs** — silent failures. Mitigated by daily cron report.

## Dependencies

- `npm audit` dijalanin per-PR via CI
- Dependabot auto-PR untuk minor/patch updates
- Major version updates manual review
