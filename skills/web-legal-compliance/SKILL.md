---
name: web-legal-compliance
description: Review basic website and app legal, privacy, and trust readiness. Use for privacy policy, terms of service, cookie notices, tracking consent, merchant-of-record clarity, refunds, contact/legal links, data collection disclosures, accessibility statements, age or regulated-content disclaimers, public claims risk, and legal launch checklists. This is not legal advice. Not for implementing what a policy describes — refund and merchant-of-record mechanics belong to $web-payments-launch, consent enforcement in tag code to $web-analytics-observability, deletion that actually removes bytes to $web-data-resilience, unsubscribe links and headers to $web-email-launch, provider retention and training settings to $web-ai-integration, and the WCAG conformance behind an accessibility statement to $web-accessibility-audit — this gate owns what is published, disclosed, and decided by the owner.
---

# Web Legal Compliance

## Boundaries

This skill supports practical launch readiness and issue spotting. It is not legal advice. Recommend qualified legal review for regulated industries, minors, healthcare, finance, employment, biometrics, international data transfer, or material business risk.

## Workflow

1. Identify what the site does, where users are located, what data is collected, what payments occur, and what third-party services are embedded.
2. Inspect footer, signup, checkout, cookie banner, forms, tracking scripts, account settings, deletion/export paths, and public claims.
3. Check whether policies are present, reachable, dated, and aligned with actual product behavior.
4. Verify that consent and unsubscribe flows match the tracking and email behavior.
5. Flag missing owner decisions separately from code fixes.

## Must-Check Items

- Privacy Policy and Terms of Service are linked from public pages, signup, and checkout where appropriate.
- Cookie notice and consent controls exist when tracking or nonessential cookies require them.
- Public pages explain pricing, refunds, cancellation, support, and merchant of record when payments are involved.
- Forms disclose sensitive data collection and avoid collecting unnecessary data.
- Users can find support/contact/legal information.
- Copyright, license, testimonial, certification, and comparison claims are supportable.
- Accessibility expectations are not contradicted by obvious UI blockers.
- User data deletion/export/account closure paths are considered for apps with accounts.

## Cautions

- Do not generate legal documents as if they are attorney-approved.
- Do not infer jurisdiction-specific compliance without current source review.
- Browse current official guidance when legal rules are material to the answer.

## Output

Label each issue `P0` (launch blocker), `P1` (first week), or `P2`/`P3` (backlog), and tag `OWNER` on anything needing a business or legal decision rather than a code change. Most findings in this skill are `OWNER`. Include the page, missing element, risk, and suggested next step.

## Severity

Report findings on this pack's shared scale so a launch report can aggregate
them without translation: `P0` blocks launch, `P1` is first-week, `P2`/`P3` are
backlog and polish. Gates are `PASS`, `FAIL`, `BLOCKED`, or `N/A` — `BLOCKED`
means not tested and never rounds up to `PASS`. Tag `OWNER` on anything whose
resolution is a human decision rather than a code change. Full contract:
[`$web-launch-qa` reference/severity.md](../web-launch-qa/reference/severity.md).
