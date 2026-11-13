#!/usr/bin/env node

import { assess, finish, resume, stopResult } from "./convergence.mjs";
import { validateAccount, defaultAccount, accountHome, accountIdentity, accountEnvironment, requireAccountLogin, accountConfigArgs, validateModel, validateReasoning, reviewerSettings, modelConfigArgs } from "./review-accounts.mjs";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

const VALID_SCOPES = new Set(["auto", "full", "uncommitted", "since-last"]);
const ACTIVE_STATUSES = new Set([
  "review_ready",
  "ready_for_rereview",
  "pass_candidate",
  "blocked",
  "convergence_blocked",
]);

const args = process.argv.slice(2);
let requestedBase = null;
let requestedScope = "auto";
let finalReview = false;
let markComplete = false;
let dryRun = false;
let assessInput = null;
let resolutionInput = null;
let resolutionStatus = null;
let decisionInput = null;
let requestedMax = null;
let requestedAccount = null;
const requestedSettings = {};
let selectedSettings;
let reviewerAccount = null;
let reviewerHome = null;
let currentIdentity = null;
let codexBin = process.env.REVIEW_LOOP_CODEX_BIN || "codex";

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function nextValue(option, index) {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    fail(`Missing value for ${option}`, 2);
  }
  return value;
}

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--base") {
    requestedBase = nextValue(arg, index);
    index += 1;
  } else if (arg === "--scope") {
    requestedScope = nextValue(arg, index);
    index += 1;
  } else if (arg === "--final") {
    finalReview = true;
  } else if (arg === "--mark-complete") {
    markComplete = true;
  } else if (["--assess", "--resolve", "--status", "--resume", "--max-passes"].includes(arg)) {
    const value = nextValue(arg, index++);
    if (arg === "--assess") assessInput = value;
    if (arg === "--resolve") resolutionInput = value;
    if (arg === "--status") resolutionStatus = value;
    if (arg === "--resume") decisionInput = value;
    if (arg === "--max-passes") {
      requestedMax = Number(value);
      if (!Number.isSafeInteger(requestedMax) || requestedMax < 1) fail("--max-passes must be a positive safe integer.", 2);
    }
  } else if (arg === "--dry-run") {
    dryRun = true;
  } else if (arg === "--codex-bin") {
    codexBin = nextValue(arg, index);
    index += 1;
  } else if (arg === "--model" || arg === "--reasoning") {
    const key = arg === "--model" ? "model" : "reasoningEffort";
    if (Object.hasOwn(requestedSettings, key)) fail(`Supply ${arg} only once.`, 2);
    try { requestedSettings[key] = arg === "--model" ? validateModel(nextValue(arg, index++)) : validateReasoning(nextValue(arg, index++)); }
    catch (error) { fail(error.message, 2); }
  } else if (arg === "--account") {
    const value = nextValue(arg, index++);
    if (requestedAccount) fail("Supply --account only once.", 2);
    try { requestedAccount = validateAccount(value); }
    catch (error) { fail(error.message, 2); }
  } else if (!arg.startsWith("-") && requestedBase === null) {
    requestedBase = arg;
  } else {
    fail(`Unknown or incomplete argument: ${arg}`, 2);
  }
}

if (!VALID_SCOPES.has(requestedScope)) {
  fail(
    `Invalid review scope: ${requestedScope}. Use auto, full, uncommitted, or since-last.`,
    2,
  );
}

if (finalReview && requestedScope !== "auto" && requestedScope !== "full") {
  fail("--final conflicts with a non-full --scope value.", 2);
}
if (finalReview) requestedScope = "full";

if (markComplete && (dryRun || finalReview || requestedScope !== "auto")) {
  fail("--mark-complete cannot be combined with --dry-run, --final, or --scope.", 2);
}

if ([assessInput, resolutionInput, decisionInput, markComplete, dryRun].filter(Boolean).length > 1) fail("Choose one runner action.", 2);
if (Boolean(resolutionInput) !== Boolean(resolutionStatus)) fail("--resolve and --status are required together.", 2);

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd,
    encoding: Object.prototype.hasOwnProperty.call(options, "encoding")
      ? options.encoding
      : "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
  });
  return result;
}

function outputText(value) {
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return value ?? "";
}

function git(commandArgs, options = {}) {
  const result = run("git", commandArgs, options);
  if (!options.allowFailure && result.status !== 0) {
    fail(
      `git ${commandArgs.join(" ")} failed:\n${
        outputText(result.stderr) || outputText(result.stdout)
      }`,
      3,
    );
  }
  return result;
}

const rootResult = git(["rev-parse", "--show-toplevel"], { allowFailure: true });
if (rootResult.status !== 0) {
  fail("review-loop must run inside a Git repository.", 3);
}

const repoRoot = outputText(rootResult.stdout).trim();
process.chdir(repoRoot);

function validateBase(value) {
  if (
    !value ||
    value.startsWith("-") ||
    value.includes("..") ||
    value.includes("@{") ||
    !/^[A-Za-z0-9._/-]+$/.test(value)
  ) {
    fail(`Unsafe or invalid base branch: ${value ?? "<empty>"}`, 2);
  }
  const verify = git(["rev-parse", "--verify", `${value}^{commit}`], {
    allowFailure: true,
  });
  if (verify.status !== 0) {
    fail(`Base branch does not resolve to a commit: ${value}`, 3);
  }
  return value;
}

function detectBase() {
  if (requestedBase) {
    return validateBase(requestedBase);
  }

  const originHead = git(
    ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"],
    { allowFailure: true },
  );
  if (originHead.status === 0 && outputText(originHead.stdout).trim()) {
    return validateBase(outputText(originHead.stdout).trim());
  }

  for (const candidate of ["main", "master"]) {
    const verify = git(["rev-parse", "--verify", `${candidate}^{commit}`], {
      allowFailure: true,
    });
    if (verify.status === 0) {
      return candidate;
    }
  }

  fail("Could not detect a base branch. Pass one with --base <branch>.", 3);
}

const base = detectBase();
const branch = outputText(
  git(["rev-parse", "--abbrev-ref", "HEAD"]).stdout,
).trim();
const head = outputText(git(["rev-parse", "HEAD"]).stdout).trim();
const baseSha = outputText(git(["rev-parse", base]).stdout).trim();
const mergeBase = outputText(git(["merge-base", base, "HEAD"]).stdout).trim();
const loopDir = join(repoRoot, ".review-loop-v2");
mkdirSync(loopDir, { recursive: true });

function ensureLocalIgnore() {
  const tracked = git(["ls-files", "--", ".review-loop-v2"], {
    allowFailure: true,
  });
  if (outputText(tracked.stdout).trim()) {
    fail(
      ".review-loop-v2 contains tracked files. Keep review artifacts local and remove them from the index before continuing.",
      4,
    );
  }

  const excludeResult = git(["rev-parse", "--git-path", "info/exclude"]);
  const excludeValue = outputText(excludeResult.stdout).trim();
  const excludePath = isAbsolute(excludeValue)
    ? excludeValue
    : resolve(repoRoot, excludeValue);
  mkdirSync(dirname(excludePath), { recursive: true });
  const current = existsSync(excludePath)
    ? readFileSync(excludePath, "utf8")
    : "";
  const ignored = current
    .split(/\r?\n/)
    .some((line) => line.trim() === ".review-loop-v2/");
  if (!ignored) {
    const prefix = current.length > 0 && !current.endsWith("\n") ? "\n" : "";
    appendFileSync(excludePath, `${prefix}.review-loop-v2/\n`, "utf8");
  }
}

ensureLocalIgnore();

function diffExists(diffArgs) {
  const result = git(["diff", "--quiet", ...diffArgs], {
    allowFailure: true,
  });
  if (result.status === 0) return false;
  if (result.status === 1) return true;
  fail(
    `Unable to inspect Git diff: ${
      outputText(result.stderr) || outputText(result.stdout)
    }`,
    3,
  );
}

const hasCommitted = diffExists([`${base}...HEAD`]);
const hasUncommitted = diffExists([]) || diffExists(["--cached"]) || untrackedPaths().length > 0;


const sourceState = hasCommitted
  ? hasUncommitted
    ? "mixed"
    : "committed"
  : "uncommitted";

function nulList(value) {
  return outputText(value)
    .split("\0")
    .filter(Boolean);
}

function untrackedPaths() {
  return nulList(
    git(["ls-files", "--others", "--exclude-standard", "-z"]).stdout,
  ).filter(path => ![".review-loop", ".review-loop-v2"].some(dir => path === dir || path.startsWith(`${dir}/`))).sort();
}

function computeStateFingerprint() {
  const hash = createHash("sha256");
  hash.update(
    [
      `base:${base}`,
      `base_sha:${baseSha}`,
      `merge_base:${mergeBase}`,
      `branch:${branch}`,
      `head:${head}`,
      `scope:${sourceState}`,
      "",
    ].join("\n"),
  );

  for (const diffArgs of [
    ["diff", "--binary", `${base}...HEAD`],
    ["diff", "--binary"],
    ["diff", "--cached", "--binary"],
  ]) {
    hash.update(outputText(git(diffArgs).stdout));
  }

  for (const relativePath of untrackedPaths()) {
    const absolutePath = resolve(repoRoot, relativePath);
    hash.update(`untracked:${relativePath}\0`);
    if (!existsSync(absolutePath)) continue;
    const stats = lstatSync(absolutePath);
    if (stats.isSymbolicLink()) {
      hash.update(`symlink:${readlinkSync(absolutePath)}\0`);
    } else if (statSync(absolutePath).isFile()) {
      hash.update(readFileSync(absolutePath));
    }
  }

  return hash.digest("hex");
}

function hashSnapshotEntry(hash, relativePath, mode, content) {
  hash.update(`path:${relativePath}\0mode:${mode}\0`);
  hash.update(content);
  hash.update("\0");
}

function changedWorkingPaths() {
  const paths = new Set(
    nulList(git(["diff", "--name-only", "-z", mergeBase]).stdout),
  );
  for (const relativePath of untrackedPaths()) paths.add(relativePath);
  return [...paths].sort();
}

function workingEntry(relativePath) {
  const absolutePath = resolve(repoRoot, relativePath);
  if (!existsSync(absolutePath)) {
    return { mode: "deleted", content: Buffer.alloc(0) };
  }

  const stats = lstatSync(absolutePath);
  if (stats.isSymbolicLink()) {
    return {
      mode: "120000",
      content: Buffer.from(readlinkSync(absolutePath), "utf8"),
    };
  }
  if (stats.isFile()) {
    return {
      mode: stats.mode & 0o111 ? "100755" : "100644",
      content: readFileSync(absolutePath),
    };
  }

  const fallback = git(
    ["diff", "--binary", mergeBase, "--", relativePath],
    { encoding: null },
  );
  return {
    mode: stats.isDirectory() ? "040000" : "special",
    content: fallback.stdout ?? Buffer.alloc(0),
  };
}

function headEntry(relativePath) {
  const treeResult = git(["ls-tree", "-z", "HEAD", "--", relativePath], {
    allowFailure: true,
  });
  const record = outputText(treeResult.stdout).split("\0")[0];
  if (!record) {
    return { mode: "deleted", content: Buffer.alloc(0) };
  }

  const tabIndex = record.indexOf("\t");
  const metadata = tabIndex >= 0 ? record.slice(0, tabIndex) : record;
  const [mode, , objectId] = metadata.split(/\s+/);
  if (!mode || !objectId) {
    fail(`Unable to inspect HEAD snapshot entry: ${relativePath}`, 3);
  }

  const object = git(["cat-file", "-p", objectId], { encoding: null });
  return {
    mode,
    content: object.stdout ?? Buffer.alloc(0),
  };
}

function computeContentFingerprint(target) {
  const hash = createHash("sha256");
  hash.update(
    `snapshot:v1\nbase:${base}\nbase_sha:${baseSha}\nmerge_base:${mergeBase}\n`,
  );

  const paths =
    target === "HEAD"
      ? nulList(
          git(["diff", "--name-only", "-z", mergeBase, "HEAD"]).stdout,
        ).sort()
      : changedWorkingPaths();

  for (const relativePath of paths) {
    const entry =
      target === "HEAD"
        ? headEntry(relativePath)
        : workingEntry(relativePath);
    hashSnapshotEntry(hash, relativePath, entry.mode, entry.content);
  }
  return hash.digest("hex");
}

const fingerprint = computeStateFingerprint();
const contentFingerprint = computeContentFingerprint("WORKTREE");
const headContentFingerprint = computeContentFingerprint("HEAD");
const statePath = join(loopDir, "state.json");
const checkpointPath = join(loopDir, "checkpoint.json");

function readJson(path, label) {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`Invalid ${label}: ${error.message}`, 5);
  }
}

function writeJson(path, value) {
  const temporaryPath = `${path}.tmp-${process.pid}`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporaryPath, path);
}

let state = readJson(statePath, ".review-loop-v2/state.json");
let checkpoint = readJson(
  checkpointPath,
  ".review-loop-v2/checkpoint.json",
);

const sameAccountContext = state.branch === branch && state.base === base && state.base_sha === baseSha && state.merge_base === mergeBase;
const pinnedAccount = sameAccountContext && ACTIVE_STATUSES.has(state.status) ? state.reviewer_account ?? null : null;
if (sameAccountContext && ACTIVE_STATUSES.has(state.status) && pinnedAccount && requestedAccount && requestedAccount !== pinnedAccount) {
  fail(`The active review cycle is pinned to account ${pinnedAccount}; finish it before choosing ${requestedAccount}.`, 6);
}
try { reviewerAccount = requestedAccount ?? pinnedAccount ?? defaultAccount(); }
catch (error) { fail(error.message, 2); }
const activeSettings = sameAccountContext && ACTIVE_STATUSES.has(state.status)
  ? state.reviewer_settings ?? (state.reviewer_account ? { model: "gpt-6-sol", reasoningEffort: "xhigh" } : null)
  : null;
if (activeSettings) {
  for (const key of Object.keys(requestedSettings)) if (requestedSettings[key] !== activeSettings[key]) fail("The active cycle's reviewer settings are pinned; finish it before changing model or reasoning.", 6);
  selectedSettings = activeSettings;
} else {
  try { selectedSettings = reviewerSettings(requestedSettings); }
  catch (error) { fail(error.message, 2); }
}
function settingsMatch(saved) {
  return saved?.model === selectedSettings.model && saved?.reasoningEffort === selectedSettings.reasoningEffort;
}
if (reviewerAccount) {
  try { reviewerHome = accountHome(reviewerAccount); }
  catch (error) { fail(error.message, 6); }
  if (sameAccountContext && ACTIVE_STATUSES.has(state.status) && state.reviewer_codex_home && state.reviewer_codex_home !== reviewerHome) fail("The active review cycle's account store changed.", 6);
  try { currentIdentity = accountIdentity(reviewerAccount); } catch { /* Saved reports can be processed while signed out. Fresh reviews require login below. */ }
  if (sameAccountContext && ACTIVE_STATUSES.has(state.status) && state.reviewer_identity && currentIdentity && state.reviewer_identity !== currentIdentity.identity_sha256) fail("The active review cycle's signed-in account/workspace changed; restore its original login.", 6);
}

function normalizeReviewScope(reviewState) {
  if (
    typeof reviewState.review_scope === "string" &&
    VALID_SCOPES.has(reviewState.review_scope) &&
    reviewState.review_scope !== "auto"
  ) {
    return reviewState.review_scope;
  }

  if (
    Number(reviewState.version) >= 2 &&
    typeof reviewState.scope === "string" &&
    VALID_SCOPES.has(reviewState.scope) &&
    reviewState.scope !== "auto"
  ) {
    return reviewState.scope;
  }

  if (["committed", "uncommitted", "mixed"].includes(reviewState.scope)) {
    // Version 1 always reviewed the complete proposed change for its Git state.
    return "full";
  }

  return null;
}

function normalizeSourceState(reviewState) {
  if (
    ["committed", "uncommitted", "mixed"].includes(
      reviewState.source_state,
    )
  ) {
    return reviewState.source_state;
  }
  if (
    Number(reviewState.version) < 2 &&
    ["committed", "uncommitted", "mixed"].includes(reviewState.scope)
  ) {
    return reviewState.scope;
  }
  return sourceState;
}

function checkpointSummary(entry) {
  if (!entry || typeof entry !== "object") return null;
  return {
    reviewer_settings: entry.reviewer_settings ?? null,
    reviewer_account: entry.reviewer_account ?? null,
    reviewer_identity: entry.reviewer_identity ?? null,
    reviewer_codex_home: entry.reviewer_codex_home ?? null,
    branch: entry.branch,
    base: entry.base,
    base_sha: entry.base_sha ?? null,
    merge_base: entry.merge_base ?? null,
    context_verified: entry.context_verified !== false,
    head: entry.head,
    fingerprint: entry.fingerprint ?? null,
    content_fingerprint: entry.content_fingerprint ?? null,
    review_scope: entry.review_scope,
    completion_scope: entry.completion_scope,
    cumulative_coverage: Boolean(entry.cumulative_coverage),
    completed_at: entry.completed_at ?? null,
  };
}

function checkpointEntryFromState(completedState) {
  const reviewScope = normalizeReviewScope(completedState) ?? "full";
  const legacyComplete = Number(completedState.version) < 2;
  const contextVerified = Boolean(
    completedState.base_sha && completedState.merge_base,
  );
  const completionScope =
    completedState.completion_scope ??
    (reviewScope === "full" ? "full" : "incremental");
  const sameCurrentState =
    completedState.branch === branch &&
    completedState.base === base &&
    completedState.fingerprint === fingerprint;

  return {
    reviewer_settings: completedState.reviewer_settings ?? null,
    reviewer_account: completedState.reviewer_account ?? null,
    reviewer_identity: completedState.reviewer_identity ?? null,
    reviewer_codex_home: completedState.reviewer_codex_home ?? null,
    branch: completedState.branch ?? branch,
    base: completedState.base ?? base,
    base_sha: completedState.base_sha ?? null,
    merge_base: completedState.merge_base ?? null,
    context_verified: contextVerified,
    head: completedState.head ?? head,
    fingerprint: completedState.fingerprint ?? null,
    content_fingerprint:
      completedState.content_fingerprint ??
      (sameCurrentState ? contentFingerprint : null),
    review_scope: reviewScope,
    source_state: normalizeSourceState(completedState),
    completion_scope: completionScope,
    cumulative_coverage:
      completedState.cumulative_coverage ??
      (legacyComplete || completionScope === "full"),
    completed_at:
      completedState.completed_at ??
      completedState.reviewed_at ??
      new Date().toISOString(),
    report: completedState.report ?? null,
    resolution: completedState.last_resolution ?? null,
    deferred_fingerprints: Array.isArray(
      completedState.deferred_fingerprints,
    )
      ? completedState.deferred_fingerprints
      : [],
  };
}

function writeCheckpointEntry(entry) {
  const sameContext =
    checkpoint.branch === entry.branch &&
    checkpoint.base === entry.base &&
    checkpoint.base_sha === entry.base_sha &&
    checkpoint.merge_base === entry.merge_base;
  const previousFull = sameContext ? checkpoint.last_full ?? null : null;
  checkpoint = {
    ...checkpoint,
    version: 2,
    branch: entry.branch,
    base: entry.base,
    base_sha: entry.base_sha,
    merge_base: entry.merge_base,
    last_completed: entry,
    last_full:
      entry.completion_scope === "full" ? entry : previousFull,
  };
  writeJson(checkpointPath, checkpoint);
}

function result(payload) {
  const account = payload.status === "dry_run" || payload.from_checkpoint || !state.status
    ? reviewerAccount : state.reviewer_account ?? null;
  const settings = payload.status === "dry_run" || payload.from_checkpoint || !state.status
    ? selectedSettings : state.reviewer_settings ?? null;
  process.stdout.write(`REVIEW_LOOP_RESULT ${JSON.stringify({ reviewer_account: account, reviewer_settings: settings, ...payload })}\n`);
}

function localArtifact(path) {
  const absolute = resolve(repoRoot, path);
  if (!absolute.startsWith(`${loopDir}/`) || !existsSync(absolute) || !statSync(absolute).isFile()) fail("Use a regular artifact under .review-loop-v2/.", 6);
  return path;
}
function assertContext() {
  if (state.branch !== branch || state.base !== base || state.base_sha !== baseSha || state.merge_base !== mergeBase) fail("The active branch/base changed.", 6);
}
if (decisionInput) {
  assertContext();
  try { state = resume(state, localArtifact(decisionInput)); }
  catch (error) { fail(error.message, 6); }
  state.fingerprint = fingerprint;
  writeJson(statePath, state);
  result({ status: state.status, pass: state.pass });
  process.exit(0);
}
if (state.status === "convergence_blocked") {
  result(stopResult(state));
  process.exit(0);
}
if (!hasCommitted && !hasUncommitted && !assessInput && !resolutionInput && !decisionInput) {
  fail("No committed or uncommitted changes are available for review.", 4);
}
if (assessInput) {
  assertContext();
  if (state.fingerprint !== fingerprint) fail("Assess the report before editing its target.", 6);
  try { state = assess(state, JSON.parse(readFileSync(assessInput, "utf8")), contentFingerprint); }
  catch (error) { fail(error.message, 6); }
  writeJson(statePath, state);
  result(state.status === "convergence_blocked" ? stopResult(state) : { status: "assessment_ready", pass: state.pass });
  process.exit(0);
}
if (resolutionInput) {
  assertContext();
  if (!["ready_for_rereview", "pass_candidate", "blocked"].includes(resolutionStatus)) fail("Invalid resolution status.", 2);
  const resolution = localArtifact(resolutionInput);
  if (readFileSync(resolution, "utf8").trim().split("\n").at(-1).trim() !== resolutionStatus.toUpperCase()) fail("Resolution must end with its status marker.", 6);
  try { state = finish(state, resolutionStatus, contentFingerprint, resolution); }
  catch (error) { fail(error.message, 6); }
  state = { ...state, status: state.status === "convergence_blocked" ? state.status : resolutionStatus,
    fingerprint, content_fingerprint: contentFingerprint, last_resolution: resolution, last_processed_pass: state.pass };
  writeJson(statePath, state);
  result(state.status === "convergence_blocked" ? stopResult(state) : { status: state.status, pass: state.pass, resolution });
  process.exit(0);
}

if (markComplete) {
  if (state.branch !== branch || state.base !== base) {
    fail("Cannot complete a review cycle for a different branch or base.", 6);
  }
  if (!["pass_candidate", "complete"].includes(state.status)) {
    fail(
      "The active review cycle is not a pass candidate. Process the Codex report first.",
      6,
    );
  }
  if (state.fingerprint !== fingerprint) {
    fail(
      "The diff changed after the pass candidate was produced. Run another review pass.",
      6,
    );
  }
  if (!state.report || !existsSync(resolve(repoRoot, state.report))) {
    fail("The active Codex report is missing.", 6);
  }
  if (
    !state.last_resolution ||
    !existsSync(resolve(repoRoot, state.last_resolution))
  ) {
    fail("The active Claude resolution artifact is missing.", 6);
  }

  const reviewScope = normalizeReviewScope(state);
  if (!reviewScope) {
    fail("The active review cycle has no valid review scope.", 6);
  }
  const completionScope = reviewScope === "full" ? "full" : "incremental";
  const cumulativeCoverage =
    completionScope === "full" ||
    Boolean(state.baseline_cumulative_coverage);
  const completedAt = state.completed_at ?? new Date().toISOString();

  state = {
    ...state,
    version: 2,
    status: "complete",
    review_scope: reviewScope,
    source_state: state.source_state ?? sourceState,
    base_sha: baseSha,
    merge_base: mergeBase,
    head,
    fingerprint,
    content_fingerprint: contentFingerprint,
    completion_scope: completionScope,
    cumulative_coverage: cumulativeCoverage,
    completed_at: completedAt,
  };
  writeJson(statePath, state);
  const entry = checkpointEntryFromState(state);
  writeCheckpointEntry(entry);

  result({
    status: "complete",
    pass: state.pass,
    report: state.report,
    resolution: state.last_resolution,
    branch,
    base,
    review_scope: reviewScope,
    completion_scope: completionScope,
    cumulative_coverage: cumulativeCoverage,
    branch_ready: completionScope === "full",
    fingerprint,
    content_fingerprint: contentFingerprint,
    checkpoint: ".review-loop-v2/checkpoint.json",
  });
  process.exit(0);
}

if (state.status === "complete") {
  const entry = checkpointEntryFromState(state);
  const last = checkpoint.last_completed;
  if (
    !last ||
    last.fingerprint !== entry.fingerprint ||
    last.completed_at !== entry.completed_at
  ) {
    writeCheckpointEntry(entry);
  }
}

function archiveCurrentCycle(reason) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const branchSlug = (state.branch || "unknown").replace(
    /[^A-Za-z0-9._-]+/g,
    "-",
  );
  const archiveName = `${timestamp}-${branchSlug}`;
  const archiveRelative = `.review-loop-v2/archive/${archiveName}`;
  const archiveDir = join(loopDir, "archive", archiveName);
  mkdirSync(archiveDir, { recursive: true });
  const relocatedPaths = new Map();

  for (const name of readdirSync(loopDir)) {
    if (
      name === "archive" ||
      name === "checkpoint.json" ||
      !(
        name === "state.json" ||
        name === "final-summary.md" ||
        name === "convergence-summary.md" ||
        /^decision-\d+\.md$/.test(name) ||
        /^pass-\d+-.+/.test(name)
      )
    ) {
      continue;
    }
    renameSync(join(loopDir, name), join(archiveDir, name));
    relocatedPaths.set(
      `.review-loop-v2/${name}`,
      `${archiveRelative}/${name}`,
    );
  }

  function relocateCheckpointEntry(entry) {
    if (!entry || typeof entry !== "object") return entry;
    return {
      ...entry,
      report: relocatedPaths.get(entry.report) ?? entry.report,
      resolution:
        relocatedPaths.get(entry.resolution) ?? entry.resolution,
    };
  }

  if (relocatedPaths.size > 0 && checkpoint.version) {
    checkpoint = {
      ...checkpoint,
      last_completed: relocateCheckpointEntry(checkpoint.last_completed),
      last_full: relocateCheckpointEntry(checkpoint.last_full),
    };
    writeJson(checkpointPath, checkpoint);
  }

  process.stderr.write(
    `Archived prior review cycle (${reason}) to ${archiveDir}\n`,
  );
  state = {};
}

function scopeSatisfies(completedScope, desiredScope) {
  if (desiredScope === "auto") return true;
  if (completedScope === "full") return true;
  return completedScope === desiredScope;
}

const stateContextChanged =
  Number(state.version) >= 2 &&
  ((state.base_sha && state.base_sha !== baseSha) ||
    (state.merge_base && state.merge_base !== mergeBase));

if (
  state.branch &&
  (state.branch !== branch || state.base !== base || stateContextChanged)
) {
  archiveCurrentCycle(
    stateContextChanged
      ? "base revision or merge base changed"
      : "branch or base changed",
  );
} else if (state.status === "complete" && (!settingsMatch(state.reviewer_settings) || reviewerAccount === "current" || (state.reviewer_account ?? null) !== reviewerAccount || (reviewerAccount && state.reviewer_identity !== currentIdentity?.identity_sha256))) {
  archiveCurrentCycle(reviewerAccount === "current" ? "current login requires fresh account-unbound coverage" : "reviewer account changed");
} else if (state.status === "complete") {
  const completedScope = normalizeReviewScope(state) ?? "full";
  if (
    state.fingerprint === fingerprint &&
    scopeSatisfies(completedScope, requestedScope)
  ) {
    result({
      status: "already_complete",
      pass: state.pass,
      report: state.report,
      resolution: state.last_resolution ?? null,
      branch,
      base,
      review_scope: completedScope,
      completion_scope:
        state.completion_scope ??
        (completedScope === "full" ? "full" : "incremental"),
      branch_ready:
        (state.completion_scope ??
          (completedScope === "full" ? "full" : "incremental")) === "full",
      fingerprint,
      content_fingerprint: contentFingerprint,
    });
    process.exit(0);
  }

  if (state.fingerprint === fingerprint) {
    archiveCurrentCycle(
      `${requestedScope} review requested after ${completedScope} completion`,
    );
  } else {
    archiveCurrentCycle("completed diff changed");
  }
}

function commitExists(value) {
  if (!value) return false;
  return (
    git(["rev-parse", "--verify", `${value}^{commit}`], {
      allowFailure: true,
    }).status === 0
  );
}

function isAncestor(ancestor, descendant) {
  if (!commitExists(ancestor)) return false;
  return (
    git(["merge-base", "--is-ancestor", ancestor, descendant], {
      allowFailure: true,
    }).status === 0
  );
}

function checkpointContextMatches(entry) {
  if (!entry || typeof entry !== "object") return false;
  if (!settingsMatch(entry.reviewer_settings)) return false;
  // Native credential stores may hide account identity; require fresh coverage.
  if (reviewerAccount === "current") return false;
  if ((entry.reviewer_account ?? null) !== reviewerAccount) return false;
  if (reviewerAccount && entry.reviewer_codex_home !== reviewerHome) return false;
  if (reviewerAccount && entry.reviewer_identity !== currentIdentity?.identity_sha256) return false;
  if (entry.context_verified === false) return false;
  if (entry.branch !== branch || entry.base !== base) return false;
  if (entry.base_sha && entry.base_sha !== baseSha) return false;
  if (entry.merge_base && entry.merge_base !== mergeBase) return false;
  return true;
}

function checkpointCurrentContentMatches(entry) {
  return (
    checkpointContextMatches(entry) &&
    entry.content_fingerprint &&
    entry.content_fingerprint === contentFingerprint
  );
}

function checkpointHeadContentMatches(entry) {
  return (
    checkpointContextMatches(entry) &&
    entry.content_fingerprint &&
    entry.content_fingerprint === headContentFingerprint
  );
}

function usableCumulativeCheckpoint(entry) {
  if (!checkpointContextMatches(entry)) return false;
  if (!entry.cumulative_coverage) return false;
  return (
    entry.head === head ||
    checkpointHeadContentMatches(entry) ||
    isAncestor(entry.head, head)
  );
}

function completedCheckpointForRequest() {
  if (requestedScope === "full") return checkpoint.last_full ?? null;
  return checkpoint.last_completed ?? null;
}

const exactCheckpoint = completedCheckpointForRequest();
if (checkpointCurrentContentMatches(exactCheckpoint)) {
  const completionScope =
    exactCheckpoint.completion_scope ??
    (exactCheckpoint.review_scope === "full" ? "full" : "incremental");
  result({
    status: "already_complete",
    pass: null,
    report: exactCheckpoint.report ?? null,
    resolution: exactCheckpoint.resolution ?? null,
    branch,
    base,
    review_scope: exactCheckpoint.review_scope,
    completion_scope: completionScope,
    branch_ready: completionScope === "full",
    fingerprint,
    content_fingerprint: contentFingerprint,
    checkpoint: ".review-loop-v2/checkpoint.json",
    from_checkpoint: true,
  });
  process.exit(0);
}

let activeScope =
  ACTIVE_STATUSES.has(state.status) &&
  state.branch === branch &&
  state.base === base
    ? normalizeReviewScope(state)
    : null;

// First named continuation of legacy work keeps its history but cannot inherit
// accountless incremental coverage. Upgrade only a pass ready for a new reviewer.
const adoptingAccount = Boolean(reviewerAccount && !state.reviewer_account &&
  sameAccountContext && ["ready_for_rereview", "blocked"].includes(state.status));
if (adoptingAccount) activeScope = "full";

if (
  activeScope &&
  !adoptingAccount &&
  requestedScope !== "auto" &&
  requestedScope !== activeScope
) {
  fail(
    `The active review cycle is pinned to ${activeScope}. Complete or archive it before requesting ${requestedScope}.`,
    6,
  );
}

let reviewScope = activeScope;
let scopeReason = adoptingAccount
  ? "first named-account continuation requires full review; preserving prior convergence history"
  : activeScope
  ? `continuing the active ${activeScope} review cycle`
  : "";
let baselineCheckpoint =
  reviewScope === "full" ? null : state.baseline_checkpoint ?? checkpoint.last_completed ?? null;

if (!reviewScope) {
  if (requestedScope === "full") {
    reviewScope = "full";
    scopeReason = finalReview
      ? "final review requested; reviewing the complete proposed change"
      : "full scope explicitly requested";
    baselineCheckpoint = null;
  } else if (requestedScope === "uncommitted") {
    if (!hasUncommitted) {
      fail("Uncommitted scope requested, but the working tree is clean.", 4);
    }
    reviewScope = "uncommitted";
    scopeReason = "uncommitted scope explicitly requested";
    const candidate = checkpoint.last_completed;
    baselineCheckpoint =
      usableCumulativeCheckpoint(candidate) &&
      (candidate.head === head || checkpointHeadContentMatches(candidate))
        ? candidate
        : null;
  } else if (requestedScope === "since-last") {
    if (!usableCumulativeCheckpoint(checkpoint.last_completed)) {
      fail(
        "Since-last scope requires a compatible completed review checkpoint. Use --scope full.",
        6,
      );
    }
    baselineCheckpoint = checkpoint.last_completed;
    if (
      hasUncommitted &&
      (baselineCheckpoint.head === head ||
        checkpointHeadContentMatches(baselineCheckpoint))
    ) {
      reviewScope = "uncommitted";
      scopeReason =
        "the reviewed checkpoint matches current HEAD; reviewing only working-tree changes";
    } else {
      reviewScope = "since-last";
      scopeReason =
        "reviewing commits and working-tree changes added after the completed checkpoint";
    }
  } else if (!hasCommitted && hasUncommitted) {
    reviewScope = "full";
    scopeReason =
      "all proposed changes are uncommitted, so the uncommitted target covers the full change";
    baselineCheckpoint = null;
  } else if (usableCumulativeCheckpoint(checkpoint.last_completed)) {
    baselineCheckpoint = checkpoint.last_completed;
    if (
      hasUncommitted &&
      (baselineCheckpoint.head === head ||
        checkpointHeadContentMatches(baselineCheckpoint))
    ) {
      reviewScope = "uncommitted";
      scopeReason =
        "a completed checkpoint covers current HEAD; reviewing only new working-tree changes";
    } else if (
      baselineCheckpoint.head !== head &&
      isAncestor(baselineCheckpoint.head, head)
    ) {
      reviewScope = "since-last";
      scopeReason =
        "a completed checkpoint covers the earlier branch state; reviewing only later commits and working-tree changes";
    } else {
      reviewScope = "full";
      scopeReason =
        "checkpoint lineage is ambiguous; conservatively reviewing the complete proposed change";
      baselineCheckpoint = null;
    }
  } else {
    reviewScope = "full";
    scopeReason =
      "no compatible completed checkpoint exists; conservatively reviewing the complete proposed change";
    baselineCheckpoint = null;
  }
}

if (reviewScope === "uncommitted" && !hasUncommitted) {
  fail("The active uncommitted review cycle has no working-tree changes.", 4);
}

if (reviewScope === "since-last" && !baselineCheckpoint?.head) {
  fail("The active since-last review cycle has no checkpoint HEAD.", 6);
}

if (
  state.status === "review_ready" &&
  state.fingerprint === fingerprint &&
  state.report &&
  existsSync(resolve(repoRoot, state.report))
) {
  result({
    status: "review_ready",
    pass: state.pass,
    report: state.report,
    branch,
    base,
    review_scope: reviewScope,
    source_state: state.source_state ?? sourceState,
    scope_reason: state.scope_reason ?? scopeReason,
    fingerprint: state.fingerprint,
    reused: true,
  });
  process.exit(0);
}

if (
  state.status === "review_ready" &&
  state.fingerprint !== fingerprint
) {
  fail(
    "The diff changed after the current Codex report was created. Process or archive the stale report before starting another pass.",
    6,
  );
}

if (
  state.status === "pass_candidate" &&
  state.fingerprint === fingerprint
) {
  result({
    status: "completion_ready",
    pass: state.pass,
    report: state.report,
    resolution: state.last_resolution ?? null,
    branch,
    base,
    review_scope: reviewScope,
    fingerprint,
  });
  process.exit(0);
}

if (
  state.status === "pass_candidate" &&
  state.fingerprint !== fingerprint
) {
  fail(
    "The diff changed after the pass candidate was produced. Run another review pass.",
    6,
  );
}

if (state.status === "blocked" && state.fingerprint === fingerprint) {
  fail(
    "The current review cycle is blocked and the diff has not changed. Resolve the recorded blocker before starting another pass.",
    6,
  );
}

const completedPasses = readdirSync(loopDir)
  .map((name) => /^pass-(\d+)-codex\.md$/.exec(name))
  .filter(Boolean)
  .map((match) => Number.parseInt(match[1], 10));
const pass = Math.max(Number(state.pass) || 0, ...completedPasses, 0) + 1;
const passBudget = requestedMax ?? state.pass_budget ?? null;
if (passBudget !== null && pass > passBudget) {
  result({ status: "max_passes_reached", attempted_pass: pass, max_passes: passBudget,
    reason: "The user-selected budget is exhausted; a confirming pass is still required." });
  process.exit(0);
}
const passLabel = String(pass).padStart(2, "0");
const reportRelative = `.review-loop-v2/pass-${passLabel}-codex.md`;
const reportPath = join(repoRoot, reportRelative);

let codexArgs;
if (reviewScope === "uncommitted") {
  codexArgs = ["review", "--uncommitted"];
} else if (reviewScope === "since-last") {
  codexArgs = [
    "review",
    [
      `Review only changes added after completed review checkpoint ${baselineCheckpoint.head}.`,
      `Include commits in ${baselineCheckpoint.head}..HEAD plus all staged, unstaged, and untracked changes.`,
      "Treat earlier branch changes as context, not review targets, unless the newer changes introduce a regression in them.",
      "Inspect current file contents so working-tree changes override older committed versions.",
      "Do not edit files and do not read .review-loop or .review-loop-v2 artifacts.",
      "Return only prioritized, actionable P0-P3 findings with file and line evidence.",
    ].join(" "),
  ];
} else if (sourceState === "committed") {
  codexArgs = ["review", "--base", base];
} else if (sourceState === "uncommitted") {
  codexArgs = ["review", "--uncommitted"];
} else {
  codexArgs = [
    "review",
    [
      `Review the complete current proposed change against base branch ${base}.`,
      "Include committed changes from the merge base through HEAD plus all staged, unstaged, and untracked changes.",
      "Inspect current file contents so working-tree changes override older committed versions.",
      "Do not edit files and do not read .review-loop or .review-loop-v2 artifacts.",
      "Return only prioritized, actionable P0-P3 findings with file and line evidence.",
    ].join(" "),
  ];
}

// Omitted model settings leave Codex's configured defaults intact.
codexArgs.splice(1, 0,
  ...accountConfigArgs(reviewerAccount),
  ...modelConfigArgs(selectedSettings),
);

const baselineSummary = checkpointSummary(baselineCheckpoint);
const baselineCumulativeCoverage =
  reviewScope === "full" ||
  Boolean(baselineCheckpoint?.cumulative_coverage);

if (dryRun) {
  result({
    status: "dry_run",
    pass,
    report: reportRelative,
    branch,
    base,
    review_scope: reviewScope,
    source_state: sourceState,
    scope_reason: scopeReason,
    reviewed_from:
      reviewScope === "full"
        ? mergeBase
        : reviewScope === "uncommitted"
          ? head
          : baselineCheckpoint.head,
    fingerprint,
    content_fingerprint: contentFingerprint,
    baseline_checkpoint: baselineSummary,
    command: [codexBin, ...codexArgs],
    codex_home: reviewerHome,
    reviewer_settings: selectedSettings,
  });
  process.exit(0);
}

let login;
try { login = requireAccountLogin(reviewerAccount, codexBin); }
catch (error) { fail(error.message, 6); }
if (ACTIVE_STATUSES.has(state.status) && state.reviewer_identity && state.reviewer_identity !== login.identity_sha256) fail("The active review cycle's signed-in account/workspace changed; restore its original login.", 6);
if (baselineCheckpoint && baselineCheckpoint.reviewer_identity !== login.identity_sha256) fail("The checkpoint belongs to a different account/workspace; request --scope full.", 6);
const reviewerMetadata = { reviewer_settings: selectedSettings, reviewer_account: reviewerAccount, reviewer_identity: login.identity_sha256, reviewer_codex_home: reviewerHome };

process.stderr.write(
  `Selected ${reviewScope} scope: ${scopeReason}.\n`,
);
process.stderr.write(
  `Starting Codex review pass ${pass} (${sourceState}, base ${base})...\n`,
);
process.stderr.write(`Reviewer account: ${reviewerAccount}; model: ${selectedSettings.model ?? "Codex default"}; reasoning: ${selectedSettings.reasoningEffort ?? "Codex default"}.\n`);

const outputChunks = [];
const errorChunks = [];
const child = spawn(codexBin, codexArgs, {
  cwd: repoRoot,
  env: accountEnvironment(reviewerAccount),
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.on("data", (chunk) => {
  outputChunks.push(chunk);
  process.stdout.write(chunk);
});
child.stderr.on("data", (chunk) => {
  errorChunks.push(chunk);
  process.stderr.write(chunk);
});

const exitCode = await new Promise((resolveExit) => {
  child.on("error", (error) => {
    errorChunks.push(Buffer.from(error.message));
    resolveExit(127);
  });
  child.on("close", (code) => resolveExit(code ?? 1));
});

const reviewText = Buffer.concat(outputChunks).toString("utf8").trim();
const errorText = Buffer.concat(errorChunks).toString("utf8").trim();

if (exitCode !== 0) {
  const failurePath = join(
    loopDir,
    `pass-${passLabel}-codex.failed.log`,
  );
  writeFileSync(
    failurePath,
    [`exit_code=${exitCode}`, errorText, reviewText]
      .filter(Boolean)
      .join("\n\n"),
    "utf8",
  );
  fail(`Codex review failed. Details: ${failurePath}`, 7);
}

if (!reviewText) {
  fail("Codex review completed without a report.", 7);
}

if (computeStateFingerprint() !== fingerprint) fail("The review target changed while Codex was reviewing; discard the stale result.", 6);
try {
  if (accountIdentity(reviewerAccount).identity_sha256 !== login.identity_sha256) fail("The reviewer login changed while Codex was reviewing; discard the stale result.", 6);
} catch (error) { fail(error.message, 6); }

const reviewedAt = new Date().toISOString();
const metadata = {
  ...reviewerMetadata,
  version: 2,
  pass,
  branch,
  base,
  base_sha: baseSha,
  merge_base: mergeBase,
  review_scope: reviewScope,
  source_state: sourceState,
  scope_reason: scopeReason,
  reviewed_from:
    reviewScope === "full"
      ? mergeBase
      : reviewScope === "uncommitted"
        ? head
        : baselineCheckpoint.head,
  head,
  fingerprint,
  content_fingerprint: contentFingerprint,
  reviewed_at: reviewedAt,
};
const reportBody = [
  "<!-- review-loop-v2-metadata",
  JSON.stringify(metadata, null, 2),
  "-->",
  "",
  `# Codex review pass ${pass}`,
  "",
  reviewText,
  "",
].join("\n");
const temporaryReport = `${reportPath}.tmp`;
writeFileSync(temporaryReport, reportBody, "utf8");
renameSync(temporaryReport, reportPath);

const history = Array.isArray(state.history) ? state.history : [];
state = {
  ...state,
  ...reviewerMetadata,
  version: 2,
  pass_budget: passBudget,
  status: "review_ready",
  branch,
  base,
  base_sha: baseSha,
  merge_base: mergeBase,
  pass,
  scope: reviewScope,
  review_scope: reviewScope,
  source_state: sourceState,
  scope_reason: scopeReason,
  baseline_checkpoint: baselineSummary,
  baseline_cumulative_coverage: baselineCumulativeCoverage,
  head,
  fingerprint,
  content_fingerprint: contentFingerprint,
  report: reportRelative,
  reviewed_at: reviewedAt,
  history: [
    ...history,
    {
      ...reviewerMetadata,
      pass,
      review_scope: reviewScope,
      source_state: sourceState,
      head,
      fingerprint,
      content_fingerprint: contentFingerprint,
      report: reportRelative,
      reviewed_at: reviewedAt,
    },
  ],
};
writeJson(statePath, state);

process.stdout.write("\n");
result({
  status: "review_ready",
  pass,
  report: reportRelative,
  branch,
  base,
  review_scope: reviewScope,
  source_state: sourceState,
  scope_reason: scopeReason,
  fingerprint,
  content_fingerprint: contentFingerprint,
  reused: false,
});
