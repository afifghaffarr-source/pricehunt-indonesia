# Contributing to BijakBeli.app

Terima kasih sudah tertarik untuk kontribusi ke BijakBeli.app. Project ini adalah platform price comparison untuk marketplace Indonesia dengan AI-powered insights.

## Cara Kontribusi

### Bug Reports
1. Cek [GitHub Issues](https://github.com/afifghaffarr-source/pricehunt-indonesia/issues) dulu, jangan duplicate
2. Buat issue baru dengan template:
   - **Bug**: judul jelas, repro steps, expected vs actual, screenshot/log
   - **Feature**: use case, mockup/wireframe, business value

### Pull Requests
1. Fork + branch dari `master` (nama: `fix/short-desc` atau `feat/short-desc`)
2. Ikuti code style existing (TypeScript strict, no `any`, no em-dash, no emoji in code)
3. Test lokal dulu: `npm run lint && npm run typecheck && npm test`
4. Update CHANGELOG.md di section "Unreleased" dengan entry sesuai format
5. Commit message conventional: `feat: ...`, `fix: ...`, `chore: ...`, `refactor: ...`
6. Push dan buka PR — auto-review dari CODEOWNERS akan trigger

### Code Style (Penting)

- **TypeScript strict mode** — zero tolerance untuk `any` baru (existing tracked di Phase 5 backlog)
- **No em-dash (`—`)** atau en-dash (`–`) di code, comments, atau user-facing text. Pakai regular hyphen `-`
- **No emoji** di code, markup, atau alt text
- **Banned fonts**: Inter, Roboto, Arial, Open Sans, Helvetica. Pakai Plus Jakarta Sans (sudah di-load)
- **Banned colors**: pure black `#000000`, AI purple gradients. Pakai semantic tokens
- **Comments**: Bahasa Inggris untuk code, Bahasa Indonesia untuk user-facing strings
- **Currency**: Format Rupiah `Rp 1.500.000` (dot thousands, no decimal)

### Commit Workflow (Per User Requirement)

Setiap selesai kerja:
```bash
git status
git add -A
git commit -m "<type>: <desc>"
eval "$(ssh-agent -s)" && ssh-add ~/.ssh/id_ed25519_github
git push
```

Vercel auto-deploy dari `master`. Untuk staging preview, push ke branch lain.

## Arsitektur Singkat

- **Frontend**: Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui (base-ui)
- **Backend**: Next.js API routes + Server Actions, Supabase (Postgres + Auth)
- **Data Pipeline**: Python browser collectors (Playwright + Camofox) → Next.js ingestion API → Supabase
- **AI**: OpenAI gpt-4o-mini untuk advice, VexoAPI untuk search
- **Deploy**: Vercel, Supabase managed Postgres
- **Testing**: Vitest (unit), Playwright (E2E), Lighthouse CI (perf)

Lihat `docs/` untuk audit history dan architectural decisions.

## Development Setup

```bash
# Clone
git clone https://github.com/afifghaffarr-source/pricehunt-indonesia
cd pricehunt-indonesia

# Install (use bun locally, npm on VPS)
bun install   # or: npm install
cp .env.local.example .env.local
# Edit .env.local dengan real Supabase + Vercel + VexoAPI keys

# Run
npm run dev   # localhost:3000

# Verify
npm run lint
npm run typecheck
npm test
npm run test:e2e   # requires playwright install first
```

## Security

Lihat [SECURITY.md](./SECURITY.md) untuk vulnerability reporting.

## License

MIT — see [LICENSE](./LICENSE).
