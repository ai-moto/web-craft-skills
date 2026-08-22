---
name: web-analytics-observability
description: Verify analytics, observability, and launch monitoring for websites and apps. Use for analytics installation, event naming, conversion funnels, Core Web Vitals tracking, error tracking, session replay with consent, bot protection, uptime checks, dashboards, alerting, privacy-safe telemetry, and confirming that tracking actually fires in production. Not for diagnosing or fixing the Core Web Vitals it reports (use $web-performance-audit), DNS, SSL, cache, or the post-deploy smoke test (use $web-deployment-ops), whether a consent notice and privacy policy are legally adequate (use $web-legal-compliance), or abuse controls on model endpoints (use $web-ai-integration) — this gate owns only the measurement layer, whether telemetry is installed, actually fires, and alerts someone.
---

# Web Analytics Observability

## Workflow

1. Identify business goals, key user journeys, conversion events, error surfaces, and privacy constraints.
2. Inventory installed analytics, tag managers, error trackers, replay tools, uptime monitors, logging, and web-vitals collection.
3. Verify events in a browser or provider debug view when access is available. Do not assume installed code means data is flowing.
4. Check consent behavior, data minimization, PII handling, sampling, environment separation, and bot filtering.
5. Add or recommend a small launch dashboard: traffic, activation, conversion, errors, latency, web vitals, payments, email, and core-flow health.
6. Report blocked provider-console checks separately from local code review.

## Must-Check Items

- Analytics loads only where intended and respects consent settings.
- Page views and route changes are tracked for client-side navigation.
- Primary conversions have stable event names and enough context to debug drop-off.
- Error tracking captures frontend and backend exceptions with source maps configured safely.
- Web vitals are measured from day one when the stack supports it.
- Session replay masks sensitive fields and is disabled until consent/legal review when required.
- Bot protection or rate limiting exists for expensive, spam-prone, or AI-backed endpoints.
- Production, staging, and development data are separated.

## Cautions

- Do not send test events into production analytics without labeling or approval.
- Never include passwords, tokens, payment data, private messages, or personal data in telemetry.
- Provider dashboards are time-sensitive; cite the timestamp when checked.

## Output

Report what is installed, what fired successfully, what is missing, what is privacy-sensitive, and what should alert the owner after launch.

## Severity

Report findings on this pack's shared scale so a launch report can aggregate
them without translation: `P0` blocks launch, `P1` is first-week, `P2`/`P3` are
backlog and polish. Gates are `PASS`, `FAIL`, `BLOCKED`, or `N/A` — `BLOCKED`
means not tested and never rounds up to `PASS`. Tag `OWNER` on anything whose
resolution is a human decision rather than a code change. Full contract:
[`$web-launch-qa` reference/severity.md](../web-launch-qa/reference/severity.md).
