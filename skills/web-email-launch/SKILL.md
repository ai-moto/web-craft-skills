---
name: web-email-launch
description: Verify website and app email readiness before launch. Use for transactional email, signup/login/password reset emails, magic links, receipts, support mailboxes, sender domains, subdomain sending, SPF, DKIM, DMARC, bounce handling, unsubscribe links, Gmail/Outlook smoke tests, deliverability checks, and mail-tester style scoring.
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

Separate launch blockers from first-week deliverability polish. Include recipients tested, provider observations, DNS records checked, and anything blocked by missing access.
