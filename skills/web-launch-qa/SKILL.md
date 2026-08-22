---
name: web-launch-qa
description: Verify website or web app readiness before release. Use for launch checklists, browser QA, responsive testing, accessibility, console errors, forms, links, media, SEO/social metadata, performance, security headers, deployment smoke tests, staging-to-production checks, and PASS/FAIL/BLOCKED reports for web releases.
---

# Web Launch QA

## QA Workflow

1. Identify the launch target: local build, preview URL, staging, production, or static files.
2. Install or start only what the project needs. If a dev server is required, start it and provide the URL.
3. Run available automated checks: typecheck, lint, tests, build, formatter check, dependency audit, and framework-specific validation.
4. Verify in a real browser when possible:
   - Desktop and mobile viewport screenshots.
   - Console and network errors.
   - Navigation, links, buttons, menus, dialogs, tabs, filters, forms, and empty states.
   - Keyboard focus, labels, landmarks, contrast, reduced-motion behavior, and zoom tolerance.
   - Image/video loading, aspect ratios, lazy loading, and fallbacks.
5. Check launch metadata:
   - Title, description, canonical URL, Open Graph, Twitter/X cards.
   - Favicon and app icons.
   - Robots, sitemap, 404 and error pages where relevant.
   - Analytics, cookie notices, and privacy links when the site uses them.
6. Check deployment hardening when a URL is available:
   - HTTPS, redirects, HSTS, CSP, CORS, cache headers, compression, and source map exposure.
   - Environment-specific behavior and feature flags.
   - Contact forms, transactional email, payment or auth flows only with explicit scope.

## Evidence Standards

Report each major gate as `PASS`, `FAIL`, or `BLOCKED`.

- `PASS`: tested successfully with evidence.
- `FAIL`: tested and found a concrete issue.
- `BLOCKED`: could not be tested because access, credentials, tools, hardware, network, or approval was missing.

Do not treat a successful build as proof that the website works. Render and interact with the site when possible.

## Common Fix Priorities

Fix before launch:

- Broken primary navigation or calls to action.
- Forms that cannot submit or validate correctly.
- Console errors on core pages.
- Mobile overlap, clipped text, unusable controls, or unreadable contrast.
- Missing critical metadata, broken favicon, or social preview failures.
- Public secrets, debug endpoints, unsafe headers, or accidental noindex on production.

## Final Report

Summarize:

1. Overall readiness.
2. Gates checked with PASS/FAIL/BLOCKED.
3. Highest-priority fixes.
4. Evidence commands, screenshots, URLs, or files.
5. Remaining launch risks.
