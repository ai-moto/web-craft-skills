---
name: web-launch-qa
description: Verify website or web app readiness before release, and route each launch gate to the specialist skill that owns it. Use for launch checklists, go/no-go reviews, staging-to-production checks, browser QA, and PASS/FAIL/BLOCKED launch reports that route each applicable gate to its specialist skill and aggregate the results. Not for a single gate asked about on its own — hands-on browser and journey testing belongs to $web-core-flow-testing, staging-to-production infrastructure checks to $web-deployment-ops, and every other gate to the specialist named in this skill's routing table rather than being re-audited here — so fire this skill only when several gates must be scoped, routed, and aggregated into one go/no-go verdict.
---

# Web Launch QA

This skill is the orchestrator. It decides **which gates apply**, routes each
one to the specialist skill that owns it, and aggregates the results into a
single go/no-go report.

It does not re-audit the surfaces the specialists own. A shallow copy of an
accessibility audit inside a launch checklist is worse than no audit, because
it produces a `PASS` that nobody earned.

## Scope first

Before routing anything, establish:

1. **Target** — local build, preview URL, staging, production, or static files.
2. **Product shape** — does it take payments, send mail, hold accounts, store
   user data, call an AI provider, serve more than one locale?
3. **Access** — which URLs, credentials, provider consoles, and DNS records are
   actually reachable in this session.
4. **Launch bar** — first public release, incremental deploy, or a hard
   external deadline. This sets how much `P1` the owner can absorb.

Answer 2 and 3 explicitly. Every gate you cannot access becomes `BLOCKED`, and
every gate the product does not have becomes `N/A`. Both belong in the report.

## Gate routing

Run the specialist skill for each applicable gate. Do not inline its work here.

| Gate | Skill | Applies when |
|---|---|---|
| Core user journeys | `$web-core-flow-testing` | Always |
| Accessibility | `$web-accessibility-audit` | Always |
| Content and claims | `$web-content-quality` | Any public copy |
| Visual and responsive | `$web-design-director` | Always |
| Motion | `$web-motion-polish` | Animation is present |
| Brand assets | `$web-brand-assets` | Always — favicons and share images |
| Findability | `$web-seo-findability` | Any public page |
| Performance | `$web-performance-audit` | Always |
| Security | `$web-security-review` | Always |
| Deployment and DNS | `$web-deployment-ops` | A real domain is involved |
| Email | `$web-email-launch` | The product sends any mail |
| Payments | `$web-payments-launch` | The product takes money |
| Analytics and monitoring | `$web-analytics-observability` | Always |
| AI integration | `$web-ai-integration` | The product calls a model provider |
| Data resilience | `$web-data-resilience` | The product stores data it cannot recreate |
| Legal and privacy | `$web-legal-compliance` | Any public site collecting anything |

When the user asks for a fast check rather than a full launch review, run the
always-applies rows and say plainly which gates you skipped. Never let a
narrowed scope read as a clean bill of health.

## Fast mechanical gates

Four gates have deterministic scripts. Run them first — they are cheap, they
need no browser, and they resolve questions that are easy to get wrong by eye.

```bash
node <skills-dir>/web-deployment-ops/scripts/check-headers.mjs example.com
node <skills-dir>/web-seo-findability/scripts/check-metadata.mjs https://example.com /pricing
node <skills-dir>/web-email-launch/scripts/check-email-dns.mjs example.com
node <skills-dir>/web-brand-assets/scripts/check-icons.mjs --url https://example.com
```

`<skills-dir>` is wherever this pack is installed — `.agents/skills/` in Codex,
`.claude/skills/` in Claude Code, or `skills/` from a clone. Keep the working
directory at the project root.

Each exits `1` on a `P0`/`P1`, `2` on a usage error, and `3` when the target
could not be evaluated at all — so a dead host or a typo'd path can never be
mistaken for a clean pass in CI. Their
findings already use this pack's severity scale — fold them into the report
rather than restating them.

## Aggregation

Read [reference/severity.md](reference/severity.md) for the full status and
severity contract. In short:

- Gate status is `PASS`, `FAIL`, `BLOCKED`, or `N/A`.
- Findings are `P0`, `P1`, `P2`, `P3`, optionally tagged `OWNER`.
- `BLOCKED` means not tested. It never rounds up to `PASS`.

Deduplicate across specialists before reporting. The same missing security
header will surface from both `$web-security-review` and `$web-deployment-ops`;
report it once, at the higher severity, and name both gates it affects.

Resolve conflicts by consequence. When performance wants a script deferred and
analytics wants it loaded early, state the tradeoff and recommend one — do not
report both findings and leave the owner to referee.

## Go / no-go

The recommendation is one of three, and it is stated in one sentence:

- **Go** — no `P0`, and the `P1` list is one the owner has seen and accepted.
- **Go with conditions** — no `P0`, but named `P1` items need owners and dates.
- **No-go** — at least one `P0`, or so many gates are `BLOCKED` that no honest
  readiness claim is possible.

The second failure mode is the one people miss. If payments, email, and
security are all `BLOCKED` for want of credentials, the correct output is not
"looks good" — it is "this was not tested, and here is what access would let me
test it."

## Final report

```
## Launch readiness: <Go | Go with conditions | No-go>

<one sentence: the reason>

| Gate | Status | Evidence |
...

### P0 — blocks launch
### P1 — fix in the first week
### P2 / P3 — backlog
### Owner decisions
### Not tested — and what would unblock each
```

Close with what would move the biggest `BLOCKED` gate to tested. That single
line is usually the most actionable thing in the whole report.
