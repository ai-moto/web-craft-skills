---
name: web-performance-audit
description: Audit and improve web performance for websites and apps. Use for PageSpeed/Lighthouse, Core Web Vitals, image compression, layout shift, bundle size, unused libraries, render blocking assets, caching, lazy loading, route splitting, hydration cost, server response time, mobile speed, and performance regressions introduced by AI-generated code. Not for instrumenting or reporting the field metrics it diagnoses (use $web-analytics-observability), authoring the animations whose jank it measures (use $web-motion-polish), cache, CDN, and header configuration correctness (use $web-deployment-ops), dependency advisories rather than dependency weight (use $web-security-review), or the latency and timeout envelope of a model call (use $web-ai-integration) — this gate owns speed as a measured budget, what is heavy, what blocks, and what shifts.
---

# Web Performance Audit

## Workflow

1. Identify target pages, user journeys, device class, and performance budget.
2. Run available local checks first: production build, bundle analyzer if configured, framework diagnostics, and browser performance observations.
3. Use live tools such as PageSpeed Insights only when network access and a public URL are available.
4. Inspect images, fonts, scripts, CSS, hydration, API calls, caching, layout shift, and third-party tags.
5. Fix high-impact issues before cosmetic optimizations.
6. Verify with before/after measurements or screenshots when practical.

## Must-Check Items

- Largest images are compressed, correctly sized, and served in modern formats where appropriate.
- Above-the-fold media has stable dimensions and does not create layout shift.
- Fonts are limited, preloaded only when useful, and have sensible fallbacks.
- Unused packages, AI-installed libraries, duplicate icon sets, and dead imports are removed.
- JavaScript bundles are split by route or feature where the framework supports it.
- Analytics, chat widgets, ads, embeds, maps, and replays are deferred or scoped to needed pages.
- API calls are cached, batched, streamed, or moved server-side when appropriate.
- Cache headers and CDN behavior match the content type.

## Cautions

- Do not chase a score at the expense of product behavior, accessibility, analytics correctness, or security.
- Lab scores can differ from real-user metrics. State which kind of evidence was used.
- Avoid replacing real content with placeholders just to improve speed.

## Output

Prioritize by user impact using the shared scale: `P0` for anything that makes a core task unusable on a target device, `P1` for measurable harm to a real journey, `P2`/`P3` for the rest. Note effort separately from severity — a cheap fix to a minor problem is still minor. Include measured evidence, suspected cause, recommended fix, and how to verify it.

## Severity

Report findings on this pack's shared scale so a launch report can aggregate
them without translation: `P0` blocks launch, `P1` is first-week, `P2`/`P3` are
backlog and polish. Gates are `PASS`, `FAIL`, `BLOCKED`, or `N/A` — `BLOCKED`
means not tested and never rounds up to `PASS`. Tag `OWNER` on anything whose
resolution is a human decision rather than a code change. Full contract:
[`$web-launch-qa` reference/severity.md](../web-launch-qa/reference/severity.md).
