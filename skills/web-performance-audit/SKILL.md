---
name: web-performance-audit
description: Audit and improve web performance for websites and apps. Use for PageSpeed/Lighthouse, Core Web Vitals, image compression, layout shift, bundle size, unused libraries, render blocking assets, caching, lazy loading, route splitting, hydration cost, server response time, mobile speed, and performance regressions introduced by AI-generated code.
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

Prioritize fixes by likely user impact and effort. Include measured evidence, suspected cause, recommended fix, and how to verify it.
