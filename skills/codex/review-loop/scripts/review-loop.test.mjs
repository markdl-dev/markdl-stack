import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assess, finish, resume } from './convergence.mjs';
const dir = dirname(fileURLToPath(import.meta.url));
const isCodex = existsSync(join(dir, 'review-loop-state.mjs'));
const helper = join(dir, isCodex ? 'review-loop-state.mjs' : 'run-review-pass.mjs');
const check = (id, result = 'fail') => ({ id, result, evidence: `Regression ${id}: expected correct behavior; observed ${result}.` });
const closed = (id, checks = [check('repro', 'pass')]) => ({ id, checks });
const f = (id, extra = {}) => ({ id, priority: 'P2', action: 'fix', evidence: `Demonstrated failure in ${id}`, checks: [check('repro')], ...extra });
const initial = () => ({ status: 'review_ready', pass: 1, report: 'pass-01.md' });
function round(state, findings, before, after) {
  state = assess(state, { findings }, before);
  state = finish(state, 'ready_for_rereview', after, `resolution-${state.pass}`);
  return { ...state, status: 'review_ready', pass: state.pass + 1 };
}

test('semantic recurrence and conflicting remedies stop before edits', () => {
  const s = round(initial(), [f('same-root')], 'A', 'B');
  let stopped = assess(s, { findings: [f('same-root')] }, 'B');
  assert.equal(stopped.status, 'convergence_blocked');
  assert.deepEqual(stopped.convergence.stop.evidence[0].earlier_passes, [1]);
  assert.equal(assess(s, { findings: [f('other-root', { conflicts_with: ['same-root'] })], resolved: [closed('same-root')] }, 'B').status, 'convergence_blocked');
});
test('consecutive attempts with new evidence still stop when no issue retires', () => {
  let s = round(initial(), [f('same')], 'A', 'B');
  s = round(s, [f('same', { new_evidence: 'Reachable caller two' })], 'B', 'C');
  s = assess(s, { findings: [f('same', { new_evidence: 'Reachable caller three' })] }, 'C');
  assert.equal(s.status, 'convergence_blocked');
  assert.match(s.convergence.stop.reason, /without verified progress/);
});
test('unrelated closures cannot hide two stalled attempts on one issue', () => {
  const check = result => [{ id: 'repro', result, evidence: `Targeted regression: ${result}` }];
  let s = initial();
  for (let pass = 1; pass <= 3; pass++) {
    s = { ...s, pass, status: 'review_ready' };
    s = assess(s, {
      findings: [
        f('core', { new_evidence: `New claim ${pass}`, checks: check('fail') }),
        f(`minor-${pass}`, { checks: check('fail') }),
      ],
      resolved: pass > 1 ? [{ id: `minor-${pass - 1}`, checks: check('pass') }] : [],
    }, `before-${pass}`);
    if (pass < 3) s = finish(s, 'ready_for_rereview', `after-${pass}`, `resolution-${pass}`);
  }
  assert.equal(s.status, 'convergence_blocked');
  assert.equal(s.convergence.stop.evidence[0].id, 'core');
  assert.deepEqual(s.convergence.stop.evidence[0].attempt_passes, [1, 2, 3]);
});
test('one issue may progress beyond four passes by fixing distinct retained failing cases', () => {
  let s = initial();
  for (let pass = 1; pass <= 6; pass++) {
    const checks = Array.from({ length: 6 }, (_, i) => check(`case-${i + 1}`, i < pass - 1 ? 'pass' : 'fail'));
    s = assess({ ...s, pass, status: 'review_ready' }, { findings: [f('core', { checks })] }, `before-${pass}`);
    assert.equal(s.status, 'review_ready');
    assert.equal(s.convergence.rounds.at(-1).issue_progress[0].stalled_attempts, 0);
    s = finish(s, 'ready_for_rereview', `after-${pass}`, `resolution-${pass}`);
  }
  s = assess({ ...s, pass: 7, status: 'review_ready' }, { findings: [], resolved: [closed('core', Array.from({ length: 6 }, (_, i) => check(`case-${i + 1}`, 'pass')))] }, 'after-6');
  assert.doesNotThrow(() => finish(s, 'pass_candidate', 'after-6', 'resolution-7'));
});
test('reviewer silence cannot close an issue without passing regression evidence', () => {
  const s = round(initial(), [f('core')], 'A', 'B');
  assert.throws(() => assess(s, { findings: [] }, 'B'), /Recheck outstanding issue core/);
  assert.throws(() => assess(s, { findings: [], resolved: [closed('core', [])] }, 'B'), /nonempty array/);
  assert.throws(() => assess(s, { findings: [], resolved: [closed('core', [check('repro')])] }, 'B'), /still has a failing check/);
  assert.throws(() => assess(s, { findings: [], resolved: [closed('other')] }, 'B'), /outstanding fix/);
  const verified = assess(s, { findings: [], resolved: [closed('core')] }, 'B');
  assert.deepEqual(verified.convergence.rounds.at(-1).retired_ids, ['core']);
});
test('renaming or dropping a check cannot manufacture progress', () => {
  const s = round(initial(), [f('core')], 'A', 'B');
  assert.throws(() => assess(s, { findings: [f('core', { new_evidence: 'New claim', checks: [check('renamed')] })] }, 'B'), /Retain and recheck core\/repro/);
  assert.throws(() => assess(s, { findings: [], resolved: [closed('core', [check('other', 'pass')])] }, 'B'), /Retain and recheck core\/repro/);
  assert.throws(() => assess(initial(), { findings: [f('core', { checks: [check('a'), check('a')] })] }, 'A'), /duplicate check/);
  assert.throws(() => assess(initial(), { findings: [f('core', { checks: [check('a', 'pass')] })] }, 'A'), /failing check/);
});
test('a check regression stops even alongside verified improvements and new evidence', () => {
  const s = round(initial(), [f('core', { checks: [check('a', 'pass'), check('b')] })], 'A', 'B');
  const stopped = assess(s, { findings: [f('core', { new_evidence: 'Changed implementation', checks: [check('a'), check('b', 'pass')] })] }, 'B');
  assert.equal(stopped.status, 'convergence_blocked');
  assert.match(stopped.convergence.stop.reason, /passing issue check/);
  assert.deepEqual(stopped.convergence.stop.evidence[0].regressed_checks, ['a']);
});
test('older v2 history remains readable and gains per-issue checks on the next assessment', () => {
  const oldFinding = f('core'); delete oldFinding.checks;
  const s = { status: 'review_ready', pass: 2, report: 'pass-2', convergence: { version: 1, decisions: [], rounds: [
    { pass: 1, before: 'A', after: 'B', findings: [oldFinding], status: 'ready_for_rereview', retired_ids: [] },
  ] } };
  const next = assess(s, { findings: [f('core', { new_evidence: 'Current repro establishes the check baseline' })] }, 'B');
  assert.equal(next.convergence.rounds.at(-1).issue_progress[0].stalled_attempts, 1);
  const fixed = finish(next, 'ready_for_rereview', 'C', 'resolution-2');
  const stopped = assess({ ...fixed, pass: 3, status: 'review_ready' }, { findings: [f('core', { new_evidence: 'Another claim' })] }, 'C');
  assert.equal(stopped.status, 'convergence_blocked');
  assert.deepEqual(stopped.convergence.rounds[0], s.convergence.rounds[0]);
});
test('blocked issues remain outstanding until verified or explicitly dispositioned', () => {
  let s = round(initial(), [f('core', { priority: 'P1' })], 'A', 'B');
  s = assess(s, { findings: [f('core', { priority: 'P1', action: 'blocked' })] }, 'B');
  s = finish(s, 'blocked', 'B', 'resolution-2');
  s = { ...s, pass: 3, status: 'review_ready' };
  assert.throws(() => assess(s, { findings: [] }, 'C'), /Recheck outstanding issue core/);
  const verified = assess(s, { findings: [], resolved: [closed('core')] }, 'C');
  assert.doesNotThrow(() => finish(verified, 'pass_candidate', 'C', 'resolution-3'));
});
test('resume resets counters but preserves all outstanding issues and their retained checks', t => {
  let s = round(initial(), [f('core', { priority: 'P1' })], 'A', 'B');
  s = assess(s, { findings: [f('core', { priority: 'P1' }), f('new-at-stop', { priority: 'P1' })] }, 'B');
  assert.equal(s.status, 'convergence_blocked');
  const folder = mkdtempSync(join(tmpdir(), 'review-loop-decision-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const decision = join(folder, 'decision.md');
  writeFileSync(decision, 'User authorized a revised attempt, preserving mandatory fixes.');
  s = { ...resume(s, decision), pass: 3, status: 'review_ready' };
  assert.throws(() => assess(s, { findings: [] }, 'C'), /Recheck outstanding issue/);
  assert.throws(() => assess(s, { findings: [f('core', { checks: [check('renamed')] }), f('new-at-stop')] }, 'C'), /Retain and recheck/);
  const retried = assess(s, { findings: [f('core'), f('new-at-stop')] }, 'C');
  assert.equal(retried.status, 'review_ready');
  assert.equal(retried.convergence.rounds.at(-1).issue_progress[0].stalled_attempts, 0);
  const verified = assess(s, { findings: [], resolved: [closed('core'), closed('new-at-stop')] }, 'D');
  assert.doesNotThrow(() => finish(verified, 'pass_candidate', 'D', 'resolution-3'));
});
test('stable invalid and eligible deferred findings permit completion', () => {
  let s = initial();
  s = assess(s, { findings: [f('noise', { action: 'invalid' })] }, 'A');
  s = finish(s, 'pass_candidate', 'A', 'r1');
  s = assess({ ...s, status: 'review_ready', pass: 3 }, { findings: [f('noise', { action: 'invalid' }), f('polish', { action: 'defer' })] }, 'A');
  assert.doesNotThrow(() => finish(s, 'pass_candidate', 'A', 'r3'));
  assert.throws(() => assess(initial(), { findings: [f('p1', { action: 'defer', priority: 'P1' })] }, 'A'), /deferred/);
});
test('same content and unassessed or actionable completion cannot bypass guards', () => {
  assert.throws(() => finish(initial(), 'pass_candidate', 'A', 'r'), /Assess/);
  let s = assess(initial(), { findings: [f('x')] }, 'A');
  assert.throws(() => finish(s, 'ready_for_rereview', 'A', 'r'), /changed content/);
  assert.throws(() => finish(s, 'pass_candidate', 'A', 'r'), /required fix/);
  assert.equal(assess(initial(), { findings: [], stop_reason: 'Semantic oscillation', stop_evidence: 'Pass 1 and 3 restore the same contract' }, 'A').status, 'convergence_blocked');
});

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'review-loop-v2-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const exec = (cmd, args) => {
    const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8' });
    assert.equal(r.status, 0, `${cmd} ${args.join(' ')}: ${r.stderr}`);
    return r.stdout;
  };
  exec('git', ['init', '-b', 'main']);
  exec('git', ['config', 'user.name', 'Review fixture']);
  exec('git', ['config', 'user.email', 'fixture@example.test']);
  exec('git', ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(root, 'app.txt'), 'base\n');
  exec('git', ['add', 'app.txt']);
  exec('git', ['commit', '-m', 'fixture']);
  exec('git', ['switch', '-c', 'feature']);
  writeFileSync(join(root, 'app.txt'), 'A\n');
  const loop = join(root, '.review-loop-v2');
  mkdirSync(loop);
  // Keep the fake executable outside the reviewed repository.
  const fakeDir = mkdtempSync(join(tmpdir(), 'review-loop-v2-codex-'));
  t.after(() => rmSync(fakeDir, { recursive: true, force: true }));
  const fake = join(fakeDir, 'codex');
  writeFileSync(fake, '#!/usr/bin/env node\nconsole.log("[P2] Fixture finding at app.txt:1");\n', { mode: 0o755 });
  function call(args, ok = true) {
    const r = spawnSync(process.execPath, [helper, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, REVIEW_LOOP_CODEX_BIN: fake } });
    if (!ok) { assert.notEqual(r.status, 0, r.stdout); return r; }
    assert.equal(r.status, 0, r.stderr);
    const line = r.stdout.split('\n').findLast(l => /^REVIEW_LOOP_(STATE|RESULT) /.test(l));
    assert.ok(line, r.stdout);
    return JSON.parse(line.slice(line.indexOf(' ') + 1));
  }
  let currentPass;
  function review(extra = []) {
    let r = call(isCodex ? ['prepare', ...extra] : extra);
    currentPass = r.pass;
    if (isCodex && r.status === 'prepared') {
      writeFileSync(join(loop, 'raw.md'), '[P2] Fixture finding at app.txt:1');
      r = call(['record-review', '--pass', String(r.pass), '--input', '.review-loop-v2/raw.md']);
    }
    return r;
  }
  function assessment(findings, extra = {}) {
    const state = JSON.parse(readFileSync(join(loop, 'state.json')));
    const previous = state.convergence?.rounds.at(-1);
    const resolved = (previous?.findings ?? []).filter(old => old.action === 'fix' && !findings.some(f => f.id === old.id)).map(old => closed(old.id, old.checks.map(c => ({ ...c, result: 'pass' }))));
    writeFileSync(join(loop, 'assessment.json'), JSON.stringify({ findings, resolved, ...extra }));
    return call(isCodex ? ['assess', '--pass', String(currentPass), '--input', '.review-loop-v2/assessment.json'] : ['--assess', '.review-loop-v2/assessment.json']);
  }
  function resolve(status, content) {
    if (content) writeFileSync(join(root, 'app.txt'), content+'\n');
    const resolution = `.review-loop-v2/pass-${currentPass}-resolution.md`;
    writeFileSync(join(root, resolution), `Evidence and verification.\n${status.toUpperCase()}\n`);
    return call(isCodex ? ['resolve', '--pass', String(currentPass), '--status', status, '--resolution', resolution] : ['--resolve', resolution, '--status', status]);
  }
  return { root, loop, call, review, assessment, resolve, exec };
}

test('productive work passes four and completes only on confirming review', t => {
  const h = fixture(t);
  for (let p = 1; p <= 6; p++) {
    assert.equal(h.review().pass, p);
    assert.equal(h.assessment([f(`defect-${p}`)]).status, 'assessment_ready');
    assert.equal(h.resolve('ready_for_rereview', `fix-${p}`).status, 'ready_for_rereview');
  }
  assert.equal(h.review().pass, 7);
  h.assessment([]);
  assert.equal(h.resolve('pass_candidate').status, 'pass_candidate');
  assert.equal(h.call(isCodex ? ['complete'] : ['--mark-complete']).status, 'complete');
  assert.ok(existsSync(join(h.loop, 'checkpoint.json')));
});
test('per-issue stalls persist through the real helper despite unrelated fixes', t => {
  const h = fixture(t);
  for (let pass = 1; pass <= 3; pass++) {
    assert.equal(h.review().pass, pass);
    const result = h.assessment([
      f('core', { new_evidence: `Reproduced extra case ${pass}` }),
      f(`minor-${pass}`),
    ]);
    if (pass < 3) {
      assert.equal(result.status, 'assessment_ready');
      assert.equal(h.resolve('ready_for_rereview', `attempt-${pass}`).status, 'ready_for_rereview');
    } else {
      assert.equal(result.status, 'convergence_blocked');
      assert.equal(result.evidence[0].id, 'core');
      assert.equal(result.evidence[0].stalled_attempts, 2);
    }
  }
  const before = readFileSync(join(h.root, 'app.txt'), 'utf8');
  assert.equal(h.review().status, 'convergence_blocked');
  if (isCodex) h.call(['complete'], false);
  else assert.equal(h.call(['--mark-complete']).status, 'convergence_blocked');
  assert.equal(readFileSync(join(h.root, 'app.txt'), 'utf8'), before);
  assert.equal(existsSync(join(h.loop, 'checkpoint.json')), false);
  const state = JSON.parse(readFileSync(join(h.loop, 'state.json')));
  assert.deepEqual(state.convergence.rounds[2].retired_ids, ['minor-2']);
  assert.deepEqual(state.convergence.stop.evidence[0].attempt_passes, [1, 2, 3]);
});
test('A to B to A stops durably, cannot complete, and explicit decision permits next review', t => {
  const h = fixture(t);
  h.review(); h.assessment([f('one')]); h.resolve('ready_for_rereview', 'B');
  h.review(); h.assessment([f('two')]);
  const stopped = h.resolve('ready_for_rereview', 'A');
  assert.equal(stopped.status, 'convergence_blocked');
  assert.equal(h.review().status, 'convergence_blocked');
  writeFileSync(join(h.root, 'app.txt'), 'incidental edit\n');
  assert.equal(h.review().status, 'convergence_blocked');
  if (isCodex) h.call(['complete'], false);
  else assert.equal(h.call(['--mark-complete']).status, 'convergence_blocked');
  assert.equal(existsSync(join(h.loop, 'checkpoint.json')), false);
  writeFileSync(join(h.loop, 'decision.md'), 'User chose the revised contract and authorized one new attempt.');
  assert.equal(h.call(isCodex ? ['resume', '--decision', '.review-loop-v2/decision.md'] : ['--resume', '.review-loop-v2/decision.md']).status, 'ready_for_rereview');
  assert.equal(h.review().pass, 3);
  const state = JSON.parse(readFileSync(join(h.loop, 'state.json')));
  assert.equal(state.convergence.decisions.length, 1);
  assert.equal(state.convergence.rounds.length, 2);
  h.assessment([f('three')]); h.resolve('ready_for_rereview', 'next');
  h.review();
  assert.equal(h.assessment([f('three')]).status, 'convergence_blocked');
});
test('user budget is optional, enforced, and can be explicitly raised', t => {
  const h = fixture(t);
  h.review(['--max-passes', '1']); h.assessment([f('one')]); h.resolve('ready_for_rereview', 'B');
  assert.equal(h.review().status, 'max_passes_reached');
  assert.equal(h.review(['--max-passes', '2']).pass, 2);
});
test('staging does not count as substantive progress', t => {
  const h = fixture(t);
  h.review(); h.assessment([f('one')]); h.exec('git', ['add', 'app.txt']);
  const resolution = '.review-loop-v2/staged-resolution.md';
  writeFileSync(join(h.root, resolution), 'READY_FOR_REREVIEW\n');
  h.call(isCodex ? ['resolve', '--pass', '1', '--status', 'ready_for_rereview', '--resolution', resolution] : ['--resolve', resolution, '--status', 'ready_for_rereview'], false);
});


test('v1 artifacts are untouched and excluded from the review target', t => {
  const h = fixture(t);
  const old = join(h.root, '.review-loop'); mkdirSync(old);
  writeFileSync(join(old, 'state.json'), '{"status":"complete","pass":4}');
  h.review();
  writeFileSync(join(old, 'other-report.md'), 'Original reviewer history');
  assert.equal(h.assessment([]).status, 'assessment_ready');
  assert.equal(readFileSync(join(old, 'state.json'), 'utf8'), '{"status":"complete","pass":4}');
  assert.equal(h.resolve('pass_candidate').status, 'pass_candidate');
});

test('an imported report is used only once, then requests a fresh review', { skip: !isCodex }, t => {
  const h = fixture(t);
  const input = join(h.loop, 'imported.md'); writeFileSync(input, '[P1] Existing review');
  assert.equal(h.review(['--initial-report', input]).imported, true);
  h.assessment([f('imported')]); h.resolve('ready_for_rereview', 'B');
  const next = h.call(['prepare', '--initial-report', input]);
  assert.equal(next.status, 'prepared'); assert.equal(next.pass, 2);
});


test('staging a previously untracked file is not progress', t => {
  const h = fixture(t);
  writeFileSync(join(h.root, 'new.txt'), 'unchanged content');
  h.review(); h.assessment([f('one')]); h.exec('git', ['add', 'new.txt']);
  const resolution = '.review-loop-v2/staged-resolution.md';
  writeFileSync(join(h.root, resolution), 'READY_FOR_REREVIEW\n');
  h.call(isCodex ? ['resolve', '--pass', '1', '--status', 'ready_for_rereview', '--resolution', resolution] : ['--resolve', resolution, '--status', 'ready_for_rereview'], false);
});
