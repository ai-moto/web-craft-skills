---
name: web-accessibility-audit
description: Audit and improve practical web accessibility for websites and apps. Use for keyboard navigation, focus states, screen reader semantics, headings, landmarks, labels, alt text, color contrast, reduced motion, forms, dialogs, menus, tables, error messages, touch targets, zoom, and WCAG-oriented launch review.
---

# Web Accessibility Audit

## Workflow

1. Identify primary pages and workflows, including forms, dialogs, navigation, checkout, account, dashboard, and error states.
2. Inspect semantic HTML, headings, landmarks, buttons, links, form labels, ARIA, media, tables, and dynamic updates.
3. Test keyboard-only navigation: tab order, focus visibility, skip links, menus, modals, drawers, carousels, and escape behavior.
4. Check visual accessibility: contrast, text size, wrapping, zoom, touch targets, reduced motion, and non-color indicators.
5. Use automated tools when available, but do not treat them as complete coverage.
6. Fix or report issues with file/line references and visible user impact.

## Must-Check Items

- Every interactive control has an accessible name and a real semantic role.
- Buttons are buttons, links are links, and disabled states are conveyed correctly.
- Focus is visible and trapped only when a modal/drawer genuinely requires it.
- Forms have labels, instructions, validation messages, and error summaries where needed.
- Images have useful alt text or are hidden when decorative.
- Headings follow a logical structure and landmarks make navigation sane.
- Text and controls remain usable at mobile widths and browser zoom.
- Motion respects `prefers-reduced-motion`.

## Cautions

- Do not add ARIA to compensate for broken semantics when native HTML can solve it.
- Do not remove visible labels in favor of placeholders only.
- Accessibility is user experience, not just compliance. Explain issues in task terms.

## Output

Lead with blockers that prevent completing core tasks. Include the affected user, step, element, evidence, and minimal fix.
