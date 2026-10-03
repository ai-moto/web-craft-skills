# Shared severity and status scale

Every skill in this pack reports findings on this one scale so a launch report
can aggregate them without translation. Load this file when you need the full
definitions; the short form is repeated inline in each skill.

## Gate status

A gate is one area of the launch surface — accessibility, payments, email,
deployment. Each gate gets exactly one status.

| Status | Meaning |
|---|---|
| `PASS` | Tested, and the evidence is in the report. |
| `FAIL` | Tested, and a concrete defect was found. Report it as findings below. |
| `BLOCKED` | **Not tested.** Access, credentials, tooling, hardware, network, or approval was missing. |

`BLOCKED` is not a soft `PASS`. It is the honest statement that nobody knows.
A launch report where six gates are `BLOCKED` is a report that tested a
quarter of the site, and it must read that way. Never downgrade a `BLOCKED`
gate to `PASS` because the code "looks right" — if it was not exercised, it
was not tested.

A gate that genuinely does not apply — payments on a site that takes no money —
is `N/A`, with one line saying why. `N/A` is a claim about the product;
`BLOCKED` is a claim about the test run. Do not use one for the other.

## Finding severity

| Severity | Meaning | Launch decision |
|---|---|---|
| `P0` | Breaks a core task, exposes data, or takes the site down. | Do not launch. |
| `P1` | Real user or business harm, but the site functions. | Launch is a judgement call; fix in the first week. |
| `P2` | Degraded quality, defence-in-depth, or accumulating debt. | Backlog. |
| `P3` | Polish, or optional hardening with no current exposure. | Optional. |

Anchor severity to consequence, not to effort. A one-character fix that takes
the checkout down is `P0`. A week of work that makes the footer tidier is `P3`.

## The OWNER tag

Append `OWNER` to any finding whose resolution is a human decision rather than
a code change: a legal review, a business policy, a jurisdiction question, a
provider account setting, a budget approval, or content only the owner can
supply.

```
[P1 OWNER] Legal: No cookie consent control, and analytics loads on first paint.
```

`OWNER` is orthogonal to severity — it says *who* resolves it, not *how badly*
it matters. It exists so the owner's queue can be separated from the
engineering queue at the end of a report, which is the difference between a
list someone can act on and a list that stalls.

## Evidence

Every `PASS` carries evidence, and every finding carries reproduction.

- **Name the evidence class.** Code-only reading, local run, sandbox test,
  live test, or provider-console observation. These are not equivalent, and a
  reader cannot calibrate confidence without knowing which one you used.
- **Timestamp anything live.** DNS, TLS, deploy state, provider dashboards,
  and search-console data are all true only as of the moment you looked.
- **A passing build is not evidence that the site works.** It is evidence that
  the site compiles.

## Report shape

```
## Launch readiness: <overall>

| Gate | Status | Evidence |
|---|---|---|
| Core flows      | FAIL    | 12 journeys walked, 2 broken |
| Accessibility   | PASS    | keyboard + axe on 6 pages |
| Payments        | BLOCKED | no sandbox credentials |
| Email           | N/A     | site sends no mail |

### P0 — blocks launch
### P1 — fix in the first week
### P2 / P3 — backlog
### Owner decisions
### Not tested
```

The **Not tested** section is mandatory whenever any gate is `BLOCKED`. It is
the part of the report that keeps the rest of it honest.
