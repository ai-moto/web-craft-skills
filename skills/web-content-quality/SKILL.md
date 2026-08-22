---
name: web-content-quality
description: Review and improve public website/app content quality. Use for homepage copy, product claims, pricing copy, onboarding text, UX writing, empty states, error messages, FAQs, docs, support text, CTAs, trust signals, testimonials, comparisons, accessibility of language, consistency, factual accuracy, and removing placeholders or unsupported claims. Not for layout, hierarchy, or visual treatment of the surfaces the copy sits on (use $web-design-director), title and description tags as crawlable metadata (use $web-seo-findability), whether a claim creates legal exposure or needs a disclaimer (use $web-legal-compliance), whether an empty or error state is reachable at all (use $web-core-flow-testing), or screen-reader and contrast conformance (use $web-accessibility-audit) — this gate owns the words, not the surface they sit on or the plumbing behind them.
---

# Web Content Quality

## Workflow

1. Identify audience, product promise, required facts, conversion goal, and legal/trust constraints.
2. Inventory public copy: hero, navigation, CTAs, feature sections, pricing, FAQ, docs, forms, empty states, errors, emails, and support pages.
3. Check for clarity, specificity, factual accuracy, tone consistency, accessibility, and actionable next steps.
4. Verify factual claims when they may be current, technical, legal, pricing-related, or comparative.
5. Replace placeholder or vague copy with specific, honest language that matches the product's actual state.
6. Preserve user-provided facts and brand voice unless the user asks for rewriting.

## Must-Check Items

- No lorem ipsum, placeholder links, fake metrics, fake testimonials, invented logos, or unsupported certifications.
- The homepage clearly says what the product is, who it is for, and what to do next.
- CTAs match the destination and user expectation.
- Pricing, trial, refund, cancellation, and support language is clear where relevant.
- Error and empty states tell users what happened and what they can do.
- Technical/docs content includes prerequisites, steps, verification, and troubleshooting.
- Claims about security, privacy, performance, AI behavior, integrations, and compliance are supportable.
- Language is plain, inclusive, scannable, and readable on mobile.

## Cautions

- Do not invent proof. If proof is missing, label it as a needed owner input.
- Do not make legal, medical, financial, or compliance claims without current evidence.
- Do not over-polish operational app text into marketing fluff.

## Output

Provide high-impact copy fixes first, then rewritten snippets where helpful. Separate factual-risk issues from style improvements.

## Severity

Report findings on this pack's shared scale so a launch report can aggregate
them without translation: `P0` blocks launch, `P1` is first-week, `P2`/`P3` are
backlog and polish. Gates are `PASS`, `FAIL`, `BLOCKED`, or `N/A` — `BLOCKED`
means not tested and never rounds up to `PASS`. Tag `OWNER` on anything whose
resolution is a human decision rather than a code change. Full contract:
[`$web-launch-qa` reference/severity.md](../web-launch-qa/reference/severity.md).
