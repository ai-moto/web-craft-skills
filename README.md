# Web Craft Skills

Focused Codex skills for building better websites.

Web Craft Skills is a small, product-neutral Codex plugin for people who want help building polished, accurate, educational websites. It bundles six focused skills for web design, implementation guidance, motion, brand assets, security review, and launch QA.

The public project page is designed for GitHub Pages and lives in [`docs/index.html`](docs/index.html). After publishing this repository under `ai-moto/web-craft-skills` and enabling GitHub Pages, the page should be available at:

```text
https://ai-moto.github.io/web-craft-skills/
```

## What's Included

| Skill | Use it for |
| --- | --- |
| `$web-build-coach` | Build websites while explaining decisions in a useful teaching style. |
| `$web-design-director` | Shape responsive layouts, visual hierarchy, UX, typography, color, and components. |
| `$web-motion-polish` | Add purposeful, accessible, performant animation and micro-interactions. |
| `$web-brand-assets` | Create and review logos, icons, favicons, social images, and brand asset implementation. |
| `$web-security-review` | Perform authorized practical security reviews with evidence and fixes. |
| `$web-launch-qa` | Verify launch readiness with PASS/FAIL/BLOCKED evidence. |

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
Use $web-build-coach to build a portfolio site and explain the file structure.
```

```text
Use $web-design-director to redesign this landing page for a local bakery.
```

```text
Use $web-security-review to audit this Next.js app before launch.
```

```text
Use $web-launch-qa to verify this website before I publish it.
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
- Clear enough for new users to install and try.
- Focused enough that each skill has a recognizable job.

## License

MIT
