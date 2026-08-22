---
name: web-deployment-ops
description: Verify hosting, DNS, SSL, redirects, environment, and release operations for websites and apps. Use for production domains, app subdomains, SSL certificates, HTTP to HTTPS redirects, www/non-www redirects, preview/staging separation, environment variables, build artifacts, cache invalidation, CDN behavior, source maps, rollback plans, uptime checks, and deployment smoke tests.
---

# Web Deployment Ops

## Workflow

1. Identify hosting provider, production domain, subdomains, DNS provider, deploy branch, environment variables, and rollback path.
2. Verify DNS and SSL live only when current network checks are allowed. Use timestamps for live evidence.
3. Confirm redirects: HTTP to HTTPS, apex/www choice, trailing slashes if important, old domains, and app/marketing subdomain boundaries.
4. Review environment separation so staging, preview, and production do not share unsafe secrets, data, or analytics unexpectedly.
5. Check cache, CDN, build output, source maps, security headers, uptime monitoring, and deployment logs.
6. Run a post-deploy smoke test of critical URLs and workflows.

## Must-Check Items

- Production URL serves HTTPS with a valid certificate.
- HTTP redirects to HTTPS and canonical host behavior is consistent.
- App and marketing domains are intentional, documented, and linked correctly.
- Production environment variables are present, scoped, and not exposed client-side unless safe.
- Staging and preview links are not surfaced in production metadata or emails.
- Static assets cache safely; HTML and API responses do not cache private data incorrectly.
- Source maps are handled intentionally and do not expose private source when that is unacceptable.
- Rollback or redeploy procedure is known before launch.

## Cautions

- DNS, SSL, and deploy-provider state can change quickly. Recheck live status before launch claims.
- Do not modify DNS, hosting, production env vars, or rollback settings without explicit approval.
- Redact secrets, tokens, deployment IDs when needed.

## Output

Report production readiness by domain, redirect, SSL, environment, cache, monitoring, and smoke-test evidence.
