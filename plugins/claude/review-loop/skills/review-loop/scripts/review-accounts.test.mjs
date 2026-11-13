import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync, linkSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { accountHome, accountEnvironment, prepareAccountHome, accountIdentity, defaultAccount, localConfigPath, reviewerSettings, modelConfigArgs } from './review-accounts.mjs';
const scripts = dirname(fileURLToPath(import.meta.url));
const runner = join(scripts, 'run-review-pass.mjs');
const manager = join(scripts, 'review-accounts.mjs');
function sandbox(t) {
  const root = mkdtempSync(join(tmpdir(), 'review-account-tests-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const main = join(root, 'main'); mkdirSync(main);
  writeFileSync(join(main, 'auth.json'), 'MAIN_AUTH_SENTINEL');
  writeFileSync(join(main, 'config.toml'), '# MAIN_CONFIG_SENTINEL');
  const env = { ...process.env, CODEX_HOME: main, REVIEW_LOOP_ACCOUNTS_DIR: join(root, 'accounts'), REVIEW_LOOP_CONFIG: join(root, 'settings.json'), OPENAI_API_KEY: 'parent-api-sentinel', CODEX_API_KEY: 'parent-codex-sentinel', CODEX_ACCESS_TOKEN: 'parent-token-sentinel' };
  delete env.REVIEW_LOOP_MODEL; delete env.REVIEW_LOOP_REASONING_EFFORT;
  return { root, main, env };
}
function credential(account, env, subject = account, workspace = account) {
  const home = prepareAccountHome(account, env);
  const token = 'test.' + Buffer.from(JSON.stringify({ sub: subject, email: `${subject}@example.invalid` })).toString('base64url') + '.unsigned';
  writeFileSync(join(home, 'auth.json'), JSON.stringify({ tokens: { id_token: token, account_id: workspace } }), { mode: 0o600 });
  return home;
}
function fixture(t) {
  const h = sandbox(t);
  delete h.env.REVIEW_LOOP_ACCOUNT;
  credential('personal', h.env); credential('work', h.env);
  const repo = join(h.root, 'repo'); mkdirSync(repo);
  const git = args => {
    const r = spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr); return r.stdout;
  };
  git(['init', '-b', 'main']);
  writeFileSync(join(repo, 'app.txt'), 'baseline\n');
  git(['add', '.']); git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'Baseline']);
  writeFileSync(join(repo, 'app.txt'), 'proposal\n');
  const fake = join(h.root, 'codex'); const calls = join(h.root, 'calls.jsonl');
  writeFileSync(fake, `#!/usr/bin/env node
import fs from 'node:fs';
fs.appendFileSync(${JSON.stringify(calls)}, JSON.stringify({args:process.argv.slice(2),home:process.env.CODEX_HOME,authEnv:['OPENAI_API_KEY','CODEX_API_KEY','CODEX_ACCESS_TOKEN'].filter(k=>k in process.env)})+'\\n');
console.log(process.argv.includes('login') ? 'Logged in using ChatGPT' : 'No findings.');
`, { mode: 0o755 });
  const env = { ...h.env, REVIEW_LOOP_CODEX_BIN: fake };
  function call(args = [], ok = true) {
    const p = spawnSync(process.execPath, [runner, '--base', 'main', ...args], { cwd: repo, env, encoding: 'utf8' });
    if (!ok) { assert.notEqual(p.status, 0, p.stdout); return p; }
    assert.equal(p.status, 0, p.stderr);
    return JSON.parse(p.stdout.split('\n').findLast(l => l.startsWith('REVIEW_LOOP_RESULT ')).slice(19));
  }
  const loop = join(repo, '.review-loop-v2');
  function complete() {
    writeFileSync(join(loop, 'assessment.json'), '{"findings":[]}');
    call(['--assess', '.review-loop-v2/assessment.json']);
    writeFileSync(join(loop, 'resolution.md'), 'Checks pass\nPASS_CANDIDATE\n');
    call(['--resolve', '.review-loop-v2/resolution.md', '--status', 'pass_candidate']);
    return call(['--mark-complete']);
  }
  function state() { return JSON.parse(readFileSync(join(loop, 'state.json'))); }
  function invocations() { return existsSync(calls) ? readFileSync(calls, 'utf8').trim().split('\n').map(JSON.parse) : []; }
  return { ...h, env, repo, loop, fake, calls, call, complete, state, invocations };
}

test('account environment isolates credentials without changing parent auth variables', t => {
  const h = sandbox(t); const home = prepareAccountHome('personal', h.env);
  const child = accountEnvironment('personal', h.env);
  assert.equal(child.CODEX_HOME, home);
  for (const name of ['OPENAI_API_KEY', 'CODEX_API_KEY', 'CODEX_ACCESS_TOKEN']) { assert.equal(child[name], undefined); assert.ok(h.env[name]); }
  assert.equal(statSync(home).mode & 0o777, 0o700);
  assert.equal(statSync(join(home, 'config.toml')).mode & 0o777, 0o600);
  assert.equal(readFileSync(join(h.main, 'auth.json'), 'utf8'), 'MAIN_AUTH_SENTINEL');
});
test('current mode preserves the normal credential environment and never creates account files', t => {
  const h = sandbox(t);
  assert.deepEqual(accountEnvironment('current', h.env), h.env);
  assert.equal(accountIdentity('current', h.env).identity_sha256, null);
  assert.throws(() => prepareAccountHome('current', h.env), /codex login/);
  assert.equal(existsSync(h.env.REVIEW_LOOP_ACCOUNTS_DIR), false);
});
test('local defaults and environment override are validated without evaluating configuration as code', t => {
  const h = sandbox(t); delete h.env.REVIEW_LOOP_ACCOUNT;
  assert.equal(defaultAccount(h.env), 'current');
  writeFileSync(h.env.REVIEW_LOOP_CONFIG, '{"defaultAccount":"work"}');
  assert.equal(defaultAccount(h.env), 'work');
  assert.equal(defaultAccount({ ...h.env, REVIEW_LOOP_ACCOUNT: 'personal' }), 'personal');
  writeFileSync(h.env.REVIEW_LOOP_CONFIG, '{"defaultAccount":"../escape"}');
  assert.throws(() => defaultAccount(h.env), /Choose/);
  writeFileSync(h.env.REVIEW_LOOP_CONFIG, '{broken');
  assert.throws(() => defaultAccount(h.env), /Invalid review-loop configuration/);
  writeFileSync(h.env.REVIEW_LOOP_CONFIG, '[]');
  assert.throws(() => defaultAccount(h.env), /must be an object/);
  const env = { XDG_CONFIG_HOME: join(h.root, 'config') };
  assert.equal(localConfigPath(env), join(h.root, 'config', 'review-loop', 'config.json'));
});
test('canonical local configuration takes precedence while older configuration remains readable', t => {
  const h = sandbox(t), root = join(h.root, 'config');
  const old = join(root, 'review-loop-v2'), current = join(root, 'review-loop');
  mkdirSync(old, { recursive: true });
  writeFileSync(join(old, 'config.json'), '{"defaultAccount":"work"}');
  const env = { XDG_CONFIG_HOME: root };
  assert.equal(defaultAccount(env), 'work');
  mkdirSync(current);
  writeFileSync(join(current, 'config.json'), '{"defaultAccount":"personal"}');
  assert.equal(defaultAccount(env), 'personal');
});
test('model and reasoning defaults inherit Codex configuration; overrides are validated as data', t => {
  const h = sandbox(t);
  assert.deepEqual(reviewerSettings({}, h.env), { model: null, reasoningEffort: null });
  assert.deepEqual(modelConfigArgs(reviewerSettings({}, h.env)), []);
  writeFileSync(h.env.REVIEW_LOOP_CONFIG, '{"model":"config-model","reasoningEffort":"high"}');
  assert.deepEqual(reviewerSettings({}, h.env), { model: 'config-model', reasoningEffort: 'high' });
  const env = { ...h.env, REVIEW_LOOP_MODEL: 'env-model', REVIEW_LOOP_REASONING_EFFORT: 'medium' };
  assert.equal(reviewerSettings({}, env).model, 'env-model');
  assert.equal(reviewerSettings({ model: 'cli-model' }, env).model, 'cli-model');
  assert.throws(() => reviewerSettings({ model: 'bad";command' }, env), /model ID/);
  assert.throws(() => reviewerSettings({ reasoningEffort: 'invalid' }, env), /Reasoning/);
});
test('arbitrary named profiles keep the original isolated storage layout', t => {
  const h = sandbox(t);
  assert.equal(prepareAccountHome('team-2', h.env), join(h.env.REVIEW_LOOP_ACCOUNTS_DIR, 'team-2'));
  assert.throws(() => accountHome('Uppercase', h.env), /Choose/);
  assert.throws(() => accountHome('a'.repeat(65), h.env), /Choose/);
});
test('invalid labels, overlapping main homes and linked credential files are rejected', t => {
  const h = sandbox(t);
  assert.throws(() => accountHome('../main', h.env), /Choose/);
  assert.throws(() => prepareAccountHome('personal', { ...h.env, REVIEW_LOOP_ACCOUNTS_DIR: join(h.main, 'accounts') }), /separate/);
  const home = prepareAccountHome('personal', h.env);
  symlinkSync(join(h.main, 'missing-auth.json'), join(home, 'auth.json'));
  assert.throws(() => prepareAccountHome('personal', h.env), /private regular/);
  rmSync(join(home, 'auth.json'));
  linkSync(join(h.main, 'auth.json'), join(home, 'auth.json'));
  assert.throws(() => accountHome('personal', h.env), /private regular/);
});
test('new reviews use current Codex configuration without isolated profiles or auth overrides', t => {
  const h = fixture(t);
  const dry = h.call(['--dry-run']);
  assert.equal(dry.reviewer_account, 'current');
  assert.equal(dry.codex_home, accountHome('current', h.env));
  assert.ok(!dry.command.some(arg => arg.includes('forced_login_method') || arg.includes('cli_auth_credentials_store') || arg.includes('model_provider')));
  assert.ok(!dry.command.some(arg => /^(model|review_model|model_reasoning_effort)=/.test(arg)));
  assert.equal(h.invocations().length, 0);
  const personal = h.call(['--account', 'personal', '--dry-run']);
  assert.equal(personal.reviewer_account, 'personal');
  assert.equal(personal.codex_home, accountHome('personal', h.env));
  assert.equal(h.invocations().length, 0);
  h.call(['--account', '../other'], false);
  h.call(['--account', 'personal', '--account', 'work'], false);
  const result = h.call();
  assert.equal(result.status, 'review_ready');
  assert.equal(result.reviewer_account, 'current');
  assert.ok(h.invocations().every(c => c.home === h.main && c.authEnv.length === 3));
  h.complete();
  // Unknown native/keychain identity must not certify a later review by cache.
  const next = h.call();
  assert.equal(next.status, 'review_ready');
  assert.equal(next.review_scope, 'full');
  assert.equal(h.invocations().length, 4);
  assert.equal(readFileSync(join(h.main, 'auth.json'), 'utf8'), 'MAIN_AUTH_SENTINEL');
  assert.equal(readFileSync(join(h.main, 'config.toml'), 'utf8'), '# MAIN_CONFIG_SENTINEL');
});
test('a local default profile works without hardcoded account names and fails closed when missing', t => {
  const h = fixture(t); rmSync(join(accountHome('work', h.env), 'auth.json'));
  writeFileSync(h.env.REVIEW_LOOP_CONFIG, '{"defaultAccount":"work"}');
  assert.match(h.call([], false).stderr, /No isolated work login/);
  assert.equal(h.invocations().length, 0);
  assert.equal(h.call(['--account', 'personal']).reviewer_account, 'personal');
  assert.equal(readFileSync(join(h.main, 'auth.json'), 'utf8'), 'MAIN_AUTH_SENTINEL');
});
test('missing named login fails closed and never falls back to main credentials', t => {
  const h = fixture(t); rmSync(join(accountHome('personal', h.env), 'auth.json'));
  assert.match(h.call(['--account', 'personal'], false).stderr, /No isolated personal login/);
  assert.equal(h.invocations().length, 0);
  assert.equal(readFileSync(join(h.main, 'auth.json'), 'utf8'), 'MAIN_AUTH_SENTINEL');
});
test('named review uses isolated file auth, records identity, and inherits account for transitions', t => {
  const h = fixture(t); const result = h.call(['--account', 'personal']);
  assert.equal(result.status, 'review_ready');
  const state = h.state(); const identity = accountIdentity('personal', h.env);
  assert.equal(state.reviewer_identity, identity.identity_sha256);
  assert.equal(state.reviewer_codex_home, identity.codex_home);
  assert.match(readFileSync(join(h.repo, state.report), 'utf8'), /"reviewer_account": "personal"/);
  const calls = h.invocations(); assert.equal(calls.length, 2);
  assert.ok(calls.every(c => c.home === identity.codex_home && c.authEnv.length === 0));
  for (const c of calls) assert.ok(c.args.includes('cli_auth_credentials_store="file"') && c.args.includes('forced_login_method="chatgpt"'));
  assert.match(h.call(['--account', 'work', '--mark-complete'], false).stderr, /pinned to account personal/);
  assert.deepEqual(h.state(), state);
  assert.equal(h.complete().reviewer_account, 'personal');
  assert.equal(h.call(['--account', 'personal']).status, 'already_complete');
  assert.equal(h.invocations().length, 2);
});
test('a new bare invocation after personal completion selects the local default, including for changed code', t => {
  for (const changed of [false, true]) {
    const h = fixture(t); h.call(['--account', 'personal']); h.complete();
    writeFileSync(h.env.REVIEW_LOOP_CONFIG, '{"defaultAccount":"work"}');
    if (changed) writeFileSync(join(h.repo, 'app.txt'), 'new proposal\n');
    const next = h.call();
    assert.equal(next.status, 'review_ready');
    assert.equal(next.reviewer_account, 'work');
    assert.equal(next.pass, 1);
    assert.equal(h.state().baseline_checkpoint, null);
    assert.ok(h.invocations().slice(2).every(c => c.home === accountHome('work', h.env)));
  }
});
test('a personal rereview without an account keeps its pin instead of selecting the default', t => {
  const h = fixture(t); h.call(['--account', 'personal']);
  writeFileSync(h.env.REVIEW_LOOP_CONFIG, '{"defaultAccount":"work"}');
  writeFileSync(join(h.loop, 'assessment.json'), JSON.stringify({ findings: [{ id: 'case', priority: 'P2', action: 'fix', evidence: 'Fixture defect', checks: [{ id: 'repro', result: 'fail', evidence: 'Fixture reproduction fails' }] }] }));
  h.call(['--assess', '.review-loop-v2/assessment.json']);
  writeFileSync(join(h.repo, 'app.txt'), 'corrected proposal\n');
  writeFileSync(join(h.loop, 'resolution.md'), 'READY_FOR_REREVIEW\n');
  h.call(['--resolve', '.review-loop-v2/resolution.md', '--status', 'ready_for_rereview']);
  const next = h.call();
  assert.equal(next.pass, 2);
  assert.equal(next.reviewer_account, 'personal');
  assert.ok(h.invocations().every(c => c.home === accountHome('personal', h.env)));
});
test('explicit current overrides a local profile and stays pinned when the local setting changes', t => {
  const h = fixture(t);
  writeFileSync(h.env.REVIEW_LOOP_CONFIG, '{"defaultAccount":"work"}');
  assert.equal(h.call(['--account', 'current']).reviewer_account, 'current');
  assert.match(h.call(['--account', 'personal'], false).stderr, /pinned to account current/);
  writeFileSync(h.env.REVIEW_LOOP_CONFIG, '{"defaultAccount":"personal"}');
  assert.equal(h.call().reviewer_account, 'current');
  assert.equal(h.invocations().length, 2);
  h.complete();
  assert.equal(h.call().reviewer_account, 'personal');
});
test('environment default overrides local config while an explicit option overrides both', t => {
  const h = fixture(t);
  writeFileSync(h.env.REVIEW_LOOP_CONFIG, '{"defaultAccount":"work"}');
  h.env.REVIEW_LOOP_ACCOUNT = 'personal';
  assert.equal(h.call(['--dry-run']).reviewer_account, 'personal');
  assert.equal(h.call(['--account', 'work', '--dry-run']).reviewer_account, 'work');
});
test('explicit reviewer settings reach Codex and stay pinned until the cycle completes', t => {
  const h = fixture(t);
  h.call(['--account', 'personal', '--model', 'test-model', '--reasoning', 'high']);
  const state = h.state();
  assert.deepEqual(state.reviewer_settings, { model: 'test-model', reasoningEffort: 'high' });
  const args = h.invocations().find(c => c.args.includes('review')).args;
  for (const value of ['model="test-model"', 'review_model="test-model"', 'model_reasoning_effort="high"']) assert.ok(args.includes(value));
  assert.match(h.call(['--model', 'other-model'], false).stderr, /reviewer settings are pinned/);
  writeFileSync(h.env.REVIEW_LOOP_CONFIG, '{"model":"other-model","reasoningEffort":"low"}');
  h.complete();
  const next = h.call(['--account', 'personal']);
  assert.equal(next.status, 'review_ready');
  assert.equal(h.state().baseline_checkpoint, null);
  assert.deepEqual(h.state().reviewer_settings, { model: 'other-model', reasoningEffort: 'low' });
});
test('invalid reviewer options stop before invoking Codex', t => {
  const h = fixture(t);
  h.call(['--model', 'bad";command'], false);
  h.call(['--reasoning', 'invalid'], false);
  h.call(['--model', 'first', '--model', 'second'], false);
  assert.equal(h.invocations().length, 0);
});
test('an active pre-promotion cycle keeps its historical reviewer model', t => {
  const h = fixture(t);
  h.call(['--account', 'personal', '--model', 'gpt-6-sol', '--reasoning', 'xhigh']);
  writeFileSync(join(h.loop, 'assessment.json'), JSON.stringify({ findings: [{ id: 'legacy-model', priority: 'P2', action: 'fix', evidence: 'Fixture defect', checks: [{ id: 'case', result: 'fail', evidence: 'Reproduction fails' }] }] }));
  h.call(['--assess', '.review-loop-v2/assessment.json']);
  writeFileSync(join(h.repo, 'app.txt'), 'corrected proposal\n');
  writeFileSync(join(h.loop, 'resolution.md'), 'READY_FOR_REREVIEW\n');
  h.call(['--resolve', '.review-loop-v2/resolution.md', '--status', 'ready_for_rereview']);
  const state = h.state(); delete state.reviewer_settings;
  writeFileSync(join(h.loop, 'state.json'), JSON.stringify(state));
  writeFileSync(h.env.REVIEW_LOOP_CONFIG, '{"model":"new-default","reasoningEffort":"low"}');
  const next = h.call();
  assert.equal(next.pass, 2);
  assert.deepEqual(next.reviewer_settings, { model: 'gpt-6-sol', reasoningEffort: 'xhigh' });
});
test('another account starts a fresh review and cannot borrow the completed checkpoint', t => {
  const h = fixture(t); h.call(['--account', 'personal']); h.complete();
  const next = h.call(['--account', 'work']);
  assert.equal(next.status, 'review_ready'); assert.equal(next.reviewer_account, 'work'); assert.equal(next.pass, 1);
  assert.equal(h.invocations().filter(c => c.args.includes('review')).length, 2);
  assert.equal(h.state().baseline_checkpoint, null);
  assert.ok(existsSync(join(h.loop, 'archive')));
});
test('relogin as another identity cannot change an active cycle or reuse its completed review', t => {
  const h = fixture(t); h.call(['--account', 'personal']);
  const before = h.state();
  credential('personal', h.env, 'someone-else', 'another-workspace');
  assert.match(h.call([], false).stderr, /signed-in account\/workspace changed/);
  assert.deepEqual(h.state(), before);
  credential('personal', h.env); h.complete();
  credential('personal', h.env, 'someone-else', 'another-workspace');
  assert.equal(h.call(['--account', 'personal']).status, 'review_ready');
  assert.equal(h.invocations().filter(c => c.args.includes('review')).length, 2);
});
test('saved reports remain processable while signed out, but another review requires named login', t => {
  const h = fixture(t); h.call(['--account', 'personal']);
  rmSync(join(accountHome('personal', h.env), 'auth.json'));
  writeFileSync(join(h.loop, 'assessment.json'), '{"findings":[]}');
  assert.equal(h.call(['--assess', '.review-loop-v2/assessment.json']).status, 'assessment_ready');
  assert.equal(h.invocations().length, 2);
});
test('account store changes are rejected for active cycles', t => {
  const h = fixture(t); h.call(['--account', 'personal']);
  h.env.REVIEW_LOOP_ACCOUNTS_DIR = join(h.root, 'different-store');
  credential('personal', h.env);
  assert.match(h.call([], false).stderr, /account store changed/);
});
test('login manager reports named identity without exposing credential contents', t => {
  const h = fixture(t);
  const p = spawnSync(process.execPath, [manager, 'status', 'work'], { cwd: h.root, env: h.env, encoding: 'utf8' });
  assert.equal(p.status, 0, p.stderr);
  const output = JSON.parse(p.stdout.trim().slice('REVIEW_ACCOUNT '.length));
  assert.equal(output.account, 'work'); assert.equal(output.email, 'work@example.invalid');
  assert.ok(!p.stdout.includes('id_token') && !p.stdout.includes('.unsigned'));
  assert.equal(readFileSync(join(h.main, 'auth.json'), 'utf8'), 'MAIN_AUTH_SENTINEL');
});

test('legacy incremental continuation upgrades coverage without resetting convergence or pass budget', t => {
  const h = fixture(t); h.call(['--account', 'personal']); h.complete();
  writeFileSync(join(h.repo, 'app.txt'), 'next proposal\n');
  h.call(['--account', 'personal', '--scope', 'uncommitted', '--max-passes', '5']);
  const finding = { id: 'legacy-issue', priority: 'P2', action: 'fix', evidence: 'Fixture observation', checks: [{ id: 'case', result: 'fail', evidence: 'Fixture case fails' }] };
  writeFileSync(join(h.loop, 'assessment.json'), JSON.stringify({ findings: [finding] }));
  h.call(['--assess', '.review-loop-v2/assessment.json']);
  writeFileSync(join(h.repo, 'app.txt'), 'attempted correction\n');
  writeFileSync(join(h.loop, 'resolution.md'), 'READY_FOR_REREVIEW\n');
  h.call(['--resolve', '.review-loop-v2/resolution.md', '--status', 'ready_for_rereview']);
  function legacy(value) {
    if (Array.isArray(value)) return value.map(legacy);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).filter(([k]) => !k.startsWith('reviewer_')).map(([k,v]) => [k,legacy(v)]));
  }
  const before = legacy(h.state());
  writeFileSync(join(h.loop, 'state.json'), JSON.stringify(before));
  const cp = join(h.loop, 'checkpoint.json'); writeFileSync(cp, JSON.stringify(legacy(JSON.parse(readFileSync(cp)))));
  const result = h.call(['--account', 'personal']);
  assert.equal(result.pass, 2); assert.equal(result.review_scope, 'full');
  assert.match(result.scope_reason, /first named-account continuation/);
  const after = h.state();
  assert.equal(after.pass_budget, 5); assert.equal(after.baseline_checkpoint, null);
  assert.deepEqual(after.convergence, before.convergence);
  assert.deepEqual(after.history.slice(0, -1), before.history);
  writeFileSync(join(h.loop, 'assessment.json'), JSON.stringify({ findings: [finding] }));
  assert.equal(h.call(['--assess', '.review-loop-v2/assessment.json']).status, 'convergence_blocked');
});
test('a legacy reused report is not relabeled with a prospective new account', t => {
  const h = fixture(t); h.call(['--account', 'personal']);
  const state = h.state();
  for (const k of ['reviewer_account','reviewer_identity','reviewer_codex_home']) delete state[k];
  writeFileSync(join(h.loop, 'state.json'), JSON.stringify(state));
  const reused = h.call(['--account', 'work']);
  assert.equal(reused.status, 'review_ready'); assert.equal(reused.reused, true); assert.equal(reused.reviewer_account, null);
  assert.equal(h.invocations().length, 2);
});
test('a login identity changed during review cannot produce an accepted report', t => {
  const h = fixture(t);
  const change = `\nif(process.argv.includes('review')) { const p=process.env.CODEX_HOME+'/auth.json'; const a=JSON.parse(fs.readFileSync(p));a.tokens.account_id='changed-during-review';fs.writeFileSync(p,JSON.stringify(a)); }\n`;
  writeFileSync(h.fake, readFileSync(h.fake, 'utf8') + change, { mode: 0o755 });
  assert.match(h.call(['--account', 'personal'], false).stderr, /login changed while Codex was reviewing/);
  assert.equal(existsSync(join(h.loop, 'pass-01-codex.md')), false);
  assert.equal(existsSync(join(h.loop, 'state.json')), false);
  assert.equal(readFileSync(join(h.main, 'auth.json'), 'utf8'), 'MAIN_AUTH_SENTINEL');
});
