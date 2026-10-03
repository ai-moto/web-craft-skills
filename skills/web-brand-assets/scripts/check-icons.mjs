/**
 * Audit the favicon / app-icon / social-image set for a site.
 *
 * Read-only. Two modes:
 *   --url <origin>   fetch the page, follow every declared icon link, read the
 *                    web app manifest, and probe the conventional paths
 *   --dir <path>     scan a local public/ or dist/ directory
 *
 * Node builtins only — no image library. Dimensions are read straight from the
 * PNG IHDR chunk and the ICO directory header, so "apple-touch-icon.png exists"
 * is verified as actually being 180x180 rather than taken on faith. That
 * mismatch is the usual reason an iOS home-screen icon renders blurry.
 *
 * Usage:
 *   node scripts/check-icons.mjs --url https://example.com
 *   node scripts/check-icons.mjs --dir ./public
 *   node scripts/check-icons.mjs --url https://example.com --json
 *
 * Exit codes: 0 = evaluated and clean, 1 = P0/P1 found, 2 = usage error,
 * 3 = the target could not be evaluated (never treat as a pass).
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const UA = 'web-craft-skills/check-icons (+read-only launch check)';
const TIMEOUT_MS = 10000;

const findings = [];
const record = (severity, gate, message, detail) => findings.push({ severity, gate, message, detail });

/** PNG: IHDR is always the first chunk; width/height are big-endian u32 at 16 and 20. */
function pngSize(buf) {
  if (buf.length < 24) return null;
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i += 1) if (buf[i] !== sig[i]) return null;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** ICO: byte 6 = width, byte 7 = height of the first directory entry; 0 means 256. */
function icoSize(buf) {
  if (buf.length < 8 || buf[0] !== 0 || buf[1] !== 0 || buf[2] !== 1) return null;
  return { width: buf[6] || 256, height: buf[7] || 256 };
}

function svgInfo(buf) {
  const text = Buffer.from(buf).toString('utf8', 0, Math.min(buf.length, 4096));
  if (!/<svg[\s>]/i.test(text)) return null;
  return { viewBox: text.match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1] || null };
}

function measure(name, buf, contentType = '') {
  // extname on a URL yields '.png?v=2'. Strip the query by parsing the pathname.
  let ext = '';
  try {
    ext = path.extname(new URL(name, 'https://placeholder.invalid').pathname).toLowerCase();
  } catch {
    ext = path.extname(name).toLowerCase();
  }
  // Fall back to the served content type when the URL carries no extension.
  if (!ext && contentType) {
    if (/svg/i.test(contentType)) ext = '.svg';
    else if (/png/i.test(contentType)) ext = '.png';
    else if (/icon|ico/i.test(contentType)) ext = '.ico';
    else if (/jpe?g/i.test(contentType)) ext = '.jpg';
    else if (/webp/i.test(contentType)) ext = '.webp';
  }
  if (ext === '.png') return { type: 'png', ...(pngSize(buf) || {}) };
  if (ext === '.ico') return { type: 'ico', ...(icoSize(buf) || {}) };
  if (ext === '.svg') return { type: 'svg', ...(svgInfo(buf) || {}) };
  if (ext === '.jpg' || ext === '.jpeg') return { type: 'jpeg' };
  if (ext === '.webp') return { type: 'webp' };
  return { type: ext.replace('.', '') || 'unknown' };
}

function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z-:]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return out;
}

async function fetchBuf(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) return { status: res.status, buf: null };
  return { status: res.status, buf: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get('content-type') };
}

async function auditUrl(origin, out) {
  const base = new URL(origin.startsWith('http') ? origin : `https://${origin}`);
  let html = '';
  try {
    const res = await fetch(base, { headers: { 'user-agent': UA } });
    if (!res.ok) {
      record('BLOCKED', 'Fetch', `${base} returned HTTP ${res.status}`, 'Could not read declared icon links.');
      return;
    }
    html = await res.text();
  } catch (err) {
    record('BLOCKED', 'Fetch', `Could not fetch ${base}`, err.cause?.code || err.message);
    return;
  }

  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const iconLinks = links.filter((l) => /(^|\s)(icon|shortcut icon|apple-touch-icon|apple-touch-icon-precomposed|mask-icon)(\s|$)/i.test(l.rel || ''));
  const manifestLink = links.find((l) => /(^|\s)manifest(\s|$)/i.test(l.rel || ''));
  out.declared = iconLinks.map((l) => ({ rel: l.rel, href: l.href, sizes: l.sizes || null, type: l.type || null }));
  out.assets = [];

  // Cache by URL so a file declared twice is fetched once but still evaluated
  // under every declaration that references it.
  const seen = new Map();
  async function probe(url, label, declared) {
    if (/^data:/i.test(url)) {
      // The `href="data:,"` sentinel is the conventional way to say "no favicon".
      out.assets.push({ label, url: 'data: URI', status: null, inlineData: true });
      return { label, url, status: null, inlineData: true };
    }
    let abs;
    try {
      abs = new URL(url, base).toString();
    } catch {
      out.assets.push({ label, url, error: 'unparseable URL' });
      return null;
    }
    if (seen.has(abs)) {
      const cached = seen.get(abs);
      return cached ? { ...cached, label, declared: declared ?? null } : null;
    }
    try {
      const { status, buf, contentType } = await fetchBuf(abs);
      const entry = { label, url: abs, status, declared: declared ?? null, contentType };
      if (buf) Object.assign(entry, measure(abs, buf, contentType), { bytes: buf.length });
      out.assets.push(entry);
      seen.set(abs, entry);
      return entry;
    } catch (err) {
      out.assets.push({ label, url: abs, error: err.cause?.code || err.message, declared: declared ?? null });
      seen.set(abs, null);
      return null;
    }
  }

  for (const l of iconLinks) {
    if (!l.href) continue;
    const entry = await probe(l.href, l.rel, l.sizes || null);
    if (!entry) continue;
    if (entry.inlineData) {
      record('P3', 'Icons', `${l.rel} is declared as an inline data: URI`,
        'Usually the conventional "this site has no favicon" sentinel. Intentional if the site wants a blank icon.');
      continue;
    }
    if (entry.status !== 200) {
      record('P0', 'Icons', `Declared ${l.rel} returns HTTP ${entry.status}`,
        `${entry.url} is referenced in the page head but does not exist. Browsers show a default or blank icon.`);
      continue;
    }
    // A declared sizes= that disagrees with the real pixels is worse than none.
    if (l.sizes && entry.width) {
      const declaredW = Number(String(l.sizes).split('x')[0]);
      if (declaredW && declaredW !== entry.width) {
        record('P2', 'Icons', `${l.rel} declares sizes="${l.sizes}" but the file is ${entry.width}x${entry.height}`,
          `${entry.url} — browsers pick icons by the declared size, so the wrong one gets chosen.`);
      }
    }
    if (/apple-touch-icon/i.test(l.rel) && entry.width && entry.width !== 180) {
      record('P2', 'Icons', `apple-touch-icon is ${entry.width}x${entry.height}, not 180x180`,
        'iOS scales anything else, which is the usual cause of a soft or blurry home-screen icon.');
    }
    if (entry.type === 'png' && entry.width && entry.width !== entry.height) {
      record('P2', 'Icons', `${l.rel} is not square (${entry.width}x${entry.height})`, 'Non-square icons get letterboxed or cropped unpredictably.');
    }
  }

  // Conventional fallbacks browsers request whether or not they are declared.
  const rootIco = await probe('/favicon.ico', 'implicit /favicon.ico');
  if (!iconLinks.some((l) => /\.ico(\?|$)/i.test(l.href || '')) && rootIco && rootIco.status !== 200) {
    record('P2', 'Icons', 'No /favicon.ico and none declared',
      'Modern browsers accept an SVG icon, but some feed readers, older browsers and link unfurlers still request /favicon.ico directly.');
  }
  if (!iconLinks.some((l) => /(^|\s)icon(\s|$)/i.test(l.rel || ''))) {
    record('P1', 'Icons', 'No <link rel="icon"> in the page head',
      'The site relies entirely on the implicit /favicon.ico lookup and cannot offer an SVG or dark-mode variant.');
  }

  // Web app manifest
  if (manifestLink?.href) {
    const abs = new URL(manifestLink.href, base).toString();
    out.manifest = { url: abs };
    try {
      const res = await fetch(abs, { headers: { 'user-agent': UA } });
      out.manifest.status = res.status;
      if (!res.ok) {
        record('P1', 'Manifest', `Declared web app manifest returns HTTP ${res.status}`, `${abs} — install prompts and PWA metadata are unavailable.`);
      } else {
        const json = await res.json().catch(() => null);
        if (!json) {
          record('P1', 'Manifest', 'Web app manifest is not valid JSON', `${abs} — the browser discards it entirely.`);
        } else {
          out.manifest.parsed = { name: json.name, short_name: json.short_name, icons: json.icons?.length ?? 0 };
          const sizes = new Set();
          for (const icon of json.icons || []) {
            const entry = await probe(icon.src, `manifest ${icon.sizes || ''}`.trim(), icon.sizes);
            if (entry?.status === 200 && entry.width) sizes.add(`${entry.width}x${entry.height}`);
            else if (entry && entry.status !== 200) {
              record('P1', 'Manifest', `Manifest icon returns HTTP ${entry.status}`, `${entry.url} — listed in the manifest but missing.`);
            }
          }
          out.manifest.resolvedSizes = [...sizes];
          for (const need of ['192x192', '512x512']) {
            if (!sizes.has(need)) {
              record('P2', 'Manifest', `Manifest has no working ${need} icon`,
                `${need} is required for an installable PWA and for the Android home screen.`);
            }
          }
          if (!json.name && !json.short_name) {
            record('P2', 'Manifest', 'Manifest declares neither name nor short_name', 'The install prompt has nothing to label the app with.');
          }
        }
      }
    } catch (err) {
      record('BLOCKED', 'Manifest', 'Could not fetch the web app manifest', err.message);
    }
  } else {
    record('P3', 'Manifest', 'No web app manifest declared',
      'Only needed if the site should be installable. Skip deliberately rather than by omission.');
  }

  // Social preview image, cross-checked against brand asset expectations.
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]*>/i);
  if (ogImage) {
    const href = attrs(ogImage[0]).content;
    if (href) {
      const entry = await probe(href, 'og:image');
      if (entry?.status === 200 && entry.width) {
        out.ogImage = entry;
        if (entry.width < 600 || entry.height < 315) {
          record('P2', 'Social', `og:image is ${entry.width}x${entry.height}`,
            'Below roughly 600x315 most platforms fall back to a small square thumbnail instead of a wide card.');
        }
        const ratio = entry.width / entry.height;
        if (ratio < 1.7 || ratio > 2.0) {
          record('P3', 'Social', `og:image aspect ratio is ${ratio.toFixed(2)}:1`,
            'Cards are cropped to about 1.91:1. Anything else loses edges — keep type inside a safe margin.');
        }
      }
    }
  }
}

const EXPECTED_FILES = [
  { name: 'favicon.ico', severity: 'P2', why: 'Requested directly by some readers, older browsers and unfurlers.' },
  { name: 'favicon.svg', severity: 'P3', why: 'Scales cleanly and supports a dark-mode variant via media queries.' },
  { name: 'apple-touch-icon.png', severity: 'P2', why: 'iOS home screen. Must be 180x180.', width: 180 },
];

async function auditDir(dir, out) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true, recursive: true });
  } catch (err) {
    record('BLOCKED', 'Scan', `Could not read ${dir}`, err.message);
    return;
  }
  const files = entries.filter((e) => e.isFile());
  const atRoot = new Map();
  const nested = new Map();
  for (const f of files) {
    const parent = f.parentPath || f.path || dir;
    const full = path.join(parent, f.name);
    const isRoot = path.resolve(parent) === path.resolve(dir);
    const target = isRoot ? atRoot : nested;
    if (!target.has(f.name)) target.set(f.name, full);
  }
  out.scanned = { dir, fileCount: files.length };
  out.assets = [];

  for (const expected of EXPECTED_FILES) {
    const found = atRoot.get(expected.name);
    if (!found && nested.has(expected.name)) {
      record('P2', 'Icons', `${expected.name} exists but not at the root of ${dir}`,
        `Found at ${path.relative(dir, nested.get(expected.name))}. Browsers request it from the web root, so it will 404 where it matters.`);
      continue;
    }
    if (!found) {
      record(expected.severity, 'Icons', `${expected.name} not found under ${dir}`, expected.why);
      continue;
    }
    const buf = await fs.readFile(found);
    const info = measure(expected.name, buf);
    void atRoot;
    out.assets.push({ label: expected.name, file: found, bytes: buf.length, ...info });
    if (expected.width && info.width && info.width !== expected.width) {
      record('P2', 'Icons', `${expected.name} is ${info.width}x${info.height}, expected ${expected.width}x${expected.width}`, expected.why);
    }
    if (info.type === 'png' && info.width && info.width !== info.height) {
      record('P2', 'Icons', `${expected.name} is not square (${info.width}x${info.height})`, 'Non-square icons crop unpredictably.');
    }
    if (info.type === 'svg' && !info.viewBox) {
      record('P2', 'Icons', `${expected.name} has no viewBox`, 'Without a viewBox the SVG will not scale to the size the browser asks for.');
    }
  }

  for (const need of ['192', '512']) {
    const hit = [...atRoot.keys(), ...nested.keys()].find((n) => n.includes(need) && /\.png$/i.test(n));
    if (!hit) record('P3', 'Manifest', `No PWA icon matching ${need}x${need} found under ${dir}`, 'Only needed when the app ships a web app manifest.');
  }
}

function generationHints(out) {
  const missing = findings.filter((f) => f.gate === 'Icons' || f.gate === 'Manifest');
  if (missing.length === 0) return [];
  return [
    '',
    'Generation commands (pick the toolchain the project already has):',
    '',
    '  # ImageMagick, from one square master at 1024x1024:',
    '  magick master.png -resize 180x180 apple-touch-icon.png',
    '  magick master.png -resize 192x192 icon-192.png',
    '  magick master.png -resize 512x512 icon-512.png',
    '  magick master.png -define icon:auto-resize=16,32,48 favicon.ico',
    '',
    '  # sharp-cli, if the project is already Node-based:',
    '  npx sharp-cli -i master.png -o apple-touch-icon.png resize 180 180',
    '',
    'Design the mark at 16px first. A logo that only reads at 512 is not a favicon.',
  ];
}

const SEVERITY_ORDER = { P0: 0, P1: 1, BLOCKED: 2, P2: 3, P3: 4 };

async function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes('--json');
  const urlIdx = argv.indexOf('--url');
  const dirIdx = argv.indexOf('--dir');
  const url = urlIdx >= 0 ? argv[urlIdx + 1] : null;
  const dir = dirIdx >= 0 ? argv[dirIdx + 1] : null;

  if (!url && !dir) {
    console.error('Usage: node check-icons.mjs (--url <origin> | --dir <path>) [--json]');
    process.exit(2);
  }
  if (url && dir) {
    console.error('Pass either --url or --dir, not both.');
    process.exit(2);
  }

  const out = { checkedAt: new Date().toISOString(), mode: url ? 'url' : 'dir' };
  if (url) await auditUrl(url, out);
  else await auditDir(dir, out);

  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  out.findings = findings;

  if (json) {
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.log(`\nBrand assets — ${url || dir}`);
    console.log(`Checked ${out.checkedAt}\n`);
    for (const a of out.assets || []) {
      const dims = a.width ? `${a.width}x${a.height}` : (a.viewBox ? `viewBox ${a.viewBox}` : '');
      const size = a.bytes ? `${(a.bytes / 1024).toFixed(1)}kB` : '';
      console.log(`  ${String(a.label).padEnd(24)} ${String(a.status ?? 'file').padEnd(5)} ${dims.padEnd(12)} ${size}`);
    }
    if (out.manifest) console.log(`\n  manifest  HTTP ${out.manifest.status} — sizes: ${out.manifest.resolvedSizes?.join(', ') || 'none resolved'}`);
    console.log(`\n${findings.length} finding(s)\n`);
    for (const f of findings) {
      console.log(`  [${f.severity}] ${f.gate}: ${f.message}`);
      console.log(`         ${f.detail}\n`);
    }
    if (findings.length === 0) console.log('  No brand-asset problems detected by this check.\n');
    for (const line of generationHints(out)) console.log(line);
  }

  if (findings.some((f) => f.severity === 'P0' || f.severity === 'P1')) process.exit(1);
  // A dead host or a missing directory yields findings about nothing. That is not
  // a pass, and CI must not read it as one.
  const evaluated = (out.assets?.length ?? 0) > 0 || out.scanned?.fileCount > 0;
  if (!evaluated || findings.some((f) => f.severity === 'BLOCKED')) process.exit(3);
  process.exit(0);
}

main().catch((err) => {
  console.error(`check-icons failed: ${err.stack || err.message}`);
  process.exit(3);
});
