/**
 * Check live HTTPS, redirect, TLS, security-header, cache, and compression
 * state for a deployed site.
 *
 * Read-only: GET/HEAD requests and one TLS handshake. Nothing is modified.
 * Node builtins only — no install.
 *
 * Replaces the ad-hoc `curl -I` improvisation with a deterministic gate:
 *   - Full redirect chain from http/https x apex/www, so canonical-host
 *     mistakes and redirect loops surface as a chain, not a guess.
 *   - Certificate expiry in days, from the actual handshake.
 *   - Security headers scored against concrete thresholds, not vibes.
 *   - Source-map exposure probed rather than assumed.
 *
 * Usage:
 *   node scripts/check-headers.mjs example.com
 *   node scripts/check-headers.mjs https://app.example.com --no-www
 *   node scripts/check-headers.mjs example.com --json
 *
 * Exit codes: 0 = evaluated and clean, 1 = P0/P1 found, 2 = usage error,
 * 3 = the target could not be evaluated (never treat as a pass).
 */

import tls from 'node:tls';

const UA = 'web-craft-skills/check-headers (+read-only launch check)';
const MAX_HOPS = 10;
const TIMEOUT_MS = 10000;
const HSTS_MIN_AGE = 15552000; // 180 days, the floor hstspreload.org accepts

const findings = [];
const record = (severity, gate, message, detail) => findings.push({ severity, gate, message, detail });

async function head(url, { method = 'GET' } = {}) {
  const res = await fetch(url, {
    method,
    redirect: 'manual',
    headers: { 'user-agent': UA, 'accept-encoding': 'gzip, deflate, br' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return res;
}

/** Follow redirects by hand so the whole chain is visible, not just the endpoint. */
async function chase(startUrl) {
  const chain = [];
  let url = startUrl;
  for (let hop = 0; hop < MAX_HOPS; hop += 1) {
    let res;
    try {
      res = await head(url);
    } catch (err) {
      chain.push({ url, error: err.cause?.code || err.code || err.message });
      return { chain, final: null };
    }
    const location = res.headers.get('location');
    chain.push({ url, status: res.status, location: location || null });
    if (res.status >= 300 && res.status < 400 && location) {
      try {
        url = new URL(location, url).toString();
      } catch {
        record('P0', 'Redirects', `${url} redirects to an unparseable Location: ${location}`,
          'Browsers cannot follow this. Usually an empty host variable in the edge or server config.');
        return { chain, final: null };
      }
      continue;
    }
    return { chain, final: { url, res } };
  }
  record('P0', 'Redirects', `Redirect loop or more than ${MAX_HOPS} hops from ${startUrl}`,
    chain.map((c) => `${c.status ?? 'ERR'} ${c.url}`).join(' -> '));
  return { chain, final: null };
}

function certificate(hostname, port = 443) {
  return new Promise((resolve) => {
    const socket = tls.connect(
      // rejectUnauthorized:false so the handshake completes against an expired or
      // untrusted certificate and we can report *why* rather than a bare error.
      { host: hostname, port, servername: hostname, timeout: TIMEOUT_MS, rejectUnauthorized: false },
      () => {
        const cert = socket.getPeerCertificate();
        const authorized = socket.authorized;
        const authorizationError = socket.authorizationError;
        socket.end();
        if (!cert || !cert.valid_to) return resolve({ error: 'no certificate returned' });
        const expires = new Date(cert.valid_to);
        resolve({
          subject: cert.subject?.CN,
          altNames: cert.subjectaltname,
          issuer: cert.issuer?.O || cert.issuer?.CN,
          validTo: expires.toISOString(),
          daysRemaining: Math.floor((expires - Date.now()) / 86400000),
          authorized,
          authorizationError: authorizationError ? String(authorizationError) : null,
        });
      },
    );
    socket.on('timeout', () => { socket.destroy(); resolve({ error: 'TLS handshake timed out' }); });
    // An AggregateError from happy-eyeballs has an empty .message; fall back to
    // the code so the caller never receives a falsy "error".
    socket.on('error', (err) => resolve({
      error: err.message || err.code || (err.errors?.map((e) => e.code).join(', ')) || String(err),
    }));
  });
}

function checkSecurityHeaders(res, url) {
  const h = (name) => res.headers.get(name);
  const out = {};

  const hsts = h('strict-transport-security');
  out.hsts = hsts;
  if (!hsts) {
    record('P1', 'Headers', 'No Strict-Transport-Security header',
      'Without HSTS the first request over http is interceptable even though a redirect exists. Add max-age=31536000; includeSubDomains.');
  } else {
    const age = Number(hsts.match(/max-age=(\d+)/i)?.[1] ?? 0);
    if (age < HSTS_MIN_AGE) {
      record('P2', 'Headers', `HSTS max-age is ${age}s (under the ${HSTS_MIN_AGE}s floor)`,
        'Short max-age gives little protection and is below the preload-list threshold.');
    }
  }

  const csp = h('content-security-policy') || h('content-security-policy-report-only');
  out.csp = csp;
  out.cspReportOnly = !h('content-security-policy') && !!h('content-security-policy-report-only');
  if (!csp) {
    record('P1', 'Headers', 'No Content-Security-Policy header',
      'CSP is the main defence-in-depth control against injected script. Start in report-only mode if you need to learn the real sources first.');
  } else {
    if (out.cspReportOnly) {
      record('P2', 'Headers', 'CSP is report-only and not enforcing',
        'Useful while tuning. It blocks nothing until moved to Content-Security-Policy.');
    }
    if (/script-src[^;]*'unsafe-inline'/i.test(csp) && !/script-src[^;]*'(nonce-|sha\d)/i.test(csp)) {
      record('P2', 'Headers', "CSP allows 'unsafe-inline' for script-src with no nonce or hash",
        'This removes most of the XSS protection CSP provides. Move to nonces or hashes when the stack supports it.');
    }
    if (!/frame-ancestors/i.test(csp) && !h('x-frame-options')) {
      record('P1', 'Headers', 'No clickjacking protection (no frame-ancestors and no X-Frame-Options)',
        'The site can be framed by any origin. Add frame-ancestors to CSP.');
    }
  }

  out.xcto = h('x-content-type-options');
  if (!/nosniff/i.test(out.xcto || '')) {
    record('P2', 'Headers', 'No X-Content-Type-Options: nosniff',
      'Browsers may MIME-sniff responses, which turns some uploads into script.');
  }

  out.referrerPolicy = h('referrer-policy');
  if (!out.referrerPolicy) {
    record('P2', 'Headers', 'No Referrer-Policy header',
      'Full URLs leak to third parties on outbound navigation. strict-origin-when-cross-origin is a safe default.');
  }

  out.permissionsPolicy = h('permissions-policy');
  if (!out.permissionsPolicy) {
    record('P3', 'Headers', 'No Permissions-Policy header',
      'Optional hardening: explicitly deny camera, microphone, geolocation and payment when unused.');
  }

  const disclosure = ['server', 'x-powered-by', 'x-aspnet-version'].filter((n) => h(n));
  out.disclosure = Object.fromEntries(disclosure.map((n) => [n, h(n)]));
  if (h('x-powered-by')) {
    record('P3', 'Headers', `X-Powered-By discloses ${h('x-powered-by')}`,
      'Minor fingerprinting surface. Remove it in the framework or edge config.');
  }

  const acao = h('access-control-allow-origin');
  out.cors = { acao, credentials: h('access-control-allow-credentials') };
  if (acao === '*' && /true/i.test(h('access-control-allow-credentials') || '')) {
    record('P0', 'CORS', 'Access-Control-Allow-Origin: * combined with Allow-Credentials: true',
      'Browsers reject this combination, and where it is honoured it exposes credentialed responses to any origin. Use an explicit allowlist.');
  }

  out.cacheControl = h('cache-control');
  const isHtml = /text\/html/i.test(res.headers.get('content-type') || '');
  if (isHtml && out.cacheControl && /max-age=(\d+)/i.test(out.cacheControl)) {
    const age = Number(out.cacheControl.match(/max-age=(\d+)/i)[1]);
    if (age > 3600 && !/no-cache|must-revalidate|s-maxage/i.test(out.cacheControl)) {
      record('P1', 'Cache', `HTML is cached for ${age}s with no revalidation directive`,
        `Deploys will not reach users holding a cached document for up to ${Math.round(age / 3600)}h. Serve HTML with no-cache and cache fingerprinted assets instead.`);
    }
  }
  if (isHtml && /public/i.test(out.cacheControl || '') && /set-cookie/i.test([...res.headers.keys()].join(','))) {
    record('P0', 'Cache', 'Response sets a cookie and is marked publicly cacheable',
      'A shared cache can serve one user session to another. Mark personalised responses private.');
  }

  out.contentEncoding = res.headers.get('content-encoding');
  if (!out.contentEncoding && isHtml) {
    record('P2', 'Compression', 'HTML is served uncompressed',
      'Brotli or gzip on HTML is usually a one-line host setting and cuts transfer substantially.');
  }
  return out;
}

async function checkSourceMaps(finalUrl, res) {
  const out = { scriptsChecked: [], exposed: [] };
  const ct = res.headers.get('content-type') || '';
  if (!/text\/html/i.test(ct)) return out;

  let html;
  try { html = await res.text(); } catch { return out; }

  const srcs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]).slice(0, 3);
  for (const src of srcs) {
    const abs = new URL(src, finalUrl).toString();
    out.scriptsChecked.push(abs);
    try {
      const js = await fetch(abs, { headers: { 'user-agent': UA } });
      if (!js.ok) continue;
      const body = await js.text();
      const map = body.match(/[#@]\s*sourceMappingURL=(\S+)/);
      if (!map) continue;
      if (map[1].startsWith('data:')) { out.exposed.push({ script: abs, map: 'inline data: URI' }); continue; }
      const mapUrl = new URL(map[1], abs).toString();
      const mapRes = await fetch(mapUrl, { method: 'HEAD', headers: { 'user-agent': UA } });
      if (mapRes.ok) out.exposed.push({ script: abs, map: mapUrl });
    } catch { /* network hiccup on one asset is not a finding */ }
  }
  if (out.exposed.length) {
    record('P2', 'Source maps', `${out.exposed.length} source map(s) publicly reachable`,
      `${out.exposed.map((e) => e.map).join(', ')} — fine if intentional for debugging, a leak if the original source is private. Decide deliberately.`);
  }
  return out;
}

function parseArgs(argv) {
  const args = { target: null, json: false, www: null }; // www: null = auto-detect
  for (const a of argv) {
    if (a === '--json') args.json = true;
    else if (a === '--no-www') args.www = false;
    else if (a === '--www') args.www = true;
    else if (!a.startsWith('-') && !args.target) args.target = a;
  }
  return args;
}

const SEVERITY_ORDER = { P0: 0, P1: 1, BLOCKED: 2, P2: 3, P3: 4 };

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.target) {
    console.error('Usage: node check-headers.mjs <domain-or-url> [--no-www] [--json]');
    process.exit(2);
  }
  const base = new URL(/^https?:\/\//i.test(args.target) ? args.target : `https://${args.target}`);
  const host = base.hostname;
  const port = base.port; // '' for the scheme default
  const isWwwHost = host.startsWith('www.');
  const apex = isWwwHost ? host.slice(4) : host;
  const authority = (h) => (port ? `${h}:${port}` : h);

  const out = { target: base.toString(), checkedAt: new Date().toISOString(), redirects: {} };

  // The apex/www x http/https matrix only describes a public site on default
  // ports. On an explicit port it would invent three hosts that were never meant
  // to answer, so probe exactly what the user named.
  const explicitPort = Boolean(port);
  out.explicitPort = explicitPort;

  // Second-level suffixes where the registrable name is one label further down.
  // Without these, bbc.co.uk reads as "not an apex" and www.bbc.co.uk — the host
  // this script then reports as canonical — is never tested.
  const MULTI_LABEL_SUFFIX = /\.(co|com|org|net|gov|ac|edu|or|ne|in|co)\.[a-z]{2,3}$/i;
  const looksRegistrable = apex.split('.').length === 2 || MULTI_LABEL_SUFFIX.test(apex);
  const probeWww = args.www === null ? (looksRegistrable && !explicitPort) : args.www;
  out.wwwProbed = probeWww;
  if (!probeWww) {
    out.wwwSkippedReason = explicitPort
      ? `${base.host} names an explicit port; only that origin was probed.`
      : `${apex} does not look like a registrable apex; pass --www to force the www. probe.`;
  }

  const entryPoints = explicitPort
    ? [base.toString()]
    : [`http://${authority(apex)}/`, `https://${authority(apex)}/`];
  if (probeWww) entryPoints.push(`http://www.${apex}/`, `https://www.${apex}/`);

  const finals = new Set();
  const reportedUnreachable = new Set();
  for (const entry of entryPoints) {
    const { chain, final } = await chase(entry);
    out.redirects[entry] = chain;
    if (final && final.res.status < 400) finals.add(new URL(final.url).origin);
    if (entry.startsWith('http://') && final && final.res.status < 400 && new URL(final.url).protocol !== 'https:') {
      record('P0', 'HTTPS', `${entry} does not end on https`,
        `Chain: ${chain.map((c) => `${c.status ?? 'ERR'} ${c.url}`).join(' -> ')}`);
    }
    const failed = chain.find((c) => c.error);
    if (failed && !reportedUnreachable.has(failed.error)) {
      reportedUnreachable.add(failed.error);
      const code = String(failed.error);
      const isTls = /^(CERT_|ERR_TLS|DEPTH_ZERO|SELF_SIGNED|UNABLE_TO_VERIFY|EPROTO)/.test(code);
      record(entry.includes('www.') ? 'P1' : 'P0', 'Reachability', `${failed.url} did not respond (${code})`,
        isTls
          ? 'The host answered but the TLS handshake failed. See the TLS gate below for the certificate detail.'
          : 'Either the DNS record is missing or the host does not serve this name. Confirm the canonical host choice is deliberate.');
    }
  }
  out.canonicalOrigins = [...finals];
  if (finals.size > 1) {
    record('P1', 'Redirects', `Entry points resolve to ${finals.size} different origins: ${[...finals].join(', ')}`,
      'Split canonical hosts divide SEO signals and break absolute links and cookies. Pick one and 301 the rest to it.');
  }

  // TLS
  out.certificate = await certificate(host, port ? Number(port) : 443);
  if (out.certificate.error) {
    record('P0', 'TLS', `Could not complete a TLS handshake with ${base.host}: ${out.certificate.error}`, 'Certificate, SNI, or reachability problem.');
  } else {
    if (out.certificate.authorized === false) {
      record('P0', 'TLS', `Certificate is not trusted: ${out.certificate.authorizationError}`, 'Browsers will show an interstitial.');
    }
    if (out.certificate.daysRemaining < 0) {
      record('P0', 'TLS', `Certificate expired ${Math.abs(out.certificate.daysRemaining)} days ago`, 'The site is unreachable in every browser.');
    } else if (out.certificate.daysRemaining < 14) {
      record('P1', 'TLS', `Certificate expires in ${out.certificate.daysRemaining} days`, 'Confirm auto-renewal is actually running, not just configured.');
    } else if (out.certificate.daysRemaining < 30) {
      record('P2', 'TLS', `Certificate expires in ${out.certificate.daysRemaining} days`, 'Normal for short-lived certs; confirm renewal automation.');
    }
  }

  // Headers on the canonical endpoint
  const { final } = await chase(base.toString());
  if (!final) {
    record('BLOCKED', 'Headers', `Could not fetch ${base} to inspect headers`, 'Header, cache and source-map gates were not tested.');
  } else {
    out.finalUrl = final.url;
    out.status = final.res.status;
    if (final.res.status >= 400) {
      record('P0', 'Reachability', `${final.url} returned HTTP ${final.res.status}`, 'The canonical URL does not serve a page.');
    }
    out.headers = checkSecurityHeaders(final.res, final.url);
    out.sourceMaps = await checkSourceMaps(final.url, final.res);
  }

  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  out.findings = findings;

  if (args.json) {
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.log(`\nDeployment headers — ${apex}`);
    console.log(`Checked ${out.checkedAt} (live; DNS/TLS/CDN state changes — re-verify before launch claims)\n`);
    for (const [entry, chain] of Object.entries(out.redirects)) {
      console.log(`  ${entry}\n      ${chain.map((c) => `${c.status ?? `ERR ${c.error}`} ${c.url}`).join('\n   -> ')}`);
    }
    if (out.wwwSkippedReason) console.log(`\n  note    ${out.wwwSkippedReason}`);
    if (out.certificate?.validTo) {
      console.log(`\n  TLS     ${out.certificate.issuer} — expires ${out.certificate.validTo.slice(0, 10)} (${out.certificate.daysRemaining} days)`);
    } else if (out.certificate?.error) {
      console.log(`\n  TLS     handshake failed — ${out.certificate.error}`);
    }
    if (out.headers) {
      console.log(`  HSTS    ${out.headers.hsts || 'absent'}`);
      console.log(`  CSP     ${out.headers.csp ? `${out.headers.csp.slice(0, 90)}${out.headers.csp.length > 90 ? '...' : ''}` : 'absent'}`);
      console.log(`  Cache   ${out.headers.cacheControl || 'absent'}`);
      console.log(`  Encode  ${out.headers.contentEncoding || 'none'}`);
    }
    console.log(`\n${findings.length} finding(s)\n`);
    for (const f of findings) {
      console.log(`  [${f.severity}] ${f.gate}: ${f.message}`);
      console.log(`         ${f.detail}\n`);
    }
    if (findings.length === 0) console.log('  No deployment-header problems detected by this check.\n');
  }

  // Real findings outrank "could not evaluate" — an expired certificate is a P0
  // even though it also prevents the header gate from running. Exit 3 is only for
  // learning nothing at all, which must never be mistaken for a clean result.
  if (findings.some((f) => f.severity === 'P0' || f.severity === 'P1')) process.exit(1);
  if (!out.finalUrl) process.exit(3);
  process.exit(0);
}

main().catch((err) => {
  console.error(`check-headers failed: ${err.stack || err.message}`);
  process.exit(3);
});
