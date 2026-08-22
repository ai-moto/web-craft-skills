---
name: web-design-director
description: Design, redesign, critique, and implement polished responsive website and web app interfaces. Use for visual direction, UX layout, information architecture, design systems, dashboards, landing pages, app shells, components, forms, onboarding, empty states, responsive polish, typography, color, spacing, and requests to make a webpage look professional, modern, premium, clear, delightful, or less generic. Not for animation timing, transitions, and micro-interactions (use $web-motion-polish), producing logo, icon, favicon, or share-image files (use $web-brand-assets), writing or fact-checking the copy in the layout (use $web-content-quality), the WCAG conformance verdict (use $web-accessibility-audit), or a build whose point is teaching the user how it works (use $web-build-coach) — this gate owns the static composition, hierarchy, layout, type, color, and responsive behavior.
---

# Web Design Director

## Design Workflow

1. Identify the user's audience, task, domain, and desired tone. Let those drive layout density, visual weight, copy, imagery, and interaction design.
2. Inspect any existing app conventions before adding new styles. Reuse established components, tokens, icons, spacing, routing, and state patterns where they exist.
3. Make the primary workflow visible immediately. For tools and apps, build the usable interface first. For landing pages, make the product, person, place, or offer obvious in the first viewport.
4. Shape hierarchy before decoration: navigation, primary action, core content, secondary actions, supporting detail, and status feedback.
5. Implement responsive behavior deliberately with stable dimensions, grid tracks, min/max constraints, aspect ratios, and wrapping rules.
6. Verify the rendered UI on desktop and mobile. Check screenshots for overlap, clipped text, broken spacing, awkward cropping, unreadable contrast, and empty media.

## Visual Standards

- Use domain-appropriate design. Operational tools should be calm, dense, and scannable. Creative sites can be more expressive. Games can be playful and animated.
- Avoid generic one-note palettes. Balance neutrals with purposeful accent colors, and avoid letting the whole UI become a single hue family.
- Use real or generated bitmap imagery when a website needs visual assets. Avoid purely atmospheric stock-like images when users need to inspect the real product, place, state, or person.
- Prefer icons for familiar tool actions. Use the project's existing icon library when available; otherwise use a common library such as lucide when appropriate.
- Do not nest UI cards inside other cards. Use cards for repeated items, modals, or framed tools, not every page section.
- Keep cards and panels modestly rounded unless the existing design system says otherwise.
- Reserve hero-scale typography for true heroes. Use compact, readable headings inside dashboards, sidebars, cards, and tool surfaces.
- Do not use visible in-app text that explains the UI itself, keyboard shortcuts, or design intent unless the product genuinely requires instruction.

## Accessibility And Usability

- Use semantic landmarks and controls.
- Ensure each interactive element has a visible state and accessible name.
- Preserve keyboard navigation and focus visibility.
- Make color support meaning, not carry it alone.
- Check long labels, long words, small screens, and browser zoom.
- Respect reduced-motion preferences when animation is present.

## Review Output

When reviewing or proposing design changes, lead with the highest-impact issues and fixes. Use concrete language: name the affected screen, component, user task, and visible problem. When implementing, summarize the design choices and the verification evidence.

## Severity

Report findings on this pack's shared scale so a launch report can aggregate
them without translation: `P0` blocks launch, `P1` is first-week, `P2`/`P3` are
backlog and polish. Gates are `PASS`, `FAIL`, `BLOCKED`, or `N/A` — `BLOCKED`
means not tested and never rounds up to `PASS`. Tag `OWNER` on anything whose
resolution is a human decision rather than a code change. Full contract:
[`$web-launch-qa` reference/severity.md](../web-launch-qa/reference/severity.md).
