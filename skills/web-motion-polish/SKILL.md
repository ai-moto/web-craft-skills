---
name: web-motion-polish
description: Add, review, or refine tasteful web animations and micro-interactions. Use for page transitions, hover/focus states, loading motion, scroll reveals, interactive demos, animated logos, dashboard state changes, game-feel polish, reducing jank, honoring prefers-reduced-motion, and making UI motion purposeful, accessible, and performant. Not for static layout, hierarchy, type, color, and spacing decisions (use $web-design-director), the WCAG verdict on focus visibility and reduced motion (use $web-accessibility-audit), page-level load metrics and layout-shift budgets (use $web-performance-audit), or drawing the logo or icon being animated (use $web-brand-assets) — this gate owns behavior over time, what moves, how long it takes, and why the movement is legible.
---

# Web Motion Polish

## Motion Principles

Use motion to explain state, direction, cause and effect, or attention. Do not add motion only because the page feels plain.

Good web motion usually does one of these jobs:

- Confirms input: button press, save, delete, copy, upload, filter.
- Preserves continuity: open, close, expand, collapse, route change, drag, reorder.
- Guides attention: reveal new content, highlight changed values, show loading progress.
- Adds character: brand moments, games, creative portfolios, small celebratory states.

## Implementation Workflow

1. Inspect the existing stack. Prefer CSS transitions/animations for simple states, the existing animation library if one is already installed, and a specialist library only when the interaction warrants it.
2. Animate compositor-friendly properties first: `transform` and `opacity`. Avoid layout-heavy properties such as `height`, `top`, `left`, and `box-shadow` when they cause jank.
3. Define stable start and end states so text, controls, and media do not jump or resize unexpectedly.
4. Keep default UI transitions short. Most interface motion should feel responsive in roughly 120-300ms; larger route or scene transitions can be longer when justified.
5. Add `prefers-reduced-motion` support. Reduce or remove nonessential movement while preserving state feedback.
6. Verify in the browser. Check desktop, mobile, keyboard focus, reduced-motion behavior, and console errors.

## Patterns

- Buttons: use subtle transform, background, border, or shadow changes. Keep hit targets stable.
- Menus and modals: pair opacity with small scale or translate. Keep focus management intact.
- Lists and cards: animate insertion, removal, filtering, and sorting only when it clarifies the change.
- Loading: use skeletons, progress, or calm loops. Avoid constant large motion near reading areas.
- Scroll reveals: use sparingly. Content should still be present and readable without animation.
- Games and demos: tune feedback loops, timing, easing, and state transitions as part of gameplay or comprehension.

## Anti-Patterns

- Infinite attention-grabbing motion on core reading or form surfaces.
- Animations that delay common actions.
- Motion that hides layout bugs or causes cumulative layout shift.
- Hover-only affordances on touch interfaces.
- Decorative effects that make text harder to read.

## Reporting

When finished, describe the motion in user-task language: what interaction changed, why it helps, how reduced motion is handled, and what browser evidence was checked.

## Severity

Report findings on this pack's shared scale so a launch report can aggregate
them without translation: `P0` blocks launch, `P1` is first-week, `P2`/`P3` are
backlog and polish. Gates are `PASS`, `FAIL`, `BLOCKED`, or `N/A` — `BLOCKED`
means not tested and never rounds up to `PASS`. Tag `OWNER` on anything whose
resolution is a human decision rather than a code change. Full contract:
[`$web-launch-qa` reference/severity.md](../web-launch-qa/reference/severity.md).
