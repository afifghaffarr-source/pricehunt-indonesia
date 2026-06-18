# API surface

Next.js API routes live in `src/app/api/*`. All routes are co-located with their handler; `route.ts` exports HTTP method functions.

## Conventions
- All `/api/admin/*` routes require `requireAdmin(request)` (see [admin-auth.ts](../src/lib/admin-auth.ts))
- All mutating routes require a valid CSRF token (`x-csrf-token` header matches cookie)
- Body validation via `z` schema in `src/lib/validation.ts`
- Standard error shape: `{ success: false, error: string }`

## Public routes

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/search` | Search products with pagination | Public |
| GET | `/api/deals` | Today's deals | Public |
| GET | `/api/products/[slug]` | Product detail | Public |
| POST | `/api/price-report` | Submit a price report | User |
| POST | `/api/recheck-request` | Request price recheck | User |
| GET | `/api/recommendation/buy-or-wait/[slug]` | Buy/wait decision | Public |
| POST | `/api/auth/*` | Login, signup, logout, session | Various |
| POST | `/api/wishlist/*` | Add/remove wishlist | User |
| POST | `/api/price-alert/*` | Create/delete price alert | User |

## Admin routes (require admin)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/data-collection/conflicts` | List unresolved conflicts |
| POST | `/api/admin/data-collection/resolve-conflict` | Resolve a conflict |
| GET | `/api/admin/data-collection/rechecks` | List recheck requests |
| PATCH | `/api/admin/data-collection/rechecks/[id]` | Update recheck status |
| POST | `/api/admin/data-collection/manual-offer` | Insert manual offer |
| GET | `/api/admin/data-collection/offers` | List all offers |
| GET | `/api/admin/data-collection/stats` | Dashboard counts |

## Cron routes (require `CRON_SECRET`)

| Method | Path | Schedule |
|---|---|---|
| GET | `/api/cron/alerts` | Every 6h |
| GET | `/api/cron/prices` | Every 1h |
| GET | `/api/cron/digest` | Daily 9am |

See `vercel.json` for schedule definitions.

## See also
- [Architecture](architecture.md)
- [Database schema](database.md)
- [Testing strategy](testing.md)
- [Security audit plan](archive/SECURITY_AUDIT_PLAN.md)
