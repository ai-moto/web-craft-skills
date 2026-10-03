---
name: web-email-launch
description: Verify website and app email readiness before launch. Use for transactional email, signup/login/password reset emails, magic links, receipts, support mailboxes, sender domains, subdomain sending, SPF, DKIM, DMARC, bounce handling, unsubscribe links, Gmail/Outlook smoke tests, deliverability checks, and mail-tester style scoring. Not for web DNS, SSL, or redirects on the same domain (use $web-deployment-ops), whether a receipt's amounts, taxes, and refund state are correct at the processor (use $web-payments-launch), whether consent and unsubscribe satisfy the privacy policy and applicable law (use $web-legal-compliance), or the in-app signup and reset screens that trigger a send (use $web-core-flow-testing) — this gate owns mail DNS and everything after the app hands a message to a sending provider.
---

# Web Email Launch

## Workflow

1. Inventory every email path: signup, login, password reset, magic link, invite, receipt, refund, notification, contact form, support reply, newsletter, and lifecycle messages.
2. Identify the sending provider, sender domain or subdomain, reply-to address, support mailbox, and environment-specific configuration.
3. Verify DNS records when live DNS is in scope: SPF, DKIM, DMARC, MX, return-path, and tracking domain records.
4. Send real test messages to at least Gmail and Outlook when credentials and scope allow.
5. Check whether links point to production, not localhost, staging, or expired preview URLs.
6. Review message content for clear subject, sender identity, user action, fallback link, support contact, and legal footer where needed.
7. Report PASS/FAIL/BLOCKED with evidence and exact provider, DNS, or code changes.

## Fast check

Run the DNS gate before reading records by hand. It resolves the SPF include
graph recursively and counts DNS-querying terms against the RFC 7208 limit of
10 — a count that is easy to get wrong by eye and that silently fails SPF for
every message once exceeded.

```bash
node <skill-dir>/scripts/check-email-dns.mjs example.com
node <skill-dir>/scripts/check-email-dns.mjs example.com --selector google --selector k1
```

`<skill-dir>` is this skill's own directory — `.agents/skills/web-email-launch/` in
Codex, `.claude/skills/web-email-launch/` in Claude Code, or `skills/web-email-launch/` when
running from a clone of the repo. Keep the working directory at the project root.

DNS only: no mail is sent and nothing is modified. Exits `1` on a `P0`/`P1`,
`2` on a usage error, and `3` when the domain could not be evaluated. DKIM selectors vary by provider — a `BLOCKED`
DKIM result means the probed selectors missed, not that DKIM is absent; get the
selector from the sending provider and re-run with `--selector`.

## Must-Check Items

- SPF includes the active sender and does not exceed DNS lookup limits.
- DKIM is enabled and aligned with the sender domain.
- DMARC exists, starts safely if needed, and has a monitored reporting address.
- Transactional email comes from an appropriate subdomain such as `mail.example.com` or `notify.example.com`.
- Auth and payment emails cannot be triggered for the wrong user.
- Reset, magic-link, invite, and receipt URLs target production and expire appropriately.
- Contact/support forms cannot be abused as open relays or spam launchers.
- Marketing email has consent, unsubscribe, and preference handling when applicable.

## Cautions

- DNS and inbox delivery are live, time-sensitive checks. Reverify before making definitive claims.
- Do not send bulk tests or alter DNS/provider settings without explicit approval.
- Redact tokens, magic links, message IDs, and customer addresses in reports.

## Output

Separate `P0` launch blockers from `P1` first-week deliverability work. Include recipients tested, provider observations, DNS records checked, and anything `BLOCKED` by missing access.

## Severity

Report findings on this pack's shared scale so a launch report can aggregate
them without translation: `P0` blocks launch, `P1` is first-week, `P2`/`P3` are
backlog and polish. Gates are `PASS`, `FAIL`, `BLOCKED`, or `N/A` — `BLOCKED`
means not tested and never rounds up to `PASS`. Tag `OWNER` on anything whose
resolution is a human decision rather than a code change. Full contract:
[`$web-launch-qa` reference/severity.md](../web-launch-qa/reference/severity.md).
