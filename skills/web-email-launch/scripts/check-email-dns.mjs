/**
 * Check transactional-email DNS readiness for a sending domain.
 *
 * Mechanical and read-only: DNS queries only. No mail is sent, no provider
 * console is touched, nothing is modified. Node builtins only — no install.
 *
 * Answers the questions a model should never eyeball off a raw TXT record:
 *   - Does SPF exceed the RFC 7208 limit of 10 DNS-querying terms? This is a
 *     recursive count through every include:/redirect= and it is the single
 *     most common silent deliverability failure.
 *   - Is there exactly one SPF record? (Two = permerror = SPF ignored.)
 *   - Does SPF end in a policy that actually asserts anything?
 *   - Is DMARC present, parseable, and does it have a monitored rua?
 *   - Is a DKIM selector actually published?
 *
 * Usage:
 *   node scripts/check-email-dns.mjs example.com
 *   node scripts/check-email-dns.mjs mail.example.com --selector google --selector k1
 *   node scripts/check-email-dns.mjs example.com --json
 *
 * Exit codes: 0 = no P0/P1 findings, 1 = at least one P0/P1, 2 = usage error.
 */

import dns from 'node:dns/promises';

// RFC 7208 section 4.6.4. Terms that cost a DNS lookup against the limit of 10.
const LOOKUP_TERMS = new Set(['include', 'a', 'mx', 'ptr', 'exists']);
const SPF_LOOKUP_LIMIT = 10;

// Selectors worth probing when the user does not name one. Covers the
// providers that show up most often in front of a web app's transactional mail.
const DEFAULT_SELECTORS = [
  'google',        // Google Workspace
  'selector1',     // Microsoft 365
  'selector2',     // Microsoft 365
  's1', 's2',      // SendGrid
  'k1', 'k2',      // Mailchimp / Mandrill
  'pm',            // Postmark
  'resend',        // Resend
  'mailo',         // Mailgun (mailo._domainkey on some setups)
  'mg',            // Mailgun
  'sparkpostmail', // SparkPost
  'default',
  'dkim',
  'mail',
];

const findings = [];

function record(severity, gate, message, detail) {
  findings.push({ severity, gate, message, detail });
}

// A lookup that simply finds nothing is normal; only a broken resolver is fatal.
const EMPTY_DNS = new Set(['ENOTFOUND', 'ENODATA', 'EBADNAME', 'SERVFAIL', 'ETIMEOUT', 'EREFUSED', 'ECONNREFUSED', 'NOTFOUND']);

async function txt(name) {
  try {
    const chunks = await dns.resolveTxt(name);
    // A TXT record can be split into multiple strings; they concatenate.
    return chunks.map((parts) => parts.join(''));
  } catch (err) {
    if (EMPTY_DNS.has(err.code)) return [];
    throw err;
  }
}

// RFC 7208 §7 macros expand per-message, so the literal term is not a resolvable
// name. Count it against the limit, but never try to resolve it.
const hasMacro = (name) => typeof name === 'string' && name.includes('%{');

function parseSpfTerms(recordText) {
  return recordText
    .split(/\s+/)
    .slice(1) // drop the v=spf1 version token
    .filter(Boolean)
    .map((raw) => {
      const term = raw.replace(/^[+\-~?]/, '');
      const qualifier = /^[+\-~?]/.test(raw) ? raw[0] : '+';
      if (/^redirect=/i.test(term)) {
        return { kind: 'redirect', domain: term.slice(9), raw, qualifier, costs: true };
      }
      if (/^exp=/i.test(term)) return { kind: 'exp', raw, qualifier, costs: false };
      const name = term.split(/[:/=]/)[0].toLowerCase();
      const arg = term.includes(':') ? term.slice(term.indexOf(':') + 1) : null;
      return { kind: name, domain: arg, raw, qualifier, costs: LOOKUP_TERMS.has(name) };
    });
}

/**
 * Walk the SPF graph counting DNS-querying terms exactly the way a receiving
 * mail server does. `seen` guards against include loops.
 */
async function countSpfLookups(domain, trail = [], depth = 0) {
  const result = { count: 0, tree: [], errors: [] };
  if (depth > 12) {
    result.errors.push(`include depth exceeded at ${domain}`);
    return result;
  }
  // Loop detection is about ancestors only. The same domain reached through two
  // sibling branches is a diamond, which RFC 7208 counts twice rather than rejecting.
  if (trail.includes(domain)) {
    result.errors.push(`include loop: ${[...trail, domain].join(' -> ')}`);
    return result;
  }

  const records = (await txt(domain)).filter((r) => /^v=spf1(\s|$)/i.test(r));
  if (records.length === 0) {
    result.errors.push(`no SPF record at ${domain}`);
    return result;
  }
  if (records.length > 1) {
    result.errors.push(`${records.length} SPF records at ${domain} (permerror: receivers ignore SPF entirely)`);
  }

  for (const term of parseSpfTerms(records[0])) {
    if (!term.costs) continue;
    result.count += 1;
    const node = { term: term.raw, domain, cost: 1 };
    if ((term.kind === 'include' || term.kind === 'redirect') && term.domain && !hasMacro(term.domain)) {
      const nested = await countSpfLookups(term.domain, [...trail, domain], depth + 1);
      result.count += nested.count;
      node.children = nested.tree;
      node.subtotal = nested.count + 1;
      result.errors.push(...nested.errors);
    }
    result.tree.push(node);
  }
  return result;
}

function renderTree(nodes, indent = '    ') {
  const lines = [];
  for (const node of nodes) {
    const sub = node.subtotal ? ` (subtree: ${node.subtotal})` : '';
    lines.push(`${indent}${node.term}${sub}`);
    if (node.children?.length) lines.push(...renderTree(node.children, `${indent}  `));
  }
  return lines;
}

async function checkSpf(domain, out) {
  const records = (await txt(domain)).filter((r) => /^v=spf1(\s|$)/i.test(r));
  out.spf = { present: records.length > 0, records };

  if (records.length === 0) {
    record('P0', 'SPF', `No SPF record on ${domain}`,
      'Receivers cannot confirm which servers may send as this domain. Publish a v=spf1 record naming the sending provider.');
    return;
  }
  if (records.length > 1) {
    record('P0', 'SPF', `${records.length} SPF records on ${domain}`,
      'RFC 7208 treats multiple SPF records as a permerror and receivers skip SPF entirely. Merge into one record.');
  }

  const spf = records[0];
  const { count, tree, errors } = await countSpfLookups(domain);
  out.spf.lookups = count;
  out.spf.tree = tree;
  out.spf.errors = errors;

  if (count > SPF_LOOKUP_LIMIT) {
    record('P0', 'SPF', `SPF needs ${count} DNS lookups, limit is ${SPF_LOOKUP_LIMIT}`,
      'Everything past the tenth lookup is a permerror, so SPF fails even though the record looks correct. Flatten or drop includes.');
  } else if (count === SPF_LOOKUP_LIMIT) {
    record('P1', 'SPF', `SPF is at the limit exactly (${count}/${SPF_LOOKUP_LIMIT})`,
      'Any provider that adds one include to their own record silently breaks your SPF. Leave headroom.');
  } else if (count >= 8) {
    record('P2', 'SPF', `SPF uses ${count}/${SPF_LOOKUP_LIMIT} DNS lookups`,
      'Close to the limit. Watch it when adding providers.');
  }

  for (const err of errors) {
    record(/loop|permerror/.test(err) ? 'P0' : 'P1', 'SPF', err, 'Resolved while walking the SPF include graph.');
  }

  // Tokenise rather than substring-match: a bare `all` is exactly `+all`, and a
  // domain like include:mail-all.example.com must not read as `-all`.
  const terms = parseSpfTerms(spf);
  const allTerm = terms.find((t) => /^all$/i.test(t.kind));
  const redirect = terms.find((t) => t.kind === 'redirect');

  if (!allTerm) {
    // RFC 7208 §6.1: a redirect= target's record replaces this one, including its
    // policy. A record with redirect= and no all is correct, not incomplete.
    if (!redirect) {
      record('P1', 'SPF', 'SPF has no "all" mechanism',
        'Without a terminating all, receivers get no policy for unlisted senders. Use ~all while monitoring, then -all.');
    }
  } else if (allTerm.qualifier === '+') {
    record('P0', 'SPF', `SPF ends in ${allTerm.raw === 'all' ? 'a bare "all", which means +all' : '+all'}`,
      'This authorises the entire internet to send as your domain. It is worse than having no SPF at all.');
  }
}

async function checkDmarc(domain, out) {
  const records = (await txt(`_dmarc.${domain}`)).filter((r) => /^v=DMARC1\b/i.test(r));
  out.dmarc = { present: records.length > 0, records };

  if (records.length === 0) {
    record('P1', 'DMARC', `No DMARC record at _dmarc.${domain}`,
      'Gmail and Yahoo require DMARC for bulk senders and increasingly penalise its absence for transactional mail. Start at p=none with a rua address.');
    return;
  }
  if (records.length > 1) {
    record('P0', 'DMARC', `${records.length} DMARC records at _dmarc.${domain}`, 'Multiple DMARC records are invalid; receivers ignore the policy.');
  }

  const tags = Object.fromEntries(
    records[0].split(';').map((p) => p.trim().split('=')).filter((p) => p.length === 2)
      .map(([k, v]) => [k.trim().toLowerCase(), v.trim()]),
  );
  out.dmarc.tags = tags;

  if (!tags.p) {
    record('P0', 'DMARC', 'DMARC record has no p= policy tag', 'The p tag is mandatory; without it the record is invalid.');
  } else if (tags.p === 'none') {
    record('P2', 'DMARC', 'DMARC policy is p=none (monitoring only)',
      'Correct while you collect reports. Plan the move to quarantine once the rua data is clean.');
  }
  if (!tags.rua) {
    record('P1', 'DMARC', 'DMARC has no rua= reporting address',
      'Without aggregate reports you cannot tell whether alignment is passing before you tighten the policy.');
  }
  if (tags.pct && Number(tags.pct) < 100) {
    record('P2', 'DMARC', `DMARC pct=${tags.pct} — policy applies to a subset only`, 'Intentional during rollout; confirm it is deliberate.');
  }
}

async function checkDkim(domain, selectors, out) {
  out.dkim = { checked: selectors, found: [] };
  for (const selector of selectors) {
    const records = await txt(`${selector}._domainkey.${domain}`);
    const key = records.find((r) => /(^|;)\s*(v=DKIM1|k=rsa|p=)/i.test(r));
    if (key) {
      const empty = /(^|;)\s*p=\s*(;|$)/i.test(key);
      out.dkim.found.push({ selector, revoked: empty });
      if (empty) {
        record('P0', 'DKIM', `Selector ${selector} is published but has an empty p= (revoked key)`,
          'An empty public key explicitly revokes the selector; signatures against it fail.');
      }
    }
  }
  const revoked = out.dkim.found.filter((d) => d.revoked);
  if (revoked.length > 1 && revoked.length === out.dkim.found.length) {
    // Every probed selector answered with the same empty key: that is a wildcard
    // null record, not N independent revocations.
    findings.splice(0, findings.length, ...findings.filter((f) => f.gate !== 'DKIM'));
    out.dkim.wildcardNull = true;
    record('P3', 'DKIM', `${domain} publishes a wildcard DKIM null record`,
      'Every probed selector returns an empty p=, which is the standard way to declare that this domain signs no mail. Intentional for a domain that never sends.');
  }

  if (out.dkim.found.length === 0) {
    record('BLOCKED', 'DKIM', `No DKIM key found for the probed selectors on ${domain}`,
      `Probed: ${selectors.join(', ')}. This is not proof DKIM is missing — providers use custom selectors. Get the selector from the sending provider and re-run with --selector <name>.`);
  }
}

async function checkMx(domain, out) {
  try {
    const mx = await dns.resolveMx(domain);
    out.mx = mx.sort((a, b) => a.priority - b.priority);
    if (mx.length === 0) {
      record('P2', 'MX', `No MX record on ${domain}`,
        'Fine for a send-only subdomain. A problem if this domain is also expected to receive replies or bounces.');
    }
  } catch (err) {
    out.mx = [];
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
      record('P2', 'MX', `No MX record on ${domain}`, 'Fine for send-only. Confirm replies and bounces land somewhere monitored.');
    } else {
      record('BLOCKED', 'MX', `MX lookup failed: ${err.code || err.message}`, 'Network or resolver problem, not necessarily a config problem.');
    }
  }
}

function parseArgs(argv) {
  const args = { domain: null, selectors: [], json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--selector') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) {
        console.error('--selector needs a value, e.g. --selector google');
        process.exit(2);
      }
      args.selectors.push(value);
      i += 1;
    } else if (a.startsWith('--selector=')) {
      const value = a.slice(11);
      if (!value) { console.error('--selector= needs a value'); process.exit(2); }
      args.selectors.push(value);
    }
    else if (!a.startsWith('-') && !args.domain) args.domain = a;
  }
  return args;
}

const SEVERITY_ORDER = { P0: 0, P1: 1, BLOCKED: 2, P2: 3, P3: 4 };

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.domain) {
    console.error('Usage: node check-email-dns.mjs <domain> [--selector <name>]... [--json]');
    process.exit(2);
  }
  const domain = args.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const selectors = args.selectors.length ? args.selectors : DEFAULT_SELECTORS;

  const out = { domain, checkedAt: new Date().toISOString() };
  await checkMx(domain, out);
  await checkSpf(domain, out);
  await checkDkim(domain, selectors, out);
  await checkDmarc(domain, out);

  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  out.findings = findings;

  if (args.json) {
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.log(`\nEmail DNS — ${domain}`);
    console.log(`Checked ${out.checkedAt} (live DNS; re-verify before launch claims)\n`);

    console.log(`  MX      ${out.mx?.length ? out.mx.map((m) => `${m.priority} ${m.exchange}`).join(', ') : 'none'}`);
    console.log(`  SPF     ${out.spf?.present ? `${out.spf.lookups}/${SPF_LOOKUP_LIMIT} DNS lookups` : 'not published'}`);
    if (out.spf?.tree?.length) console.log(renderTree(out.spf.tree).join('\n'));
    console.log(`  DKIM    ${out.dkim.found.length ? out.dkim.found.map((d) => d.selector).join(', ') : 'no probed selector published'}`);
    console.log(`  DMARC   ${out.dmarc?.present ? `p=${out.dmarc.tags?.p ?? '?'}${out.dmarc.tags?.rua ? ' rua set' : ' no rua'}` : 'not published'}`);

    console.log(`\n${findings.length} finding(s)\n`);
    for (const f of findings) {
      console.log(`  [${f.severity}] ${f.gate}: ${f.message}`);
      console.log(`         ${f.detail}\n`);
    }
    if (findings.length === 0) console.log('  No SPF/DKIM/DMARC problems detected by this check.\n');
  }

  process.exit(findings.some((f) => f.severity === 'P0' || f.severity === 'P1') ? 1 : 0);
}

main().catch((err) => {
  console.error(`check-email-dns failed: ${err.stack || err.message}`);
  process.exit(2);
});
