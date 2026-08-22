---
name: web-security-review
description: Perform authorized security reviews for websites and web apps. Use for static code review, local diff review, dependency risk, secrets scanning, frontend and backend web security, authentication/session review, CSP/CORS/headers, XSS/CSRF/open redirect/file upload risks, serverless/API route review, deployment config hardening, and practical security findings with evidence and fixes.
---

# Web Security Review

## Boundaries

Review only systems the user owns or is authorized to test. Prefer read-only local analysis by default. Ask for explicit approval before active scanning, fuzzing, credential tests, live traffic generation, destructive actions, or changes to production settings.

Do not claim a site is secure. State what was checked, what evidence supports the conclusion, and what remains untested.

## Review Workflow

1. Confirm scope: repository, URL, branch, diff, framework, deployment target, and whether live testing is allowed.
2. Inventory the app: routes, API handlers, auth/session layer, storage, forms, uploads, third-party scripts, environment variables, build/deploy config, and dependencies.
3. Search for secrets and risky patterns with local tools such as `rg`, package manager audit commands, lockfile inspection, and framework-specific scanners when already installed.
4. Review user-controlled input and output boundaries:
   - XSS and unsafe HTML injection.
   - CSRF and unsafe state-changing requests.
   - SSRF, open redirects, path traversal, template injection, command injection.
   - File upload validation, storage permissions, and content-type handling.
   - API authorization, IDOR, tenant isolation, and rate limiting.
5. Review browser and deployment hardening:
   - CSP, HSTS, X-Content-Type-Options, frame-ancestors, Referrer-Policy, Permissions-Policy.
   - CORS allowlists and credential behavior.
   - Secure, HttpOnly, SameSite cookie settings.
   - Source map exposure, debug endpoints, verbose errors, and logging of sensitive data.
6. Review supply chain and build risk:
   - Dependency advisories.
   - Suspicious postinstall scripts.
   - Unpinned external scripts.
   - CI secrets exposure.
   - Public environment variables that contain private values.

## Finding Format

Lead with findings ordered by severity. Use this shape:

- Severity: `P0`, `P1`, `P2`, or `P3`.
- Location: file and line, endpoint, config key, or URL.
- Risk: what can go wrong and who can trigger it.
- Evidence: the exact code, config, command result, or live observation.
- Fix: minimal remediation and suggested test.

If no issues are found, say that clearly and list residual risk: untested live paths, missing credentials, unavailable scans, or assumptions.

## Educational Notes

Explain why a finding matters in practical terms. Avoid fear-heavy language. Distinguish exploitable issues from defense-in-depth improvements. Prefer minimal fixes that preserve intended behavior.
