# Web Craft Skills

Focused skills for building, reviewing, launching, and improving websites and web apps. Works in Codex and Claude Code.

Web Craft Skills is a product-neutral skill pack for people who want help building polished, accurate, production-ready web experiences. It bundles 18 focused skills across design, implementation, accessibility, security, SEO, email, performance, analytics, legal/privacy, payments, deployment, AI integration, data resilience, user-flow testing, content quality, and launch QA.

Four gates ship deterministic scripts that use Node builtins only — no install step, no dependencies. They answer the questions that are easy to get wrong by eye: whether SPF exceeds its DNS-lookup limit, what the full redirect chain actually does, whether an `og:image` 404s, whether `apple-touch-icon.png` is really 180x180.

The public project page is designed for GitHub Pages and lives in [`docs/index.html`](docs/index.html). The live page is available at:

```text
https://ai-moto.github.io/web-craft-skills/
```

The page includes an interactive skill filter, selectable skill cards, a live prompt preview, and a lightweight routing sequencer that shows how prompts move through build, trust, launch, and QA tracks.

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
| `$web-ai-integration` | Harden AI features: key exposure, prompt injection, output handling, cost caps, provider fallback. |

### Launch Systems

| Skill | Use it for |
| --- | --- |
| `$web-seo-findability` | Check metadata, crawlability, sitemap, robots, social previews, and indexing readiness. |
| `$web-email-launch` | Verify transactional email, sender domains, SPF, DKIM, DMARC, and inbox smoke tests. |
| `$web-performance-audit` | Improve speed, Core Web Vitals, image weight, bundle size, caching, and layout shift. |
| `$web-analytics-observability` | Verify analytics, conversion funnels, error tracking, web vitals, bot protection, and dashboards. |
| `$web-payments-launch` | Check checkout, subscriptions, Stripe/webhooks, paywalls, receipts, refunds, and live-mode gates. |
| `$web-deployment-ops` | Verify hosting, DNS, SSL, redirects, environment config, source maps, cache, and rollback readiness. |
| `$web-data-resilience` | Verify backups, tested restores, migration safety, deletion paths, and recovery runbooks. |
| `$web-core-flow-testing` | Walk signup, login, forms, links, checkout, account, mobile, browser, 404, and error flows. |
| `$web-launch-qa` | Route every launch gate to its specialist skill and aggregate one PASS/FAIL/BLOCKED report. |

## Testing

Structural validity and correct routing are different questions. Check both.

**Does the plugin load?**

```bash
claude plugin validate ./web-craft-skills
claude --plugin-dir ./web-craft-skills -p "List the skills you have available."
```

**Do the right skills fire?**

Eighteen skills that all describe web work compete for the same prompt. The
routing harness runs real prompts through a real session with the pack loaded
and asserts which skill actually fired:

```bash
node test/run-trigger-tests.mjs
```

Each case runs with `--allowedTools Skill`, so the session can pick a skill and
nothing else — it cannot edit files, run commands, or reach the network. Misroutes
print the transcript path so you can see what the model was reasoning about.
Requires an authenticated `claude` CLI.

**Do the scripts work?**

```bash
node skills/web-email-launch/scripts/check-email-dns.mjs github.com
node skills/web-deployment-ops/scripts/check-headers.mjs example.com
node skills/web-seo-findability/scripts/check-metadata.mjs https://example.com /pricing
node skills/web-brand-assets/scripts/check-icons.mjs --url https://example.com
```

All four exit `1` on a `P0`/`P1`, `2` on a usage error, and `3` when the target
could not be evaluated — so a dead host or a mistyped path fails CI rather than
passing silently.

**Is the pack safe to publish?**

```bash
node test/check-pack-hygiene.mjs
```

## Install

### Option 1: Install as repo-scoped skills

Use this when you want the skills available only inside a specific project.

```bash
mkdir -p .agents/skills
cp -R web-craft-skills/skills/* .agents/skills/
```

### Claude Code

The same `skills/` directory works unchanged. Install as a plugin from the repo
root, or copy the skills into a project:

```bash
mkdir -p .claude/skills
cp -R web-craft-skills/skills/* .claude/skills/
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

## Pre-publish check

This pack is public and is authored inside a private repository, so the risk is
not a broken skill — it is a client name, a local absolute path, or a credential
riding along. That check is worthless as a checklist item someone reads and nods
at, so it runs:

```bash
node test/check-pack-hygiene.mjs
```

It scans every file for private terms, common secret formats, and local absolute
paths, then verifies frontmatter shape, internal links, referenced script paths,
and that the skill count matches everywhere it is written down. Exits non-zero on
any finding, so it belongs in CI before a Pages deploy.

## Publish To GitHub Pages

This repository includes a GitHub Pages workflow at [`.github/workflows/pages.yml`](.github/workflows/pages.yml). After the repository is pushed to GitHub:

1. Open the repository settings.
2. Go to **Pages**.
3. Set the source to **GitHub Actions** if it is not already selected.
4. Run or re-run the **Deploy GitHub Pages** workflow.
5. Open `https://ai-moto.github.io/web-craft-skills/`.

## Project Goals

- General and educational, not tied to a private product.
- Practical enough to help an agent produce accurate builds.
- Complete enough to cover website and app launch readiness end to end.
- Focused enough that each skill has a recognizable job.

## Usage Rights

Copyright © 2026 Ahmad Akkawi. All rights reserved.

This repository is public so people can read the description, learn from the skill structure, and install the skills for their own Codex or Claude Code setup. No open-source license is granted. Reuse, redistribution, modified versions, commercial packaging, or publishing this skill pack elsewhere requires written permission from the owner.
