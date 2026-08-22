# Web Craft Skills

Focused Codex skills for building, reviewing, launching, and improving websites and web apps.

Web Craft Skills is a product-neutral Codex plugin for people who want help building polished, accurate, production-ready web experiences. It bundles 16 focused skills across design, implementation, accessibility, security, SEO, email, performance, analytics, legal/privacy, payments, deployment, user-flow testing, content quality, and launch QA.

The public project page is designed for GitHub Pages and lives in [`docs/index.html`](docs/index.html). The live page is available at:

```text
https://ai-moto.github.io/web-craft-skills/
```

The page includes an interactive skill filter, selectable skill cards, a live prompt preview, and a lightweight motion graphic that shows how prompts route through build, trust, launch, and QA tracks.

## What's Included

### Build And Design

| Skill | Use it for |
| --- | --- |
| `$web-build-coach` | Build websites while explaining decisions in a useful teaching style. |
| `$web-design-director` | Shape responsive layouts, visual hierarchy, UX, typography, color, and components. |
| `$web-motion-polish` | Add purposeful, accessible, performant animation and micro-interactions. |
| `$web-brand-assets` | Create and review logos, icons, favicons, social images, and brand asset implementation. |
| `$web-content-quality` | Improve copy, CTAs, claims, documentation, empty states, errors, and trust language. |

### Access, Trust, And Risk

| Skill | Use it for |
| --- | --- |
| `$web-accessibility-audit` | Audit keyboard navigation, semantics, labels, contrast, zoom, forms, and screen reader basics. |
| `$web-security-review` | Perform authorized practical security reviews with evidence and fixes. |
| `$web-legal-compliance` | Review privacy, terms, cookie notices, merchant-of-record clarity, consent, and public legal gaps. |

### Launch Systems

| Skill | Use it for |
| --- | --- |
| `$web-seo-findability` | Check metadata, crawlability, sitemap, robots, social previews, and indexing readiness. |
| `$web-email-launch` | Verify transactional email, sender domains, SPF, DKIM, DMARC, and inbox smoke tests. |
| `$web-performance-audit` | Improve speed, Core Web Vitals, image weight, bundle size, caching, and layout shift. |
| `$web-analytics-observability` | Verify analytics, conversion funnels, error tracking, web vitals, bot protection, and dashboards. |
| `$web-payments-launch` | Check checkout, subscriptions, Stripe/webhooks, paywalls, receipts, refunds, and live-mode gates. |
| `$web-deployment-ops` | Verify hosting, DNS, SSL, redirects, environment config, source maps, cache, and rollback readiness. |
| `$web-core-flow-testing` | Walk signup, login, forms, links, checkout, account, mobile, browser, 404, and error flows. |
| `$web-launch-qa` | Orchestrate final PASS/FAIL/BLOCKED launch readiness across the full web surface. |

## Install

### Option 1: Install as repo-scoped skills

Use this when you want the skills available only inside a specific project.

```bash
mkdir -p .agents/skills
cp -R web-craft-skills/skills/* .agents/skills/
```

Start or restart Codex from that repository, then invoke a skill:

```text
Use $web-design-director to improve this homepage.
```

### Option 2: Install as user skills

Use this when you want the skills available across projects on your machine.

```bash
mkdir -p "$HOME/.agents/skills"
cp -R web-craft-skills/skills/* "$HOME/.agents/skills/"
```

Restart Codex if the new skills do not appear.

### Option 3: Keep the plugin package intact

Use the whole `web-craft-skills` folder when you want to distribute the skill pack as a plugin bundle. The plugin manifest is at:

```text
.codex-plugin/plugin.json
```

OpenAI's current guidance says standalone skills work well for local authoring, while plugins are preferred for distributing reusable skills to other people.

## Example Prompts

```text
Use $web-launch-qa to verify this website before I publish it.
```

```text
Use $web-seo-findability to check our sitemap, metadata, robots file, and social previews.
```

```text
Use $web-email-launch to verify signup email, SPF, DKIM, DMARC, and inbox delivery.
```

```text
Use $web-core-flow-testing to walk through signup, checkout, forms, links, and mobile flows.
```

```text
Use $web-security-review and $web-payments-launch to review this SaaS app before launch.
```

## Verify

Run the bundled validation scripts from a Codex environment that has the OpenAI skill-creator and plugin-creator tools available:

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py skills/web-build-coach
python3 /path/to/plugin-creator/scripts/validate_plugin.py .
```

At minimum, verify:

- Every skill folder has a valid `SKILL.md`.
- `.codex-plugin/plugin.json` validates.
- No private project names, credentials, secrets, client data, or product-specific launch notes are included.
- The GitHub Pages site renders on desktop and mobile.

## Publish To GitHub Pages

This repository includes a GitHub Pages workflow at [`.github/workflows/pages.yml`](.github/workflows/pages.yml). After the repository is pushed to GitHub:

1. Open the repository settings.
2. Go to **Pages**.
3. Set the source to **GitHub Actions** if it is not already selected.
4. Run or re-run the **Deploy GitHub Pages** workflow.
5. Open `https://ai-moto.github.io/web-craft-skills/`.

## Project Goals

- General and educational, not tied to a private product.
- Practical enough to help Codex produce accurate builds.
- Complete enough to cover website and app launch readiness end to end.
- Focused enough that each skill has a recognizable job.

## Usage Rights

Copyright © 2026 Ahmad Akkawi. All rights reserved.

This repository is public so people can read the description, learn from the skill structure, and install the skills for their own Codex setup. No open-source license is granted. Reuse, redistribution, modified versions, commercial packaging, or publishing this skill pack elsewhere requires written permission from the owner.
