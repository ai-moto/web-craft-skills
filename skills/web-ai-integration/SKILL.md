---
name: web-ai-integration
description: Review and harden AI/LLM features in websites and web apps before launch. Use for model API key exposure, prompt injection from user or fetched content, rendering model output safely, streaming and timeout handling, token cost caps, quota and billing limits, rate limiting and abuse of AI endpoints, provider outage fallback, model version pinning and deprecation, PII in prompts, provider data retention and training opt-out, and evaluating output quality before shipping a model change. Not for secret scanning, XSS, or auth review outside the model call path (use $web-security-review), hosting and CDN billing or trial expiry (use $web-deployment-ops), money charged to customers (use $web-payments-launch), what the privacy policy discloses (use $web-legal-compliance), or pages made slow by AI-written code rather than by AI features (use $web-performance-audit) — this gate owns the provider call path end to end, from key to prompt to output to spend to model version.
---

# Web AI Integration

An AI feature is a third-party dependency that costs money per request, fails
in ways the browser cannot retry, and executes text that users control. None of
those three properties are covered by a normal web review, which is why they
reliably ship broken.

## Boundaries

Review only systems the user owns. Do not send real customer data to a provider
to "test" a prompt, and do not raise spend limits, change provider account
settings, or swap a production model without explicit approval.

## Workflow

1. Inventory every AI call path: which routes, which providers, which models,
   which prompts, and what user-controlled text reaches each one.
2. Trace the key. Confirm the provider key lives server-side only and is never
   shipped in client bundles, public env vars, or a proxy anyone can call.
3. Trace the input. Identify every place user text, uploaded files, fetched
   URLs, retrieved documents, or tool results enter a prompt.
4. Trace the output. Identify what happens to the model's response — rendered
   as HTML, executed as code, used in a query, passed to a tool, or written to
   storage.
5. Check the failure envelope: timeouts, cancellation, retries, streaming
   interruption, rate-limit responses, and total provider outage.
6. Check the money: per-request cost, per-user caps, global spend limits,
   billing state, and what happens when a quota or trial period ends.
7. Verify with a real request in a non-production environment where possible,
   and say whether evidence is code-only or actually exercised.

## Must-Check Items

**Keys and access**

- Provider API keys are server-side only. Nothing in `NEXT_PUBLIC_*`,
  `VITE_*`, `PUBLIC_*`, client bundles, or source maps.
- The server route that proxies the model is authenticated and rate-limited.
  An unauthenticated proxy is a free API key for the entire internet.
- Keys are scoped and rotatable, and rotation does not require a redeploy.

**Prompt injection**

- User-controlled text is treated as data, not instruction. Injected text must
  not be able to redirect the model's task, reveal the system prompt, or
  trigger a tool call the user could not trigger directly.
- Content the app *fetches* — a URL the user supplied, a retrieved document, a
  scraped page, an uploaded file — is the highest-risk input and is treated
  with the same suspicion as direct user input.
- Model output never becomes an authorisation decision. If the model says the
  user is an admin, that is a string, not a permission.

**Output handling**

- Model output rendered as HTML or Markdown is sanitised. A model that can be
  induced to emit `<img onerror=...>` is a stored-XSS vector.
- Model output used in SQL, shell, file paths, URLs, or tool arguments is
  validated against an allowlist, never interpolated raw.
- Links in model output are not auto-followed and are marked untrusted.

**Failure and latency**

- Every call has a timeout shorter than the platform's function limit, so the
  user sees a real error rather than a gateway 504.
- Streaming responses handle mid-stream disconnection without leaving partial
  state written.
- Client requests are cancellable, and cancellation actually aborts the
  upstream call rather than paying for a response nobody reads.
- There is a defined behaviour for provider 429s and 5xxs: retry with backoff,
  degrade to a non-AI path, or fail with a message that tells the user what to
  do. "Spinner forever" is not one of the three.

**Cost and quota**

- There is a hard spend ceiling at the provider, not only an alert.
- Per-user and per-IP limits exist on every AI endpoint. Cost abuse does not
  require a breach — it only requires a loop.
- Maximum output tokens are bounded per request.
- Someone is alerted before the ceiling is reached, not after.
- **Billing state has an expiry date and that date is known.** Free trials,
  promotional credits, and card expiry all silently stop a shipped AI feature
  on a specific calendar day. Record the date, set the alert earlier than the
  date, and treat it as a launch item rather than a future problem.

**Provider and model lifecycle**

- The model ID is pinned and recorded, not left to a floating alias that
  changes behaviour underneath the product.
- The provider's deprecation schedule for that model is known.
- Prompt and model changes are evaluated against saved cases before shipping.
  "It looked better in one manual test" is not evidence.

**Privacy**

- Personal data sent to the provider is minimised and disclosed in the privacy
  policy — coordinate with `$web-legal-compliance`.
- Provider data retention and training-use settings are deliberate and
  recorded, not left at whatever the default was on signup day.
- Prompts and completions in logs are redacted or short-lived. Full prompt
  logging is a personal-data store that nobody remembers building.

## Cautions

- Do not test prompt injection against a live production system without
  approval; use a staging copy.
- Do not paste real user data into a provider playground.
- Provider pricing, limits, model availability, and deprecation dates change
  frequently — verify against current provider documentation in the session
  rather than from memory, and timestamp what you checked.
- A feature that works in one manual test has not been evaluated. Say which it
  is.

## Output

Report findings on this pack's shared scale — `P0`/`P1`/`P2`/`P3`, gates as
`PASS`/`FAIL`/`BLOCKED`/`N/A`, `OWNER` for anything needing a provider-account
or budget decision. Full contract:
[`$web-launch-qa` reference/severity.md](../web-launch-qa/reference/severity.md).

Lead with key exposure and unauthenticated proxies, then injection paths that
reach a tool or the DOM, then cost ceilings, then lifecycle. State clearly
whether each conclusion is code-only or exercised against a real request.
