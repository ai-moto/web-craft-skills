---
name: web-seo-findability
description: Audit and improve website findability for search engines, social sharing, crawlers, and AI answer surfaces. Use for SEO basics, titles, descriptions, canonical URLs, Open Graph/Twitter cards, sitemap.xml, robots.txt, llms.txt, noindex mistakes, staging or localhost leftovers, structured data, public-page indexing, Google Search Console handoff, and share preview readiness. Not for designing or exporting the share image itself (use $web-brand-assets), whether the prose behind a title is honest and persuasive (use $web-content-quality), server-side redirects, SSL, and canonical-host configuration (use $web-deployment-ops), or installing analytics and reading traffic dashboards (use $web-analytics-observability) — this gate owns the machine-readable layer, what crawlers, share cards, and AI answer surfaces parse.
---

# Web SEO Findability

## Workflow

1. Identify public pages, app routes, canonical domain, marketing domain, app subdomain, and any staging or preview URLs.
2. Inspect rendered HTML, route metadata, framework config, sitemap, robots, redirects, and social preview tags.
3. Verify that production pages can be crawled and that private, staging, admin, account, checkout, and test routes are not accidentally indexed.
4. Check each important page for a unique title, useful description, canonical URL, H1, readable body copy, and meaningful internal links.
5. Verify Open Graph and Twitter/X metadata: title, description, URL, image, image dimensions, and image accessibility.
6. Check structured data only when it fits the page type. Do not invent schema for content that is not present.
7. Produce a clear PASS/FAIL/BLOCKED report with exact URLs, files, and fixes.

## Fast check

Run the metadata gate across several pages at once. Comparing pages is the
point — duplicate titles and a stray staging canonical only show up when the
set is read together.

```bash
node <skill-dir>/scripts/check-metadata.mjs https://example.com
node <skill-dir>/scripts/check-metadata.mjs https://example.com /pricing /docs /about
```

`<skill-dir>` is this skill's own directory — `.agents/skills/web-seo-findability/` in
Codex, `.claude/skills/web-seo-findability/` in Claude Code, or `skills/web-seo-findability/` when
running from a clone of the repo. Keep the working directory at the project root.

It flags `noindex` in both the meta tag and the `X-Robots-Tag` header, resolves
`og:image` to confirm it does not 404, and rejects `localhost`, preview, and
staging hostnames anywhere in canonical, `og:url`, or the sitemap.

## Must-Check Items

- No `localhost`, staging hostname, test copy, placeholder links, or fake routes in public metadata.
- No accidental `noindex` or blocked robots rules on launch pages.
- `sitemap.xml` exists or the framework generates one, and it includes canonical production URLs.
- `robots.txt` allows intended public pages and blocks only what should be private.
- `llms.txt` is present only when the owner wants AI-readable site guidance; keep it factual and concise.
- Each public page has useful page-specific title and description text.
- Social preview image is present, readable, correctly sized, and not a broken URL.
- Important pages are reachable by links, not only client-side hidden states.

## Cautions

- SEO tools and search consoles are time-sensitive. Treat live indexing data as current only when checked in the current turn.
- Do not promise rankings. Focus on crawlability, correctness, metadata quality, and measurement setup.
- Do not expose private app routes or customer data while trying to improve findability.

## Output

Lead with `P0` launch blockers, then `P1` first-week improvements, then `P2`/`P3` polish. Include verification commands or browser observations whenever possible.

## Severity

Report findings on this pack's shared scale so a launch report can aggregate
them without translation: `P0` blocks launch, `P1` is first-week, `P2`/`P3` are
backlog and polish. Gates are `PASS`, `FAIL`, `BLOCKED`, or `N/A` — `BLOCKED`
means not tested and never rounds up to `PASS`. Tag `OWNER` on anything whose
resolution is a human decision rather than a code change. Full contract:
[`$web-launch-qa` reference/severity.md](../web-launch-qa/reference/severity.md).
