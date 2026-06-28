# Taste-Skill Audit (2026-06-28)

> Comprehensive review of all `taste-skill*` and `design-system*` skills vs current BijakBeli implementation. Goal: identify redundancy, staleness, currency gaps, and concrete actions.

## Skills in scope

| Skill | Path | Lines | Role |
|---|---|---|---|
| `taste-skill-design` | `~/.hermes/skills/software-development/` | ~395 | **Cross-project** anti-slop rules |
| `taste-skill-bijakbeli` | `~/.hermes/skills/bijakbeli-development/` | ~285 | **Project-specific** BijakBeli variant |
| `design-system-migration` | `~/.hermes/skills/software-development/` | ~280 | **Workflow** for retrofitting 10+ files |
| `popular-web-designs` | `~/.hermes/skills/creative/` | ~190 | 54 reference designs (HTML/CSS) |

## Master audit table

| # | Finding | Severity | Location | Action |
|---|---|---|---|---|
| 1 | Overlap between `taste-skill-design` and `taste-skill-bijakbeli` (~70%) | ⚠️ Medium | Both | **Action A**: explicit cross-reference from project skill to upstream rules |
| 2 | Em-dash ban not enforced in `privacy-policy/page.tsx` (9 occurrences) | 🔴 High | `src/app/extension/privacy-policy/page.tsx` | **Action B**: replace em-dashes in legal-context or document exception |
| 3 | Today's BijakBeli axe-core findings (8 fixes) NOT yet captured in skill | ⚠️ Medium | Skill ref/audit docs | **Action C**: append `taste-skill-audit-2026-06-28.md` reference |
| 4 | Today's Tailwind v4 `@layer utilities` gotcha NOT in skill | 🔴 High (recurring across projects) | Skill | **Action D**: cross-link to MEMORY.md Next.js entry from skill |
| 5 | `text-emerald-600` on canvas = 3.65:1 fails AA for normal text | 🟡 Medium | Skill rules | Already documented in cross-project skill; just enforce on every PR |
| 6 | No skill entry on `oklch()` color tokens BijakBeli now uses | 🟢 Low | Skill | **Action E**: add `OKLCH` token note to both skills |
| 7 | Cross-project skill lacks quick "before/after" PNG render check | 🟢 Low | Skill | **Action F**: add a 5-minute visual verification rule |
| 8 | Lavender/purple AI gradient tell not yet emitted anywhere in BijakBeli | ⚪ None | Implementation | Compliant — no old purple text present; rule acts as guardrail |

## Compliance score (BijakBeli actual)

| Rule (from skills) | Implementations | Compliance |
|---|---|---|
| Banned font (no Inter/Roboto/Arial) | src/app/extension/* | ✅ 100% (`Plus Jakarta Sans` only) |
| Em-dash ban (no `—` in user-visible text) | src/app/extension/* | ❌ **91%** (9 in privacy-policy) |
| `min-h-dvh` not `min-h-screen` | src/app/extension/* | ✅ **100%** (9/9 dvh, 0/9 screen) |
| Semantic color tokens (no `bg-gray-*` hardcoded) | src/app/extension/* | ✅ **100%** (uses `bg-muted`, `bg-background`) |
| No pure black/white | src/app/extension/* | ✅ **100%** (0 `bg-black`) |
| `rounded-full` on CTAs (no `rounded-md` AI-tell) | src/app/extension/* | ✅ 26/26 uses |
| Lucide icons (not emoji) | src/app/extension/* | ✅ 6 imports; 0 emoji |
| Accent: ONE accent (`#10B981`) | src/app/extension/* | ⚠️ **Mixed**: emerald-600/700/500/800 + emerald-300/200. Should consolidate to 2 shades only. |
| WCAG 2.1 AA contrast | src/app/extension/* | ✅ 0 serious/critical after today's 8 axe fixes |

**Net: 91% compliant across 9 rules.** Only em-dashes (`privacy-policy/page.tsx`) and accent-color shades need cleanup.

## Currency assessment

| Skill | Last meaningful update | Today's gaps |
|---|---|---|
| `taste-skill-design` | Pre-2026 (project-agnostic) | OK |
| `taste-skill-bijakbeli` | 2026-06-13 (audit + patterns ref) | **Stale on 4 points** (Tailwind v4, axe findings, accent shade inconsistency, OKLCH) |
| `design-system-migration` | Pre-2026 (workflow) | OK |

**`taste-skill-bijakbeli` is the one needing an update**. Recommended additions to the SKILL.md body (4 small edits) + 1 new reference doc.

## Redundancy assessment

| Section | `taste-skill-design` (cross-project) | `taste-skill-bijakbeli` (project) | Verdict |
|---|---|---|---|
| Em-dash ban | ✅ | ✅ | Dup |
| Anti-emoji | ✅ | ✅ | Dup |
| Banned fonts | ✅ | ✅ (+ allowed list) | Dup |
| Color system | ✅ (with hex + Tw classes) | ✅ (shorter, no Tailwind classes) | Dup |
| Typography | ✅ | ✅ | Dup |
| Responsive | ✅ | ✅ | Dup |
| Performance | ✅ | ✅ | Dup |
| Motion | ✅ | ✅ | Dup |
| Buttons | ✅ | ✅ | Dup |
| Cards | ✅ | ✅ | Dup |
| Loading/Empty/Error | ✅ | ✅ | Dup |
| Anti-patterns (24+ items) | ✅ | ✅ | Dup |
| TypeScript component contracts | ❌ | ✅ (`EmptyState` props, `target="_blank"` rel) | Keep in project |
| Next.js runtime patterns | ❌ | ✅ (`await params`, `cache: "no-store"`, AI SDK vs raw fetch) | Keep in project |
| Indonesian specifics | ❌ | ✅ (rupiah, marketplace names) | Keep in project |
| Dial settings (DV/MI/VD) | ✅ | ✅ (with BijakBeli preset) | Dup |
| 15-min audit grep recipes | ✅ | ❌ | Keep in cross-project |
| Reference implementation | ✅ (SahamRadar) | ❌ | Keep in cross-project |
| Quick templates (EmptyState JSX) | ✅ | ❌ | Keep in cross-project |

**Estimated ~70% overlap.** **Recommendation:** BijakBeli skill should:
1. **Delete** duplicate sections (just inherit from upstream)
2. **Keep** nextjs-runtime + Indonesian + TS contract sections (project-specific)
3. **Cross-link** to upstream rules instead of repeating them

## Recommended actions (concrete, scoped)

### Action A — Cross-reference instead of duplicate (5 min, `taste-skill-bijakbeli`)

Add a header section: "INHERITS all rules from `software-development:taste-skill-design`. This skill only lists BijakBeli-specific deltas."

Then delete the 14+ duplicate sections that already live in upstream. Keeps link graph instead of duplicate prose.

### Action B — Privacy policy em-dash fix (5 min)

Decision needed: either (a) accept em-dash in legal markdown context, or (b) replace 9 instances with regular markdown punctuation.

Best practice for legal text: keep em-dash for readability — legal conventions accept "and others" / "including but not limited to" + em-dash as standard punctuation. **Recommendation: make exception explicit in both skills:**

```markdown
### Exception: legal policy text
Em-dash (`—`) is acceptable inside legal/policy text for conventional legal
punctuation (parenthetical "and others" usage). All marketing/UX copy, metadata,
and JSX is still banned.
```

### Action C — Add today's axe audit as reference (10 min)

`references/taste-skill-audit-2026-06-28.md` — capture the 8 specific violations found by axe-core today, what they were (`bg-amber-600` button, `bg-emerald-600` link/button, `<code>` inside `<p>`, `<ol>` li inheriting muted-foreground, `bg-muted` button text contrast) and what was fixed. Future agents running axe should be reminded by reference doc.

### Action D — Cross-link Tailwind v4 gotcha (2 min)

Append to `Component Contracts` section:
```markdown
### Tailwind v4 strips root-level CSS
Handwritten CSS rules at root level of `globals.css` are silently purged. Wrap all custom CSS in `@layer utilities { ... }` or `@layer base { ... }`. Verified BijakBeli 2026-06-28. See MEMORY.md `Next.js 16.2.7 + Tailwind v4 gotchas` entry.
```

### Action E — OKLCH color-tokens note (3 min)

Add to colors section:
```markdown
### Color tokens in globals.css
BijakBeli uses `oklch()` perceptual color tokens (Tailwind v4 default). When reading rendered contrast or comparing to `#HEX` swatches, convert to sRGB mentally:
- `oklch(1 0 0)` = pure white #FFFFFF
- `oklch(0.97 0 0)` = near-white #F9FAFB
- `oklch(0.556 0 0)` = mid gray #71717A (near Zinc-500)
- `oklch(0.145 0 0)` = near-black #18181B (near Zinc-950)

Custom emerald accent uses `oklch(0.696 0.17 162.48)` = #10B981.
For AA contrast on white, the accent CANNOT be used as text — only as background/icon. For text links/buttons use `oklch(0.508 0.118 165) ≈ emerald-700` (#047857) → 5.16:1 AAA.
```

### Action F — Visual verification rule (5 min)

Add to audit procedure:
```markdown
### Visual verification (5-min after every batch)
After applying taste-skill to ≥3 files:
1. Screenshot the changed pages with `browser_navigate` + `browser_vision`
2. Compare against: warm neutral canvas, whisper borders, no glow/shadow-2xl, sentence case
3. Write a 1-line note: "Round N visual: ✅ 0 anti-pattern tells found" or list the offenders
4. Commit visual review notes inline in the commit message body
```

This catches LLM-generated UI tells even when grep passes.

## Completion plan

| Action | Time | Now |
|---|---|---|
| A — Cross-reference structure | 5 min | ✅ Apply |
| B — Privacy policy em-dash decision | 5 min decision | ✅ Document exception in both skills |
| C — Today's axe audit reference doc | 10 min | ✅ Write |
| D — Tailwind v4 cross-link | 2 min | ✅ Add 1 paragraph |
| E — OKLCH color note | 3 min | ✅ Add 1 paragraph |
| F — Visual verification rule | 5 min | ✅ Add to cross-project |
| **Total** | **30 min** | **6 small edits** |

## Verification after edits

1. Re-read each updated SKILL.md end-to-end (~10 min)
2. Confirm grep counts are stable (em-dashes present in legal, gone elsewhere)
3. Confirm cross-reference link resolves in skills CLI

No production code changes are needed. Only SKILL.md + reference docs.
