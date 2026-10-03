/**
 * Check crawlability and share-preview metadata for public pages.
 *
 * Read-only: GET requests against the URLs you name, plus /robots.txt and
 * /sitemap.xml. Node builtins only — no install.
 *
 * Catches the launch-day failures that are invisible in a rendered page:
 *   - A stray noindex left on from staging.
 *   - localhost / vercel.app / staging hostnames baked into canonical or og:url.
 *   - An og:image that 404s, so every share renders blank.
 *   - Duplicate titles across pages, which only shows up when you compare them.
 *
 * Usage:
 *   node scripts/check-metadata.mjs https://example.com
 *   node scripts/check-metadata.mjs https://example.com /pricing /docs /about
 *   node scripts/check-metadata.mjs https://example.com --json
 *
 * Exit codes: 0 = evaluated and clean, 1 = P0/P1 found, 2 = usage error,
 * 3 = no page could be evaluated (never treat as a pass).
 */

const UA = 'web-craft-skills/check-metadata (+read-only launch check)';
const TIMEOUT_MS = 10000;

// Hostnames that mean "this metadata was written against a non-production origin".
// Matched against a hostname only, never a whole URL: `.local` needs a host
// boundary or /i18n/messages.locale.json reads as a non-production origin.
const NON_PRODUCTION = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|.*\.local|staging\..*|dev\..*|test\..*|preview\..*|.*\.vercel\.app|.*\.netlify\.app|.*\.ngrok[.-].*|.*\.pages\.dev|.*\.onrender\.com|.*\.railway\.app|.*\.fly\.dev)$/i;

/** True when a URL (or bare host) points somewhere that will not exist in production. */
function isNonProduction(value) {
  if (!value) return false;
  try {
    return NON_PRODUCTION.test(new URL(value, 'https://placeholder.invalid').hostname);
  } catch {
    return false;
  }
}

const findings = [];
const record = (severity, gate, message, detail) => findings.push({ severity, gate, message, detail });

function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z-:]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return out;
}

function decode(str) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .trim();
}

function parseHtml(html) {
  const meta = {};
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const key = (a.property || a.name || a.itemprop || '').toLowerCase();
    if (key && a.content !== undefined) meta[key] = decode(a.content);
  }
  const links = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) links.push(attrs(m[0]));

  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((m) => decode(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')));

  return {
    title: decode(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]),
    lang: attrs(html.match(/<html\b[^>]*>/i)?.[0] || '').lang || null,
    meta,
    links,
    h1s,
    canonical: links.find((l) => (l.rel || '').toLowerCase() === 'canonical')?.href || null,
    hreflang: links.filter((l) => l.hreflang).map((l) => ({ hreflang: l.hreflang, href: l.href })),
    jsonLd: [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
      .map((m) => { try { return JSON.parse(m[1]); } catch { return { __invalid: true }; } }),
  };
}

async function checkPage(url, seenTitles, out) {
  let res;
  try {
    res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    record('BLOCKED', 'Fetch', `Could not fetch ${url}`, err.cause?.code || err.message);
    return;
  }
  if (!res.ok) {
    record('P0', 'Fetch', `${url} returned HTTP ${res.status}`, 'A page that does not return 200 cannot be indexed.');
    return;
  }

  const html = await res.text();
  const page = parseHtml(html);
  // res.url is the URL after redirects. Comparing canonicals against the URL the
  // user typed reports every apex-to-www site as broken.
  const finalUrl = res.url || url;
  page.url = finalUrl;
  page.requestedUrl = url;
  page.status = res.status;
  out.pages.push(page);

  const finalOrigin = new URL(finalUrl).origin;
  // Include the query string: two distinct URLs sharing a path must not collapse
  // into a self-referential "shares its title with itself" finding.
  const u = new URL(finalUrl);
  const label = u.origin === out.origin ? `${u.pathname}${u.search}` : finalUrl;

  // Indexability first — everything else is moot if the page says noindex.
  const robotsMeta = page.meta.robots || '';
  const xRobots = res.headers.get('x-robots-tag') || '';
  page.robotsMeta = robotsMeta || null;
  page.xRobotsTag = xRobots || null;
  if (/noindex/i.test(robotsMeta)) {
    record('P0', 'Indexing', `${label} has meta robots noindex`,
      'The page is explicitly excluded from search results. Almost always a staging default that shipped.');
  }
  if (/noindex/i.test(xRobots)) {
    record('P0', 'Indexing', `${label} sends X-Robots-Tag: ${xRobots}`,
      'A header-level noindex overrides page content and is easy to miss because it is invisible in the HTML.');
  }

  // Title
  if (!page.title) {
    record('P0', 'Metadata', `${label} has no <title>`, 'Search and browser tabs fall back to the URL.');
  } else {
    if (page.title.length > 65) {
      record('P3', 'Metadata', `${label} title is ${page.title.length} chars`, 'Likely truncated in results. Front-load the distinguishing words.');
    }
    if (page.title.length < 10) {
      record('P2', 'Metadata', `${label} title is only ${page.title.length} chars`, 'Too short to describe the page.');
    }
    const prior = seenTitles.get(page.title);
    if (prior) {
      record('P1', 'Metadata', `${label} shares its title with ${prior}`,
        `Both use "${page.title}". Duplicate titles compete with each other and hide one page from results.`);
    } else {
      seenTitles.set(page.title, label);
    }
  }

  // Description
  const desc = page.meta.description;
  if (!desc) {
    record('P1', 'Metadata', `${label} has no meta description`, 'Search engines synthesise a snippet, usually badly.');
  } else if (desc.length < 50) {
    record('P3', 'Metadata', `${label} description is ${desc.length} chars`, 'Short enough to look unfinished in a result.');
  }

  // Canonical
  if (!page.canonical) {
    record('P2', 'Metadata', `${label} has no canonical URL`, 'Query-string and trailing-slash variants can be indexed separately.');
  } else {
    if (isNonProduction(page.canonical)) {
      record('P0', 'Metadata', `${label} canonical points at a non-production host: ${page.canonical}`,
        'Search engines are being told the real page lives on your staging or preview origin.');
    }
    try {
      const c = new URL(page.canonical, finalUrl);
      if (c.origin !== finalOrigin) {
        record('P1', 'Metadata', `${label} canonical points to a different origin (${c.origin})`, 'Confirm this cross-origin canonical is deliberate.');
      }
    } catch {
      record('P1', 'Metadata', `${label} canonical is not a valid URL: ${page.canonical}`, 'Malformed canonicals are ignored.');
    }
  }

  // lang
  if (!page.lang) {
    record('P2', 'Accessibility', `${label} <html> has no lang attribute`,
      'Screen readers pick the wrong pronunciation and translation tools guess. One attribute fixes it.');
  }

  // Headings
  if (page.h1s.length === 0) {
    record('P2', 'Structure', `${label} has no <h1>`, 'The page has no top-level heading for readers or crawlers.');
  } else if (page.h1s.length > 1) {
    record('P3', 'Structure', `${label} has ${page.h1s.length} <h1> elements`, 'Usually fine in modern HTML, but check it is deliberate and not a layout accident.');
  }

  // Social preview
  const ogTitle = page.meta['og:title'];
  const ogImage = page.meta['og:image'];
  const ogUrl = page.meta['og:url'];
  if (!ogTitle) record('P1', 'Social', `${label} has no og:title`, 'Shares in Slack, iMessage, LinkedIn and X fall back to the raw URL.');
  if (ogUrl && isNonProduction(ogUrl)) {
    record('P0', 'Social', `${label} og:url points at a non-production host: ${ogUrl}`, 'Every share links people to staging.');
  }
  if (!ogImage) {
    record('P1', 'Social', `${label} has no og:image`, 'Shares render as a bare text link, which measurably reduces click-through.');
  } else {
    const abs = (() => { try { return new URL(ogImage, finalUrl).toString(); } catch { return null; } })();
    if (!abs) {
      record('P1', 'Social', `${label} og:image is not a resolvable URL: ${ogImage}`, 'Crawlers require an absolute URL.');
    } else if (isNonProduction(abs)) {
      record('P0', 'Social', `${label} og:image is hosted on a non-production origin: ${abs}`, 'The preview breaks as soon as the preview deploy is torn down.');
    } else {
      try {
        let img = await fetch(abs, { method: 'HEAD', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
        // Many CDNs reject HEAD but serve GET, which is what crawlers actually use.
        if ([403, 405, 501].includes(img.status)) {
          img = await fetch(abs, {
            headers: { 'user-agent': UA, range: 'bytes=0-0' },
            signal: AbortSignal.timeout(TIMEOUT_MS),
          });
        }
        page.ogImageStatus = img.status;
        if (!img.ok && img.status !== 206) {
          record('P0', 'Social', `${label} og:image returns HTTP ${img.status}`, `${abs} — every share of this page renders without an image.`);
        } else {
          const bytes = Number(img.headers.get('content-length') || 0);
          if (bytes && bytes > 5 * 1024 * 1024) {
            record('P2', 'Social', `${label} og:image is ${(bytes / 1048576).toFixed(1)}MB`, 'Several platforms refuse to fetch images above ~5MB.');
          }
        }
      } catch {
        record('BLOCKED', 'Social', `${label} og:image could not be fetched`, `${abs} — network error, not necessarily a config problem.`);
      }
    }
  }

  if (page.jsonLd.some((j) => j && j.__invalid)) {
    record('P2', 'Structured data', `${label} has a JSON-LD block that does not parse`, 'Invalid structured data is discarded silently.');
  }
}

async function checkSiteFiles(origin, out) {
  // robots.txt
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    out.robotsTxt = { status: res.status };
    if (res.ok) {
      const body = await res.text();
      out.robotsTxt.body = body;
      const global = body.split(/user-agent:/i).find((b) => b.trim().startsWith('*'));
      if (global && /^\s*disallow:\s*\/\s*$/im.test(global)) {
        record('P0', 'Crawlability', 'robots.txt disallows the entire site for all crawlers',
          'Disallow: / under User-agent: * blocks every page. Standard staging default that must not ship.');
      }
      out.robotsTxt.sitemaps = [...body.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]);
      if (out.robotsTxt.sitemaps.length === 0) {
        record('P3', 'Crawlability', 'robots.txt does not reference a sitemap', 'Optional, but it is the cheapest way to help discovery.');
      }
    } else {
      record('P2', 'Crawlability', `robots.txt returned HTTP ${res.status}`, 'Not fatal — crawlers assume everything is allowed — but usually unintentional.');
    }
  } catch (err) {
    record('BLOCKED', 'Crawlability', 'Could not fetch robots.txt', err.message);
  }

  // sitemap.xml — falling back to whatever robots.txt declared before complaining.
  const sitemapCandidates = [`${origin}/sitemap.xml`, ...(out.robotsTxt?.sitemaps ?? [])];
  try {
    let res = null;
    let usedUrl = null;
    for (const candidate of sitemapCandidates) {
      try {
        const attempt = await fetch(candidate, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
        usedUrl = candidate;
        res = attempt;
        if (attempt.ok) break;
      } catch { /* try the next declared sitemap */ }
    }
    if (!res) throw new Error('no sitemap candidate responded');
    out.sitemap = { status: res.status, url: usedUrl, fromRobots: usedUrl !== `${origin}/sitemap.xml` };
    if (res.ok) {
      const body = await res.text();
      const locs = [...body.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => m[1]);
      out.sitemap.urlCount = locs.length;
      out.sitemap.isIndex = /<sitemapindex/i.test(body);
      if (locs.length === 0) {
        record('P2', 'Crawlability', 'sitemap.xml contains no <loc> entries', 'An empty sitemap is worse than none — it signals an empty site.');
      }
      const bad = locs.filter((l) => isNonProduction(l));
      if (bad.length) {
        record('P0', 'Crawlability', `sitemap.xml lists ${bad.length} non-production URL(s)`,
          `${bad.slice(0, 3).join(', ')}${bad.length > 3 ? ' ...' : ''} — these point crawlers at staging.`);
      }
      const sitemapOrigin = new URL(usedUrl).origin;
      const offOrigin = locs.filter((l) => { try { return new URL(l).origin !== sitemapOrigin; } catch { return true; } });
      if (offOrigin.length && !out.sitemap.isIndex) {
        record('P1', 'Crawlability', `sitemap.xml lists ${offOrigin.length} URL(s) outside ${origin}`, 'Crawlers ignore sitemap entries outside the sitemap host.');
      }
    } else {
      record('P2', 'Crawlability', `No sitemap responded (last tried ${usedUrl}, HTTP ${res.status})`,
        sitemapCandidates.length > 1
          ? `Tried ${sitemapCandidates.length} candidates including the ones robots.txt declares.`
          : 'Confirm the framework generates one at a different path, or add one.');
    }
  } catch (err) {
    record('BLOCKED', 'Crawlability', 'Could not fetch sitemap.xml', err.message);
  }
}

const SEVERITY_ORDER = { P0: 0, P1: 1, BLOCKED: 2, P2: 3, P3: 4 };

async function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes('--json');
  const unknown = argv.filter((a) => a.startsWith('-') && a !== '--json');
  if (unknown.length) {
    console.error(`Unknown option(s): ${unknown.join(', ')}`);
    console.error('Usage: node check-metadata.mjs <base-url> [path-or-url]... [--json]');
    process.exit(2);
  }
  const positional = argv.filter((a) => !a.startsWith('-'));
  if (positional.length === 0) {
    console.error('Usage: node check-metadata.mjs <base-url> [path-or-url]... [--json]');
    process.exit(2);
  }

  const base = new URL(/^https?:\/\//i.test(positional[0]) ? positional[0] : `https://${positional[0]}`);
  const targets = positional.length > 1
    ? positional.slice(1).map((p) => new URL(p, base).toString())
    : [base.toString()];

  const out = { origin: base.origin, checkedAt: new Date().toISOString(), pages: [] };
  const seenTitles = new Map();
  for (const t of targets) await checkPage(t, seenTitles, out);
  await checkSiteFiles(base.origin, out);

  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  out.findings = findings;

  if (json) {
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.log(`\nFindability — ${base.origin}`);
    console.log(`Checked ${out.checkedAt} — ${out.pages.length} page(s)\n`);
    for (const p of out.pages) {
      console.log(`  ${new URL(p.url).pathname}`);
      console.log(`      title      ${p.title || '(none)'}`);
      console.log(`      canonical  ${p.canonical || '(none)'}`);
      console.log(`      og:image   ${p.meta['og:image'] || '(none)'}${p.ogImageStatus ? ` [${p.ogImageStatus}]` : ''}`);
      console.log(`      robots     ${p.robotsMeta || p.xRobotsTag || '(default)'}`);
    }
    console.log(`\n  robots.txt   HTTP ${out.robotsTxt?.status ?? '?'}${out.robotsTxt?.sitemaps?.length ? ` (sitemap: ${out.robotsTxt.sitemaps.join(', ')})` : ''}`);
    const sm = out.sitemap;
    const smCount = sm?.urlCount === undefined ? '' : ` (${sm.urlCount} ${sm.isIndex ? 'child sitemaps' : 'urls'})`;
    console.log(`  sitemap      HTTP ${sm?.status ?? '?'}${smCount}${sm?.fromRobots ? ` via robots.txt -> ${sm.url}` : ''}`);
    console.log(`\n${findings.length} finding(s)\n`);
    for (const f of findings) {
      console.log(`  [${f.severity}] ${f.gate}: ${f.message}`);
      console.log(`         ${f.detail}\n`);
    }
    if (findings.length === 0) console.log('  No findability problems detected by this check.\n');
  }

  if (findings.some((f) => f.severity === 'P0' || f.severity === 'P1')) process.exit(1);
  // No page was successfully read: report that rather than a clean pass.
  if (out.pages.length === 0) process.exit(3);
  process.exit(0);
}

main().catch((err) => {
  console.error(`check-metadata failed: ${err.stack || err.message}`);
  process.exit(3);
});
