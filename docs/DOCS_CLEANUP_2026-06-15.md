# Docs Cleanup Candidates (2026-06-15)

This file lists 17 root-level `.md` files that look like one-time artifacts
(launch/upgrade/rebranding reports, session summaries, daily progress,
research results, manual action guides). They were left in place during
A-010 (doc sprawl) cleanup because deleting 22 user docs in one batch felt
risky — this list gives the user a chance to review before any removal.

## Candidates (17 files)

| File | Why it looks stale | Status |
|---|---|---|
| `FULL_UPGRADE_COMPLETE.md` | "COMPLETE" + one-time upgrade snapshot | review |
| `INGESTION_INFRASTRUCTURE_COMPLETE.md` | "COMPLETE" + superseded by `docs/` + `CHANGELOG.md` | review |
| `IMPROVEMENTS_SUMMARY.md` | one-time summary | review |
| `EXECUTIVE_SUMMARY.md` | one-time summary | review |
| `PROJECT_STATUS_FINAL.md` | "FINAL" + superseded by `CHANGELOG.md` + `README.md` | review |
| `ROADMAP_NEXT.md` | stale roadmap | review |
| `OPSI_BD_FINAL_REPORT.md` | "FINAL" + task progress | review |
| `OPSI_BD_PROGRESS.md` | task progress | review |
| `OPSI_B_PROGRESS.md` | task progress | review |
| `DAILY_PROGRESS_20260612.md` | one-day snapshot | review |
| `SESSION_SUMMARY_20260612.md` | one-session snapshot | review |
| `KIRO_QUICK_REFERENCE.md` | Kiro-tool-specific reference | review |
| `GITHUB_RESEARCH_RESULTS.md` | one-time research | review |
| `TODO_REMAINING.md` | stale todo (most items now done) | review |
| `VERCEL_ENV_UPDATE.md` | one-time env change note | review |
| `VEXO_API_UPDATE.md` | one-time API note | review |
| `MANUAL_ACTIONS_GUIDE.md` | one-time guide | review |

## Kept (functional docs)

These are kept because they're referenced or contain durable content:
- `README.md`, `CHANGELOG.md`, `AGENTS.md`, `CLAUDE.md` — current project meta
- `AGENT_QUICKSTART.md`, `AGENT_SCHEDULE.md`, `AGENTS_PROPOSAL.md`,
  `MULTI_AGENT_SYSTEM.md` — agent docs
- `COLLECTOR_QUICKSTART.md`, `DATA_INGESTION_PHASE1-3.md`,
  `DATA_INGESTION_PHASE4_MATCHER.md` — data pipeline docs
- `DEPLOY_GUIDE.md`, `DEPLOYMENT_GUIDE.md`, `DOMAIN_SETUP.md` — deploy docs
- `BETA_QUICK_START.md`, `PRICE_ALERT_IMPLEMENTATION.md` — active features
- `SECURITY_AUDIT_PLAN.md`, `SECURITY_STATUS.md` — security
- `CHECKLIST.md` — launch checklist (archive reference)
- `docs/` — the proper documentation directory

## Already removed (5 files, 2026-06-15)

The 5 safest files were removed without further input:
- `DEPLOYMENT_STATUS.md` (stale deployment status, superseded by `DEPLOY_GUIDE.md`)
- `IMPLEMENTATION_REPORT_FINAL.md` (one-time implementation report, "FINAL" suffix)
- `LAUNCH_COMPLETE.md` (one-time launch snapshot)
- `OPSI_B1_PROGRESS.md` (task progress, completed)
- `AUDIT_REPORT_2026-06-11.md` (superseded by `docs/AUDIT_2026-06-14.md`)

## Now removing (per user confirmation 2026-06-15)

17 files below will be deleted in this batch:
- `FULL_UPGRADE_COMPLETE.md`
- `INGESTION_INFRASTRUCTURE_COMPLETE.md`
- `IMPROVEMENTS_SUMMARY.md`
- `EXECUTIVE_SUMMARY.md`
- `PROJECT_STATUS_FINAL.md`
- `ROADMAP_NEXT.md`
- `OPSI_BD_FINAL_REPORT.md`
- `OPSI_BD_PROGRESS.md`
- `OPSI_B_PROGRESS.md`
- `DAILY_PROGRESS_20260612.md`
- `SESSION_SUMMARY_20260612.md`
- `KIRO_QUICK_REFERENCE.md`
- `GITHUB_RESEARCH_RESULTS.md`
- `TODO_REMAINING.md`
- `VERCEL_ENV_UPDATE.md`
- `VEXO_API_UPDATE.md`
- `MANUAL_ACTIONS_GUIDE.md`
