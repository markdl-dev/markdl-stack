#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const AUTH_CONFIG_ARGS = ['-c', 'cli_auth_credentials_store="file"', '-c', 'forced_login_method="chatgpt"', '-c', 'model_provider="openai"'];
export function validateAccount(account) {
  if (typeof account !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(account)) throw new Error('Choose --account current or a profile name of up to 64 lowercase letters, digits, or hyphens, starting with a letter.');
  return account;
}
export function localConfigPath(env = process.env) {
  if (env.REVIEW_LOOP_CONFIG) return resolve(env.REVIEW_LOOP_CONFIG);
  const root = env.XDG_CONFIG_HOME || join(homedir(), '.config');
  const preferred = resolve(root, 'review-loop', 'config.json');
  const legacy = resolve(root, 'review-loop-v2', 'config.json');
  return existsSync(preferred) || !existsSync(legacy) ? preferred : legacy;
}
export function readLocalConfig(env = process.env) {
  const configPath = localConfigPath(env);
  if (!existsSync(configPath)) return {};
  let config;
  try { config = JSON.parse(readFileSync(configPath, 'utf8')); }
  catch { throw new Error(`Invalid review-loop configuration: ${configPath}`); }
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error(`Review-loop configuration must be an object: ${configPath}`);
  return config;
}
export function defaultAccount(env = process.env) {
  if (env.REVIEW_LOOP_ACCOUNT !== undefined) return validateAccount(env.REVIEW_LOOP_ACCOUNT);
  const config = readLocalConfig(env);
  return config.defaultAccount === undefined ? 'current' : validateAccount(config.defaultAccount);
}
export function validateModel(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/:+-]{0,127}$/.test(value)) throw new Error('Use a nonempty model ID, not shell syntax.');
  return value;
}
export function validateReasoning(value) {
  if (!['none', 'minimal', 'low', 'medium', 'high', 'xhigh'].includes(value)) throw new Error('Reasoning effort must be none, minimal, low, medium, high, or xhigh; support depends on the model.');
  return value;
}
export function reviewerSettings(requested = {}, env = process.env) {
  const config = readLocalConfig(env);
  const model = requested.model ?? env.REVIEW_LOOP_MODEL ?? config.model ?? null;
  const reasoningEffort = requested.reasoningEffort ?? env.REVIEW_LOOP_REASONING_EFFORT ?? config.reasoningEffort ?? null;
  return { model: model === null ? null : validateModel(model), reasoningEffort: reasoningEffort === null ? null : validateReasoning(reasoningEffort) };
}
export function modelConfigArgs(settings) {
  const args = [];
  if (settings.model !== null) {
    const model = JSON.stringify(validateModel(settings.model));
    args.push('-c', `model=${model}`, '-c', `review_model=${model}`);
  }
  if (settings.reasoningEffort !== null) args.push('-c', `model_reasoning_effort=${JSON.stringify(validateReasoning(settings.reasoningEffort))}`);
  return args;
}
export function accountConfigArgs(account) {
  validateAccount(account);
  return account === 'current' ? [] : AUTH_CONFIG_ARGS;
}
function canonical(path) {
  if (existsSync(path)) return realpathSync(path);
  const parent = dirname(path);
  if (parent === path) return path;
  return join(canonical(parent), path.slice(parent.length + (parent.endsWith(sep) ? 0 : 1)));
}
function overlaps(a, b) { return a === b || a.startsWith(b.endsWith(sep) ? b : b + sep) || b.startsWith(a.endsWith(sep) ? a : a + sep); }
function entry(path) {
  try { return lstatSync(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
export function accountHome(account, env = process.env) {
  validateAccount(account);
  if (account === 'current') return canonical(resolve(env.CODEX_HOME || join(homedir(), '.codex')));
  const root = resolve(env.REVIEW_LOOP_ACCOUNTS_DIR || join(homedir(), '.local', 'share', 'review-loop-v2', 'codex-accounts'));
  const home = join(root, account);
  const main = canonical(resolve(env.CODEX_HOME || join(homedir(), '.codex')));
  if (overlaps(canonical(home), main) || overlaps(canonical(root), main)) throw new Error('Account stores must be separate from the main CODEX_HOME.');
  const homeEntry = entry(home);
  if (homeEntry && (!homeEntry.isDirectory() || homeEntry.isSymbolicLink())) throw new Error('The account home must be a real directory, not a symlink.');
  for (const name of ['auth.json', 'config.toml']) {
    const path = join(home, name);
    const info = entry(path);
    if (info && (info.isSymbolicLink() || !info.isFile() || info.nlink > 1)) throw new Error(`Use a private regular ${name} in the selected account home.`);
  }
  return home;
}
export function accountEnvironment(account, env = process.env) {
  validateAccount(account);
  if (account === 'current') return { ...env };
  const child = { ...env, CODEX_HOME: accountHome(account, env) };
  for (const name of ['OPENAI_API_KEY', 'CODEX_API_KEY', 'CODEX_ACCESS_TOKEN']) delete child[name];
  return child;
}
export function prepareAccountHome(account, env = process.env) {
  if (validateAccount(account) === 'current') throw new Error('Use codex login to manage the current login; this helper creates named isolated profiles only.');
  const home = accountHome(account, env);
  mkdirSync(home, { recursive: true, mode: 0o700 });
  const config = join(home, 'config.toml');
  if (!existsSync(config)) writeFileSync(config, 'cli_auth_credentials_store = "file"\nforced_login_method = "chatgpt"\n', { flag: 'wx', mode: 0o600 });
  return home;
}
export function accountIdentity(account, env = process.env) {
  const home = accountHome(account, env);
  if (account === 'current') return { account, codex_home: home, identity_sha256: null, email: null };
  if (!existsSync(join(home, 'auth.json'))) throw new Error(`No isolated ${account} login. Run review-accounts.mjs login ${account}.`);
  let auth, claims;
  try {
    auth = JSON.parse(readFileSync(join(home, 'auth.json'), 'utf8'));
    const token = auth.tokens?.id_token;
    claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  } catch { throw new Error(`Cannot identify the isolated ${account} login; run review-accounts.mjs login ${account} again.`); }
  const accountId = auth.tokens?.account_id || claims['https://api.openai.com/auth']?.chatgpt_account_id;
  if (typeof accountId !== 'string' || !accountId || typeof claims.sub !== 'string' || !claims.sub) throw new Error(`The ${account} store needs a ChatGPT account login.`);
  return { account, codex_home: home, identity_sha256: createHash('sha256').update(JSON.stringify([accountId, claims.sub])).digest('hex'), email: typeof claims.email === 'string' ? claims.email : null };
}
export function requireAccountLogin(account, codexBin = 'codex', env = process.env) {
  const identity = accountIdentity(account, env);
  const status = spawnSync(codexBin, [...accountConfigArgs(account), 'login', 'status'], { env: accountEnvironment(account, env), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const loggedIn = account === 'current' ? /Logged in/i : /Logged in using ChatGPT/i;
  if (status.status !== 0 || !loggedIn.test(`${status.stdout || ''}\n${status.stderr || ''}`)) throw new Error(account === 'current'
    ? 'The current Codex login is unavailable. Run codex login, or choose a configured named profile.'
    : `The isolated ${account} ChatGPT login is unavailable. Run review-accounts.mjs login ${account}.`);
  return identity;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [action, account, ...extra] = process.argv.slice(2);
    if (!['login', 'status'].includes(action) || extra.some(x => x !== '--device-auth') || extra.length > 1 || (action !== 'login' && extra.length)) throw new Error('Usage: node review-accounts.mjs login <profile> [--device-auth] | status <profile|current>');
    validateAccount(account);
    const codex = process.env.REVIEW_LOOP_CODEX_BIN || 'codex';
    if (action === 'login') {
      const home = prepareAccountHome(account);
      process.stderr.write(`Sign in to the ${account} account/workspace. Only ${home} will receive these credentials.\n`);
      const login = spawnSync(codex, [...AUTH_CONFIG_ARGS, 'login', ...extra], { env: accountEnvironment(account), stdio: 'inherit' });
      if (login.status !== 0) throw new Error(`The isolated ${account} login did not complete.`);
    }
    const identity = requireAccountLogin(account, codex);
    process.stdout.write(`REVIEW_ACCOUNT ${JSON.stringify({ ...identity, logged_in: true })}\n`);
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
