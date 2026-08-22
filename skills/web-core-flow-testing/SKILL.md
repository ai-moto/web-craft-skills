---
name: web-core-flow-testing
description: Test real user journeys in websites and apps. Use for signup, login, onboarding, forms, search, filters, checkout, paywalls, account settings, contact forms, uploads, downloads, links, buttons, menus, mobile walkthroughs, cross-browser checks, 404/error pages, empty/loading/error states, and attempts to break core flows before launch. Not for aggregating multiple gates into a go/no-go report (use $web-launch-qa), the processor, webhook, and entitlement layer behind a checkout (use $web-payments-launch), whether an attacker can bypass the auth a flow uses (use $web-security-review), whether the resulting email reaches an inbox (use $web-email-launch), keyboard and screen-reader traversal of the same screens (use $web-accessibility-audit), or the wording inside an empty, error, or 404 state (use $web-content-quality) — this gate owns the legitimate user's path through the UI and where it breaks.
---

# Web Core Flow Testing

## Workflow

1. Identify the core user journeys and success criteria. Do not test only the homepage.
2. Run the app in the closest available production-like mode.
3. Walk each journey as a real user: first visit, navigation, form input, validation, success, failure, refresh, back button, and retry.
4. Test desktop and mobile widths. Add a second browser check when available.
5. Try realistic bad inputs, slow or failed network states, empty states, long text, and interrupted flows.
6. Capture evidence: screenshots, console errors, network failures, form responses, and exact steps to reproduce.

## Must-Check Items

- Every visible link, button, nav item, tab, menu, and CTA works or is intentionally disabled.
- Forms validate useful errors and preserve user input where appropriate.
- Contact forms, uploads, downloads, search, filters, and sort controls behave predictably.
- Auth flows handle login, logout, expired session, wrong password, reset, invite, and protected routes.
- Account, checkout, paywall, dashboard, and admin boundaries enforce server-side rules where relevant.
- Mobile layout supports the same core tasks as desktop.
- 404, 500, empty, loading, offline, and permission-denied states are not dead ends.

## Cautions

- Do not use real customer data or live payment/email flows without explicit scope.
- Avoid destructive actions unless the user approves them and rollback is clear.
- A passing build is not a user-flow test.

## Output

Use step-by-step PASS/FAIL/BLOCKED results. For failures, include reproduction steps, expected behavior, actual behavior, and likely owner/file.

## Severity

Report findings on this pack's shared scale so a launch report can aggregate
them without translation: `P0` blocks launch, `P1` is first-week, `P2`/`P3` are
backlog and polish. Gates are `PASS`, `FAIL`, `BLOCKED`, or `N/A` — `BLOCKED`
means not tested and never rounds up to `PASS`. Tag `OWNER` on anything whose
resolution is a human decision rather than a code change. Full contract:
[`$web-launch-qa` reference/severity.md](../web-launch-qa/reference/severity.md).
