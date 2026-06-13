# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
## [2026-06-13 15:30]

### Feat
- Phase 1-2: Security hardening + schema sync


### Added

## [0.5.0] - 2026-06-11

### Added - Migration 110 Activation
- **Database Schema Applied:** 3 new tables (`crawl_targets`, `recheck_requests`, `price_reports`) + 5 new offer columns
- **Admin APIs Activated (5):** offers list, conflicts list, resolve conflict, rechecks list, update recheck status
- **User APIs Activated (2):** recheck request, price report submission
- **Column Naming:** Used `crawl_status`, `request_status`, `report_status` to avoid PostgreSQL reserved keywords
- **Documentation:** Created MIGRATION_110_ACTIVATION.md with complete activation log

### Changed
- Replaced all stubbed API endpoints (503 responses) with real Supabase implementations
- Updated migration 110 SQL file with correct column names
- Removed `@ts-ignore` comments from user-facing endpoints

### Fixed
- PostgreSQL reserved keyword conflicts (`status` → `crawl_status`/`request_status`/`report_status`)
- Foreign key constraints to auth.users (removed, using plain UUID + RLS policies) - PHASE 5: Automation & Refresh System (2026-06-11)
- **Refresh Priority Calculator** (`src/lib/refresh-priority.ts`)
  - Intelligent scoring: staleness, engagement, volatility, user requests
  - Dynamic crawl frequency: 1h to 48h based on priority
  - calculateRefreshPriority(), calculateNextCrawlTime()

- **Price Conflict Detection** (`src/lib/price-conflict.ts`)
  - Detects: price jumps, confidence drops, fake discounts, cross-marketplace anomalies
  - Severity levels: low/medium/high
  - Suggests resolution: review/recheck/flag

- **Refresh API Endpoints** (3 endpoints, stubbed until migration 110)
  - POST /api/refresh/calculate-priorities: Calculate priority scores
  - POST /api/refresh/trigger: Manually enqueue targets for refresh
  - GET /api/refresh/queue: Fetch pending crawl targets

- **Automation Script** (`tools/refresh_cron.py`)
  - Python CLI for automated refresh cron job
  - Fetches queue, triggers collector, Rich CLI output
  - Ready for crontab scheduling

### Changed - PHASE 4: Integration (2026-06-11)
- **Product Detail Page** (`src/app/product/[slug]/page.tsx`)
  - Replaced PriceComparisonTable with EnhancedPriceTable
  - Added DataTransparencyDisclaimer
  - Integrated all PHASE 4 metadata components
  - Mock data until migration 110

### Documentation
- Created docs/PHASE_5_PROGRESS.md (67% feature completion)

## [Unreleased - PHASE 4]

### Added - PHASE 4: User-Facing UI Features (2026-06-11)
- **Data Transparency Components** (9 new UI components)
  - ConfidenceBadge: Visual trust indicators (High/Medium/Low)
  - SourceLabel: Data source badges (Browser/Manual/Auto)
  - LastCheckedTimestamp: Relative time with stale warnings
  - StaleDataBadge: Compact "Data Lama" indicator
  - ValidationStatusAlert: Status-specific alerts for non-verified data
  - DataTransparencyDisclaimer: Legal disclaimer (2 variants)
  - RecheckPriceButton: User-triggered price refresh
  - ReportPriceForm: Modal for reporting incorrect prices
  - EnhancedPriceTable: Extended comparison table with metadata

- **API Endpoints** (stubbed, pending migration 110)
  - POST /api/recheck-request: User recheck requests
  - POST /api/price-report: Price error reporting

- **UI Components**
  - Dialog component (Radix UI wrapper)
  - Updated Select component

### Dependencies
- Added @radix-ui/react-dialog
- Added @radix-ui/react-select

### Documentation
- Created docs/PHASE_4_PROGRESS.md (86% feature completion)

## [Unreleased - PHASE 3]

### Added - PHASE 3: Admin Dashboard (2026-06-11)
- **Admin Data Collection Dashboard** (`/admin/data-collection`)
  - Statistics cards with real-time metrics (offers, conflicts, rechecks, stale data)
  - Offers management table with search and filters (status, marketplace)
  - Price conflicts resolution interface with side-by-side comparison
  - Recheck requests queue with priority scoring
  - Manual offer input form with full validation
  
- **UI Components** (7 new files)
  - `DataCollectionDashboard` - Main tabs container
  - `DataCollectionStats` - Statistics cards (server component)
  - `OffersList` - Searchable offers table with filters
  - `ConflictsList` - Price conflicts management
  - `RechecksList` - Recheck queue management
  - `ManualOfferForm` - Manual offer input form
  - Base UI: `Tabs`, `Label`, `Textarea` (Radix UI)

- **API Routes** (6 endpoints)
  - `GET /api/admin/data-collection/offers` - List offers with filters
  - `GET /api/admin/data-collection/conflicts` - List unresolved conflicts
  - `GET /api/admin/data-collection/rechecks` - List pending rechecks
  - `PATCH /api/admin/data-collection/rechecks/[id]` - Update recheck status
  - `POST /api/admin/data-collection/resolve-conflict` - Resolve conflict
  - `POST /api/admin/data-collection/manual-offer` - Submit manual offer

- **Documentation**
  - `docs/PHASE_3_COMPLETE.md` - Complete PHASE 3 documentation
  - `docs/DEPLOYMENT.md` - Production deployment guide
  - Updated `docs/PROGRESS.md` - Project progress tracker

### Changed
- Updated `README.md` with PHASE 1 & 2 progress (211 tests, Python collector)
- Added project structure with new `docs/` and collector directories

### Technical
- Installed `@radix-ui/react-tabs`, `@radix-ui/react-label`
- API routes use mock data until migration 110 applied
- Full implementations ready (commented out, awaiting migration)
- Next.js 16 async params API compatibility

### Notes
- **PHASE 3 Status:** Code complete (90%), blocked by migration 110
- **Files Created:** 16 files, ~2,400 lines
- **Activation Required:** Apply migration 110, uncomment implementations

---

## [2026-06-11 09:48] - PHASE 1 & 2: Data Collection System

### Added
- **Database Migration 110**: Enhanced data collection schema
  - New tables: `crawl_targets`, `recheck_requests`, `price_reports`
  - Enhanced `offers` table with validation_status, confidence_label, title, image_url, category_hint
  - Enhanced `price_snapshots` table with confidence scoring
- **API Endpoint**: `/api/ingestion/offer-snapshot` for single offer ingestion (419 lines)
- **Python Browser Collector**: Semi-automated data collection tool (1,631 lines)
  - 3 collection modes: manual (browser control), URL (direct), keyword (search & select)
  - Tokopedia collector with Apollo GraphQL cache extraction (tested & working)
  - Generic parser fallback for any marketplace
  - Rich CLI with preview, confirmation, and error handling
  - Data normalization matching server-side logic
  - Rate limiting and safety features (no captcha bypass, no PII)
- **Documentation**: Complete PHASE 1, PHASE 2, and progress tracking docs

### Changed
- Enhanced ingestion API route schema with new optional fields
- Updated collectors/tokopedia_collector.py with 2026 selectors

### Technical Details
- Migration 110: 216 lines SQL with RLS policies and indexes
- Browser collector: 9 Python files in tools/price-collector/
- Dependencies: Playwright, Rich, Click, Requests, Pydantic
- Test coverage: 211 tests passing
- Build status: ✅ Successful

## [2026-06-11 07:11]

### Changed
- Enhanced PriceHistoryChart component with best features from both versions
- Added date-fns Indonesian locale support for better date formatting
- Improved performance with 50 data point limit optimization
- Better Y-axis domain calculation with 10% padding
- Enhanced tooltip with null value filtering

### Removed
- Duplicate price-history-chart.tsx component
- 13 outdated PHASE*.md documentation files

## [2026-06-11 06:45]

### Fix
- Update dependencies and audit fixes

## [2026-06-11 06:00]

### Feat
- Add beautiful reports, auto-git workflow, and system improvements


## [1.2.0] - 2026-06-11

### Added
- Price history visualization component with Recharts
- Natural language support for Telegram interface
- Voice message transcription capability
- Simple command shortcuts (ph command)
- Beautiful report formatting for all automated reports
- Auto git workflow with changelog management
- Multi-agent system (4 autonomous + 5 specialist agents)

### Changed
- Improved Telegram UX patterns for non-technical users
- Enhanced cron job reports with visual formatting
- Updated all agent prompts to use beautiful-reports skill

### Fixed
- Dependencies updated (recharts, date-fns added)

### Security
- 4 moderate vulnerabilities detected (pending fix)

## [1.1.0] - 2026-06-10

### Added
- Phase 4 & 5 completion
- Push notifications system
- Legal compliance features
- Comprehensive testing suite (59 tests)

### Changed
- Updated testing infrastructure
- Enhanced documentation

## [1.0.0] - 2026-06-01

### Added
- Initial release
- Deal Score Engine (6-factor scoring system)
- Fake Discount Detector
- Buy/Wait Recommendation engine
- Supabase integration
- OpenAI integration
- 6 marketplace collectors (Python/Playwright)
- Next.js 16 with TypeScript
- Complete test suite with Vitest

---

**Note:** This changelog is automatically maintained. Each commit updates this file with relevant changes.
