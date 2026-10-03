/**
 * Skill-routing test harness.
 *
 * Eighteen skills that all describe web work will compete for the same prompt.
 * This runs real prompts through a real Claude Code session with the pack
 * loaded, and asserts which skill actually fired — the one thing structural
 * validation cannot tell you.
 *
 * Requires an authenticated `claude` CLI. Run it from a normal terminal:
 *
 *   node test/run-trigger-tests.mjs
 *   node test/run-trigger-tests.mjs --case 7          # one case
 *   node test/run-trigger-tests.mjs --budget 0.25     # per-case USD cap
 *   node test/run-trigger-tests.mjs --keep            # keep raw transcripts
 *
 * Each case runs with --allowedTools Skill, so the session can choose a skill
 * and nothing else. It cannot edit files, run commands, or touch the network.
 *
 * Exit codes: 0 = every case routed as expected, 1 = at least one miss,
 * 2 = harness or environment problem.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACK = path.resolve(HERE, '..');
const CASES_FILE = path.join(HERE, 'trigger-cases.json');

const ROUTING_PROMPT = [
  'You are being evaluated on skill routing only.',
  'Choose the single skill that best matches the request and invoke it.',
  'Then stop immediately. Do not perform the work the skill describes.',
  'If no skill matches, say NO_SKILL and stop.',
].join(' ');

function parseArgs(argv) {
  const args = { case: null, budget: '0.50', keep: false, verbose: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--case') { args.case = Number(argv[i + 1]); i += 1; }
    else if (argv[i] === '--budget') { args.budget = argv[i + 1]; i += 1; }
    else if (argv[i] === '--keep') args.keep = true;
    else if (argv[i] === '--verbose' || argv[i] === '-v') args.verbose = true;
  }
  return args;
}

/**
 * Walk any JSON value looking for a Skill tool_use. The stream-json envelope
 * has changed shape before, so this searches structurally rather than
 * assuming a fixed path.
 */
function findSkillInvocations(value, found = []) {
  if (Array.isArray(value)) {
    for (const v of value) findSkillInvocations(v, found);
    return found;
  }
  if (value && typeof value === 'object') {
    const isToolUse = value.type === 'tool_use' || value.type === 'server_tool_use';
    if (isToolUse && typeof value.name === 'string' && /^skill$/i.test(value.name)) {
      const input = value.input || {};
      const name = input.skill || input.name || input.command || null;
      if (name) found.push(String(name));
    }
    for (const v of Object.values(value)) findSkillInvocations(v, found);
  }
  return found;
}

function normalise(skill) {
  // Plugin skills are namespaced as "web-craft-skills:web-seo-findability".
  return String(skill).split(':').pop().replace(/^\//, '').trim();
}

function runCase(testCase, args) {
  return new Promise((resolve) => {
    const cli = [
      '--plugin-dir', PACK,
      '--print',
      '--output-format', 'stream-json',
      '--verbose',
      '--allowedTools', 'Skill',
      '--permission-mode', 'default',
      '--max-budget-usd', args.budget,
      '--append-system-prompt', ROUTING_PROMPT,
      testCase.prompt,
    ];

    const child = spawn('claude', cli, { cwd: PACK, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });

    child.on('error', (err) => resolve({ error: `could not spawn claude: ${err.message}`, stdout, stderr }));
    child.on('close', (code) => {
      const invoked = [];
      for (const line of stdout.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) continue;
        try { findSkillInvocations(JSON.parse(trimmed), invoked); } catch { /* partial line */ }
      }
      // Fallback: if the envelope hid the tool call, look for a bare skill name.
      if (invoked.length === 0) {
        const m = stdout.match(/\bweb-[a-z-]+\b/g);
        if (m) invoked.push(...new Set(m));
      }
      resolve({ exitCode: code, invoked: invoked.map(normalise), stdout, stderr });
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let cases;
  try {
    cases = JSON.parse(await fs.readFile(CASES_FILE, 'utf8'));
  } catch (err) {
    console.error(`Could not read ${CASES_FILE}: ${err.message}`);
    process.exit(2);
  }
  if (args.case !== null) {
    if (!cases[args.case - 1]) { console.error(`No case ${args.case} (have ${cases.length})`); process.exit(2); }
    cases = [cases[args.case - 1]];
  }

  const outDir = path.join(HERE, '.transcripts');
  await fs.mkdir(outDir, { recursive: true });

  console.log(`\nSkill routing — ${cases.length} case(s) against ${PACK}`);
  console.log(`Budget ${args.budget} USD per case. Only the Skill tool is permitted.\n`);

  const results = [];
  for (const [i, testCase] of cases.entries()) {
    process.stdout.write(`  ${String(i + 1).padStart(2)}. ${testCase.prompt.slice(0, 58).padEnd(60)}`);
    const run = await runCase(testCase, args);

    if (run.error) {
      console.log('HARNESS ERROR');
      console.log(`      ${run.error}`);
      results.push({ ...testCase, status: 'ERROR', detail: run.error });
      continue;
    }

    const transcript = path.join(outDir, `case-${i + 1}.jsonl`);
    await fs.writeFile(transcript, run.stdout);

    const first = run.invoked[0] || null;
    const expected = testCase.expect;
    const acceptable = [expected, ...(testCase.alsoAcceptable || [])];

    let status;
    if (!first) status = 'NO-SKILL';
    else if (first === expected) status = 'PASS';
    else if (acceptable.includes(first)) status = 'PASS*';
    else status = 'MISROUTED';

    console.log(status === 'PASS' ? 'PASS' : `${status} -> ${first || 'none'}`);
    if (status !== 'PASS' && run.stderr.trim() && args.verbose) console.log(`      stderr: ${run.stderr.trim().slice(0, 200)}`);
    results.push({ ...testCase, status, invoked: run.invoked, transcript });
  }

  const pass = results.filter((r) => r.status.startsWith('PASS')).length;
  const misrouted = results.filter((r) => r.status === 'MISROUTED');
  const none = results.filter((r) => r.status === 'NO-SKILL');
  const errored = results.filter((r) => r.status === 'ERROR');

  console.log(`\n  ${pass}/${results.length} routed as expected\n`);

  for (const r of misrouted) {
    console.log(`  MISROUTED  "${r.prompt}"`);
    console.log(`             expected ${r.expect}, got ${r.invoked[0]}`);
    console.log(`             ${r.why ? `ambiguity: ${r.why}` : ''}`);
    console.log(`             transcript: ${r.transcript}\n`);
  }
  for (const r of none) {
    console.log(`  NO SKILL   "${r.prompt}" (expected ${r.expect}) — transcript: ${r.transcript}\n`);
  }
  if (errored.length) {
    console.log(`  ${errored.length} case(s) failed to run. Is the claude CLI authenticated? Try: claude --version && claude -p "hi"\n`);
  }

  if (!args.keep && misrouted.length === 0 && none.length === 0) {
    await fs.rm(outDir, { recursive: true, force: true });
  } else {
    console.log(`  Raw transcripts kept in ${outDir}\n`);
  }

  process.exit(errored.length ? 2 : (misrouted.length + none.length ? 1 : 0));
}

main().catch((err) => {
  console.error(`harness failed: ${err.stack || err.message}`);
  process.exit(2);
});
