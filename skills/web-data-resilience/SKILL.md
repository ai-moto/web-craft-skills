---
name: web-data-resilience
description: Verify that a website or app can survive losing, corrupting, or having to delete its data. Use for database backups, tested restores, point-in-time recovery, RPO/RTO, migration safety and reversibility, destructive-operation guards, production/staging data separation, seed and fixture data, user data export and account deletion, retention policies, storage and upload durability, and recovery runbooks before launch. Not for redeploying the previous build, DNS, or environment variable wiring (use $web-deployment-ops), what a privacy policy promises about deletion and retention (use $web-legal-compliance), or whether an attacker can reach the data in the first place (use $web-security-review) — code rolls back and data does not, so this gate owns only the durable state, its backups, restores, migrations, and deletions that actually remove bytes.
---

# Web Data Resilience

Code rolls back. Data does not. `$web-deployment-ops` covers redeploying the
previous build; this skill covers the question that build cannot answer — if
the database is wrong tomorrow morning, what happens.

The gate is not "are backups configured." It is "has a restore been performed,
by whom, how long did it take, and what was lost." An untested backup is an
assumption with a cron schedule.

## Workflow

1. Inventory the durable state: primary database, caches holding non-rebuildable
   data, object storage and user uploads, search indexes, queues, and anything
   living only in a provider's dashboard.
2. For each store, establish what recreating it from scratch would cost. That
   separates "annoying" from "company over."
3. Check backup configuration: what is captured, how often, where it is stored,
   how long it is kept, and whether it is encrypted.
4. **Check whether a restore has actually been run.** Ask for the date and the
   measured duration. If the answer is no, that is the finding.
5. Review migration practice: reversibility, testing against a production-shaped
   copy, and whether destructive steps can run unattended.
6. Review deletion and export paths, including what "delete my account"
   actually removes and what it leaves in backups and logs.
7. Confirm environment separation, so staging cannot write to production and
   production data is not sitting in a developer's local database.

## Must-Check Items

**Backups**

- Every store that holds data the product cannot recreate is backed up.
  Object storage and user uploads are the ones most often missed.
- Backup frequency is stated as a recovery point objective: the maximum data
  loss that is acceptable, in minutes or hours.
- Backups live in a different failure domain than the primary — a different
  account, region, or provider. A backup inside the account that gets locked
  out is not a backup.
- Retention covers slow-burn corruption, not only sudden loss. A bug that
  quietly writes bad rows for two weeks needs a backup older than two weeks.
- **A restore has been performed and timed.** Record when, by whom, and how
  long. Untested backups fail at exactly the moment they matter.

**Migrations**

- Migrations run in a transaction, or their partial-failure state is understood.
- Destructive migrations — dropping a column, rewriting rows, changing a type —
  are separated from deploys and reviewed before running.
- The rollback path is written down before the migration is applied, and if
  there is no rollback, that is stated rather than assumed.
- The migration was rehearsed against a copy at production scale. A migration
  that is instant on 200 seed rows can lock a table for an hour on 40 million.
- Long migrations do not hold a lock the running app needs.

**Destructive operations**

- Bulk deletes, truncates, and admin "reset" actions require confirmation and
  are logged with the actor.
- No production script defaults to the destructive branch.
- Production database credentials are not the same ones a developer has in a
  local shell by default.

**Environments**

- Staging and preview cannot write to the production database or bucket.
- Production personal data is not copied into staging, seed files, fixtures, or
  local development databases. If it is, that is a privacy finding as much as a
  resilience one — coordinate with `$web-legal-compliance`.
- Seed and fixture data is obviously synthetic, so nobody mistakes it for real
  records in a screenshot or a demo.

**User-facing data rights**

- Account deletion has a defined scope: what is removed immediately, what is
  anonymised, what survives in backups, and how long until backup expiry
  completes the deletion.
- Data export produces something the user can actually read.
- Retention periods exist and are enforced by something automatic, not by
  intention.

**Recovery runbook**

- One page, written before launch, that answers: who is called, where the
  backups are, what the restore command is, how long it takes, and how to tell
  when it worked.
- The runbook is reachable when the primary system is down — not stored only
  inside the app it describes.

## Cautions

- Never run a restore, migration, or deletion against production during a
  review. Rehearse on a copy, and get explicit approval before anything that
  writes.
- Do not treat replication as backup. A replica faithfully copies the bad write.
- Do not treat a provider's default retention as a decision. Read the actual
  window and confirm it matches the recovery point the product needs.
- Backups containing personal data are a personal-data store with their own
  retention and access obligations.

## Output

Report findings on this pack's shared scale — `P0`/`P1`/`P2`/`P3`, gates as
`PASS`/`FAIL`/`BLOCKED`/`N/A`, `OWNER` for anything needing a provider,
budget, or policy decision. Full contract:
[`$web-launch-qa` reference/severity.md](../web-launch-qa/reference/severity.md).

State the recovery point and recovery time the current setup actually delivers,
not the one the configuration implies. Where a restore has never been tested,
report the gate as `BLOCKED` rather than `PASS` — configuration is not evidence.
