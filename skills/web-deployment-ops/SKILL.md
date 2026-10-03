---
name: web-deployment-ops
description: Verify hosting, DNS, SSL, redirects, environment, and release operations for websites and apps. Use for production domains, app subdomains, SSL certificates, HTTP to HTTPS redirects, www/non-www redirects, preview/staging separation, environment variables, build artifacts, cache invalidation, CDN behavior, source maps, rollback plans, uptime checks, and deployment smoke tests. Not for whether the database can be restored after a bad write (use $web-data-resilience), mail DNS such as SPF, DKIM, DMARC, and MX (use $web-email-launch), canonical tags, robots rules, and indexing of staging URLs (use $web-seo-findability), threat modeling the headers this gate only checks are present (use $web-security-review), or ongoing uptime monitoring, dashboards, and alerting after launch (use $web-analytics-observability) — this gate owns the HTTP, DNS, and release layer, what the server returns and how a build ships or reverts.
---

# Web Deployment Ops

## Workflow

1. Identify hosting provider, production domain, subdomains, DNS provider, deploy branch, environment variables, and rollback path.
2. Verify DNS and SSL live only when current network checks are allowed. Use timestamps for live evidence.
3. Confirm redirects: HTTP to HTTPS, apex/www choice, trailing slashes if important, old domains, and app/marketing subdomain boundaries.
4. Review environment separation so staging, preview, and production do not share unsafe secrets, data, or analytics unexpectedly.
5. Check cache, CDN, build output, source maps, security headers, uptime monitoring, and deployment logs.
6. Run a post-deploy smoke test of critical URLs and workflows.

## Fast check

Run the live gate first. It walks the full redirect chain from http/https and
apex/www, reads certificate expiry straight from the TLS handshake, and scores
security, cache, and compression headers against concrete thresholds.

```bash
node <skill-dir>/scripts/check-headers.mjs example.com
node <skill-dir>/scripts/check-headers.mjs https://app.example.com --no-www
```

`<skill-dir>` is this skill's own directory — `.agents/skills/web-deployment-ops/` in
Codex, `.claude/skills/web-deployment-ops/` in Claude Code, or `skills/web-deployment-ops/` when
running from a clone of the repo. Keep the working directory at the project root.

Read-only. It also probes whether source maps referenced by served JavaScript
are publicly fetchable, which is a decision rather than a defect — report it as
one. The `www.` probe is skipped automatically when the target is not a
registrable apex; pass `--www` to force it.

## Must-Check Items

- Production URL serves HTTPS with a valid certificate.
- HTTP redirects to HTTPS and canonical host behavior is consistent.
- App and marketing domains are intentional, documented, and linked correctly.
- Production environment variables are present, scoped, and not exposed client-side unless safe.
- Staging and preview links are not surfaced in production metadata or emails.
- Static assets cache safely; HTML and API responses do not cache private data incorrectly.
- Source maps are handled intentionally and do not expose private source when that is unacceptable.
- Rollback or redeploy procedure is known before launch.
- Hosting, database, and CDN billing is on a payment method that will not lapse,
  and any free trial or promotional credit has a known expiry date with an alert
  set before it. A trial that ends on a specific calendar day takes the shipped
  site down on that day regardless of code quality.

## Cautions

- DNS, SSL, and deploy-provider state can change quickly. Recheck live status before launch claims.
- Do not modify DNS, hosting, production env vars, or rollback settings without explicit approval.
- Redact secrets, tokens, deployment IDs when needed.

## Output

Report production readiness by domain, redirect, SSL, environment, cache, monitoring, and smoke-test evidence.

## Severity

Report findings on this pack's shared scale so a launch report can aggregate
them without translation: `P0` blocks launch, `P1` is first-week, `P2`/`P3` are
backlog and polish. Gates are `PASS`, `FAIL`, `BLOCKED`, or `N/A` — `BLOCKED`
means not tested and never rounds up to `PASS`. Tag `OWNER` on anything whose
resolution is a human decision rather than a code change. Full contract:
[`$web-launch-qa` reference/severity.md](../web-launch-qa/reference/severity.md).
