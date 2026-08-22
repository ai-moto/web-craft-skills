/**
 * Pre-publish hygiene check for a public skill pack.
 *
 * This pack is public, and it is authored inside a private product repo. The
 * failure mode is not a broken skill — it is a client name, a local absolute
 * path, or a credential riding along into a public repository. That check is
 * worthless as a checklist item someone reads and nods at, so it runs here.
 *
 * Also enforces the boring invariants that drift silently: skill count matching
 * every place it is written down, frontmatter shape, and internal links.
 *
 *   node test/check-pack-hygiene.mjs
 *   node test/check-pack-hygiene.mjs --json
 *
 * Exit codes: 0 = clean, 1 = findings, 2 = harness problem.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Terms that must never appear in a public pack. Extend for your own context.
const PRIVATE_TERMS = [
  'motosenso', 'moto-senso', 'we2akkawi',
];

const SECRET_PATTERNS = [
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{16,}\b/ },
  { name: 'Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'Stripe live key', re: /\bsk_live_[A-Za-z0-9]{16,}\b/ },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'OpenAI key', re: /\bsk-[A-Za-z0-9]{32,}\b/ },
  { name: 'Anthropic key', re: /\bsk-ant-[A-Za-z0-9_-]{24,}\b/ },
  { name: 'private key block', re: /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: 'generic bearer secret', re: /\b(authorization|api[_-]?key|secret|password)\s*[:=]\s*["'][A-Za-z0-9_\-]{20,}["']/i },
];

const SKIP_DIRS = new Set(['.git', 'node_modules', '.transcripts']);
const TEXT_EXT = new Set(['.md', '.json', '.mjs', '.js', '.yaml', '.yml', '.html', '.txt', '.svg']);

const findings = [];
const record = (severity, gate, message, detail) => findings.push({ severity, gate, message, detail });

async function walk(dir, out = []) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

async function main() {
  const json = process.argv.includes('--json');
  const files = await walk(PACK);
  const rel = (f) => path.relative(PACK, f);

  // --- Leakage -------------------------------------------------------------
  const SELF = fileURLToPath(import.meta.url);
  for (const file of files) {
    if (!TEXT_EXT.has(path.extname(file))) continue;
    // This file necessarily contains the patterns it searches for.
    if (file === SELF) continue;
    const body = await fs.readFile(file, 'utf8').catch(() => null);
    if (body === null) continue;

    for (const term of PRIVATE_TERMS) {
      const re = new RegExp(term, 'i');
      const line = body.split('\n').findIndex((l) => re.test(l));
      if (line >= 0) {
        record('P0', 'Leakage', `Private term "${term}" in ${rel(file)}:${line + 1}`,
          'This pack is public. Remove the reference or rename it to a neutral example.');
      }
    }
    for (const { name, re } of SECRET_PATTERNS) {
      const m = body.match(re);
      if (m) {
        const line = body.slice(0, m.index).split('\n').length;
        record('P0', 'Secrets', `Possible ${name} in ${rel(file)}:${line}`,
          'Rotate it immediately if real, then remove it from git history — deleting the line is not enough.');
      }
    }
    // Local absolute paths are the quiet one: harmless-looking, useless to everyone else.
    for (const m of body.matchAll(/\/(?:Users|home)\/[A-Za-z0-9._-]+\//g)) {
      const line = body.slice(0, m.index).split('\n').length;
      record('P1', 'Portability', `Local absolute path in ${rel(file)}:${line} (${m[0]}…)`,
        'Nobody else has this path. Use a relative path or a placeholder.');
      break;
    }
  }

  // --- Structure -----------------------------------------------------------
  const skillsDir = path.join(PACK, 'skills');
  const skillDirs = (await fs.readdir(skillsDir, { withFileTypes: true }))
    .filter((e) => e.isDirectory()).map((e) => e.name).sort();

  for (const name of skillDirs) {
    const smPath = path.join(skillsDir, name, 'SKILL.md');
    const body = await fs.readFile(smPath, 'utf8').catch(() => null);
    if (body === null) { record('P0', 'Structure', `${name} has no SKILL.md`, 'The directory will not load as a skill.'); continue; }

    const fm = body.match(/^---\n([\s\S]*?)\n---\n/);
    if (!fm) { record('P0', 'Structure', `${name} SKILL.md has no YAML frontmatter`, 'Required for the skill to be discovered.'); continue; }
    const fmName = fm[1].match(/^name:\s*(\S+)/m)?.[1];
    const desc = fm[1].match(/^description:\s*(.+)$/m)?.[1];
    if (fmName !== name) {
      record('P0', 'Structure', `${name}: frontmatter name is "${fmName}"`,
        'The invocation name comes from frontmatter, so a mismatch makes the skill respond to a name nobody can guess.');
    }
    if (!desc) record('P0', 'Structure', `${name} has no description`, 'Without a description the model can never route to it.');
    else if (desc.length > 1024) record('P1', 'Structure', `${name} description is ${desc.length} chars`, 'Long descriptions dilute routing signal.');

    for (const link of body.matchAll(/\]\(([^)]+)\)/g)) {
      const target = link[1];
      if (/^(https?:|#)/.test(target)) continue;
      const resolved = path.resolve(skillsDir, name, target);
      if (!(await fs.access(resolved).then(() => true).catch(() => false))) {
        record('P1', 'Links', `${name}: broken link -> ${target}`, 'Relative links resolve from the skill directory.');
      }
    }
    for (const ref of body.matchAll(/<skill-dir>\/([^\s`]+)/g)) {
      const resolved = path.join(skillsDir, name, ref[1]);
      if (!(await fs.access(resolved).then(() => true).catch(() => false))) {
        record('P1', 'Scripts', `${name}: references missing file ${ref[1]}`, 'The documented command will fail.');
      }
    }
  }

  // --- Count drift ---------------------------------------------------------
  const count = skillDirs.length;
  const claims = [
    ['README.md', /(\d+)\s+focused skills/],
    ['.codex-plugin/plugin.json', /bundles (\d+) focused skills/],
    ['docs/index.html', /Showing all (\d+) skills/],
  ];
  for (const [file, re] of claims) {
    const body = await fs.readFile(path.join(PACK, file), 'utf8').catch(() => null);
    if (body === null) continue;
    const m = body.match(re);
    if (m && Number(m[1]) !== count) {
      record('P1', 'Consistency', `${file} claims ${m[1]} skills, there are ${count}`, 'Update the count when adding or removing a skill.');
    }
  }
  const cards = (await fs.readFile(path.join(PACK, 'docs/index.html'), 'utf8').catch(() => ''))
    .match(/class="skill-card/g)?.length ?? 0;
  if (cards && cards !== count) {
    record('P1', 'Consistency', `docs/index.html has ${cards} skill cards for ${count} skills`, 'Every skill needs a card, and every card a skill.');
  }

  // --- Report --------------------------------------------------------------
  const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  if (json) {
    console.log(JSON.stringify({ pack: PACK, skills: count, findings }, null, 2));
  } else {
    console.log(`\nPack hygiene — ${count} skills, ${files.length} files\n`);
    for (const f of findings) {
      console.log(`  [${f.severity}] ${f.gate}: ${f.message}`);
      console.log(`         ${f.detail}\n`);
    }
    if (findings.length === 0) console.log('  Clean: no leaked terms, no secret patterns, structure and counts consistent.\n');
  }
  process.exit(findings.length ? 1 : 0);
}

main().catch((err) => { console.error(`hygiene check failed: ${err.stack || err.message}`); process.exit(2); });
