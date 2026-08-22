---
name: web-payments-launch
description: Verify payment and billing readiness for websites and apps. Use for Stripe or other processors, checkout, subscriptions, trials, coupons, receipts, taxes, refunds, webhooks, live-mode testing, server-side entitlement checks, paywalls, customer portal, failed payments, idempotency, fraud controls, and merchant-of-record handoff.
---

# Web Payments Launch

## Workflow

1. Identify the payment provider, products, prices, plans, trial logic, coupons, taxes, supported countries, and merchant of record.
2. Map the full money flow: pricing page, checkout, payment success, entitlement, receipt, portal, cancellation, refund, failed payment, and support.
3. Verify server-side enforcement. A frontend paywall alone is not enough.
4. Check webhooks in the intended environment, including signature verification, idempotency, retries, and event ordering.
5. Test in sandbox first. Test live mode only with explicit approval and a safe transaction plan.
6. Report exact mode, account, product IDs redacted as needed, and remaining owner actions.

## Must-Check Items

- Checkout uses server-created sessions or payment intents; prices cannot be tampered with client-side.
- Entitlements are granted from trusted provider events or verified server state.
- Webhook endpoint verifies signatures and handles duplicate events safely.
- Success pages do not grant access without confirming payment state.
- Failed, canceled, refunded, disputed, and expired sessions have clear user states.
- Receipts, invoices, tax behavior, billing address, and support contact are configured.
- Customer portal or cancellation path is discoverable when subscriptions exist.
- Test keys and live keys are never exposed to the frontend.

## Cautions

- Treat payment-provider settings and live transactions as separate approval gates.
- Redact secrets, customer IDs, payment method data, and webhook signing secrets.
- Payment, tax, and merchant-of-record obligations vary by jurisdiction and provider.

## Output

Use PASS/FAIL/BLOCKED by flow. State whether evidence is code-only, sandbox-tested, live-tested, or provider-console-verified.
