#!/usr/bin/env node

import { assess, finish, resume, stopResult } from "./convergence.mjs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

const VALID_SCOPES = new Set(["auto", "full", "uncommitted", "since-last"]);
const ACTIVE_STATUSES = new Set([
  "prepared",
  "review_ready",
  "ready_for_rereview",
  "pass_candidate",
  "blocked",
  "convergence_blocked",
]);
const RESOLUTION_STATUSES = new Set([
  "ready_for_rereview",
  "pass_candidate",
  "blocked",
]);
const STATUS_MARKERS = Object.freeze({
  ready_for_rereview: "READY_FOR_REREVIEW",
  pass_candidate: "PASS_CANDIDATE",
  blocked: "BLOCKED",
});

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function emit(payload) {
  process.stdout.write(`REVIEW_LOOP_STATE ${JSON.stringify(payload)}\n`);
}

function text(value) {
  return Buffer.isBuffer(value) ? value.toString("utf8") : value ?? "";
}

function run(executable, args, { allowFailure = false, encoding = "utf8" } = {}) {
  const result = spawnSync(executable, args, {
    encoding,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (!allowFailure && result.status !== 0) {
    fail(
      `${executable} ${args.join(" ")} failed:\n${text(result.stderr) || text(result.stdout)}`,
      3,
    );
  }
  return result;
}

function git(args, options = {}) {
  return run("git", args, options);
}

const rootResult = git(["rev-parse", "--show-toplevel"], { allowFailure: true });
if (rootResult.status !== 0) fail("review-loop must run inside a Git repository.", 3);
const repoRoot = text(rootResult.stdout).trim();
process.chdir(repoRoot);

const loopDir = join(repoRoot, ".review-loop-v2");
const statePath = join(loopDir, "state.json");
const checkpointPath = join(loopDir, "checkpoint.json");

const trackedReviewArtifacts = text(
  git(["ls-files", "--", ".review-loop-v2"]).stdout,
).trim();
if (trackedReviewArtifacts.length > 0) {
  fail(".review-loop-v2 contains tracked files; review artifacts must remain local.", 4);
}

function readJson(path, label) {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`Invalid ${label}: ${error instanceof Error ? error.message : error}`, 5);
  }
}

function writeJson(path, value) {
  mkdirSync(loopDir, { recursive: true });
  const temporaryPath = `${path}.tmp-${process.pid}`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporaryPath, path);
}

let state = readJson(statePath, ".review-loop-v2/state.json");
let checkpoint = readJson(checkpointPath, ".review-loop-v2/checkpoint.json");

function safeBase(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.startsWith("-") ||
    value.includes("..") ||
    value.includes("@{") ||
    !/^[A-Za-z0-9._/-]+$/.test(value)
  ) {
    fail(`Unsafe or invalid base branch: ${JSON.stringify(value)}`, 2);
  }
  const verify = git(["rev-parse", "--verify", `${value}^{commit}`], {
    allowFailure: true,
  });
  if (verify.status !== 0) fail(`Base branch does not resolve to a commit: ${value}`, 3);
  return value;
}

function detectBase(requested) {
  if (requested !== undefined) return safeBase(requested);
  if (typeof state.base === "string" && ACTIVE_STATUSES.has(state.status)) {
    return safeBase(state.base);
  }
  const originHead = git(
    ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"],
    { allowFailure: true },
  );
  const remote = text(originHead.stdout).trim();
  if (originHead.status === 0 && remote.length > 0) return safeBase(remote);
  for (const candidate of ["main", "master"]) {
    const verify = git(["rev-parse", "--verify", `${candidate}^{commit}`], {
      allowFailure: true,
    });
    if (verify.status === 0) return candidate;
  }
  fail("Could not detect a base branch. Pass --base <branch>.", 3);
}

function diffExists(args) {
  const result = git(["diff", "--quiet", ...args], { allowFailure: true });
  if (result.status === 0) return false;
  if (result.status === 1) return true;
  fail(`Unable to inspect Git diff: ${text(result.stderr) || text(result.stdout)}`, 3);
}

function nulList(value) {
  return text(value).split("\0").filter(Boolean);
}

function reviewArtifact(relativePath) {
  return [".review-loop", ".review-loop-v2"].some(dir => relativePath === dir || relativePath.startsWith(`${dir}/`));
}

function untrackedPaths() {
  return nulList(git(["ls-files", "--others", "--exclude-standard", "-z"]).stdout)
    .filter((path) => !reviewArtifact(path))
    .sort();
}

function commitExists(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  return git(["rev-parse", "--verify", `${value}^{commit}`], {
    allowFailure: true,
  }).status === 0;
}

function isAncestor(ancestor, descendant) {
  if (!commitExists(ancestor) || !commitExists(descendant)) return false;
  return git(["merge-base", "--is-ancestor", ancestor, descendant], {
    allowFailure: true,
  }).status === 0;
}

function hashUntracked(hash, relativePath) {
  const absolutePath = resolve(repoRoot, relativePath);
  hash.update(`untracked:${relativePath}\0`);
  if (!existsSync(absolutePath)) return;
  const stats = lstatSync(absolutePath);
  if (stats.isSymbolicLink()) {
    hash.update(`symlink:${readlinkSync(absolutePath)}\0`);
  } else if (stats.isFile()) {
    hash.update(readFileSync(absolutePath));
  } else {
    hash.update(`mode:${stats.mode}\0`);
  }
}

function repositoryContext(base) {
  const branch = text(git(["rev-parse", "--abbrev-ref", "HEAD"]).stdout).trim();
  const head = text(git(["rev-parse", "HEAD"]).stdout).trim();
  const baseSha = text(git(["rev-parse", base]).stdout).trim();
  const mergeBase = text(git(["merge-base", base, "HEAD"]).stdout).trim();
  const hasCommitted = diffExists([`${base}...HEAD`]);
  const paths = untrackedPaths();
  const hasUnstaged = diffExists([]);
  const hasStaged = diffExists(["--cached"]);
  const hasUncommitted = hasUnstaged || hasStaged || paths.length > 0;
  const sourceState = hasCommitted
    ? hasUncommitted
      ? "mixed"
      : "committed"
    : hasUncommitted
      ? "uncommitted"
      : "clean";

  const hash = createHash("sha256");
  hash.update(
    [
      "review-loop-v2-fingerprint:v1",
      `branch:${branch}`,
      `base:${base}`,
      `base_sha:${baseSha}`,
      `merge_base:${mergeBase}`,
      `head:${head}`,
      "",
    ].join("\n"),
  );
  for (const args of [
    ["diff", "--binary", `${base}...HEAD`],
    ["diff", "--binary"],
    ["diff", "--cached", "--binary"],
  ]) {
    const result = git(args, { encoding: null });
    hash.update(result.stdout ?? Buffer.alloc(0));
  }
  for (const relativePath of paths) hashUntracked(hash, relativePath);

  const contentHash = createHash("sha256");
  contentHash.update(`content:v1:${mergeBase}\0`);
  const contentPaths = new Set([...nulList(git(["diff", "--name-only", "-z", mergeBase]).stdout), ...paths]);
  for (const path of [...contentPaths].sort()) {
    const absolute = resolve(repoRoot, path);
    let stats;
    try { stats = lstatSync(absolute); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    const mode = !stats ? "deleted" : stats.isSymbolicLink() ? "120000"
      : stats.isFile() ? (stats.mode & 0o111 ? "100755" : "100644") : "special";
    contentHash.update(`path:${path}\0mode:${mode}\0`);
    if (stats?.isSymbolicLink()) contentHash.update(readlinkSync(absolute));
    else if (stats?.isFile()) contentHash.update(readFileSync(absolute));
    else if (stats) contentHash.update(git(["diff", "--binary", mergeBase, "--", path], { encoding: null }).stdout);
    contentHash.update("\0");
  }
  return Object.freeze({
    contentFingerprint: contentHash.digest("hex"),
    repoRoot,
    branch,
    base,
    baseSha,
    mergeBase,
    head,
    hasCommitted,
    hasUncommitted,
    sourceState,
    untrackedPaths: paths,
    fingerprint: hash.digest("hex"),
  });
}

function parsePositiveInteger(value, name, fallback) {
  if (value === undefined) {
    if (fallback === undefined) fail(`${name} is required.`, 2);
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    fail(`${name} must be a positive safe integer.`, 2);
  }
  return parsed;
}

function optionParser(args, { values = [], booleans = [], positionalBase = false } = {}) {
  const valueNames = new Set(values);
  const booleanNames = new Set(booleans);
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (booleanNames.has(argument)) {
      if (parsed[argument] !== undefined) fail(`${argument} may be supplied only once.`, 2);
      parsed[argument] = true;
      continue;
    }
    if (valueNames.has(argument)) {
      if (parsed[argument] !== undefined) fail(`${argument} may be supplied only once.`, 2);
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) fail(`${argument} requires a value.`, 2);
      parsed[argument] = value;
      index += 1;
      continue;
    }
    const equals = [...valueNames].find((name) => argument.startsWith(`${name}=`));
    if (equals !== undefined) {
      if (parsed[equals] !== undefined) fail(`${equals} may be supplied only once.`, 2);
      parsed[equals] = argument.slice(equals.length + 1);
      continue;
    }
    if (positionalBase && !argument.startsWith("-") && parsed["--base"] === undefined) {
      parsed["--base"] = argument;
      continue;
    }
    fail(`Unknown or incomplete argument: ${argument}`, 2);
  }
  return parsed;
}

function checkpointContextMatches(entry, context) {
  return Boolean(
    entry &&
      typeof entry === "object" &&
      entry.branch === context.branch &&
      entry.base === context.base &&
      entry.base_sha === context.baseSha &&
      entry.merge_base === context.mergeBase,
  );
}

function cumulativeCheckpoint(entry, context) {
  return checkpointContextMatches(entry, context) &&
    entry.cumulative_coverage === true &&
    (entry.head === context.head || isAncestor(entry.head, context.head));
}

function relativeToRepo(path) {
  const absolute = resolve(repoRoot, path);
  const result = relative(repoRoot, absolute);
  if (result === "" || result.startsWith(`..${sep}`) || result === ".." || isAbsolute(result)) {
    fail(`Path must be inside the repository: ${path}`, 2);
  }
  return result.split(sep).join("/");
}

function relativeLoopFile(path) {
  const relativePath = relativeToRepo(path);
  if (!relativePath.startsWith(".review-loop-v2/")) {
    fail(`Resolution must be stored under .review-loop-v2/: ${path}`, 2);
  }
  return relativePath;
}

function readableFile(path, label) {
  const absolute = resolve(repoRoot, path);
  if (!existsSync(absolute) || !statSync(absolute).isFile()) {
    fail(`${label} is not a readable regular file: ${path}`, 2);
  }
  const content = readFileSync(absolute, "utf8");
  if (content.trim().length === 0) fail(`${label} is empty: ${path}`, 2);
  return content;
}

function padPass(pass) {
  return String(pass).padStart(2, "0");
}

function reportPathFor(pass) {
  return `.review-loop-v2/pass-${padPass(pass)}-review.md`;
}

function reportMetadata(activeState, kind) {
  return {
    version: 1,
    pass: activeState.pass,
    kind,
    branch: activeState.branch,
    base: activeState.base,
    base_sha: activeState.base_sha,
    merge_base: activeState.merge_base,
    review_scope: activeState.review_scope,
    completion_scope: activeState.completion_scope,
    source_state: activeState.source_state,
    scope_reason: activeState.scope_reason,
    reviewed_from: activeState.reviewed_from,
    head: activeState.head,
    fingerprint: activeState.review_fingerprint,
    reviewed_at: new Date().toISOString(),
  };
}

function recordReport(activeState, rawText, kind) {
  const metadata = reportMetadata(activeState, kind);
  const reportRelative = reportPathFor(activeState.pass);
  const reportAbsolute = join(repoRoot, reportRelative);
  mkdirSync(loopDir, { recursive: true });
  const body = [
    "<!-- review-loop-v2-metadata",
    JSON.stringify(metadata, null, 2),
    "-->",
    "",
    `# Review loop pass ${activeState.pass}`,
    "",
    rawText.trim(),
    "",
  ].join("\n");
  const temporary = `${reportAbsolute}.tmp-${process.pid}`;
  writeFileSync(temporary, body, "utf8");
  renameSync(temporary, reportAbsolute);
  const history = Array.isArray(activeState.history) ? activeState.history : [];
  state = {
    ...activeState,
    status: "review_ready",
    report: reportRelative,
    reviewed_at: metadata.reviewed_at,
    history: [
      ...history,
      {
        pass: activeState.pass,
        kind,
        report: reportRelative,
        fingerprint: activeState.review_fingerprint,
        reviewed_at: metadata.reviewed_at,
      },
    ],
  };
  writeJson(statePath, state);
  return reportRelative;
}

function archiveCycle(reason) {
  if (!existsSync(loopDir)) {
    state = {};
    return;
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const branchSlug = String(state.branch ?? "unknown").replace(/[^A-Za-z0-9._-]+/g, "-");
  const archiveRelative = `.review-loop-v2/archive/${timestamp}-${branchSlug}`;
  const archiveAbsolute = join(repoRoot, archiveRelative);
  mkdirSync(archiveAbsolute, { recursive: true });
  const relocated = new Map();
  for (const name of readdirSync(loopDir)) {
    if (
      name === "archive" ||
      name === "checkpoint.json" ||
      !(name === "state.json" || name === "final-summary.md" || name === "convergence-summary.md" || /^decision-\d+\.md$/.test(name) || /^pass-\d+-.+/.test(name))
    ) {
      continue;
    }
    renameSync(join(loopDir, name), join(archiveAbsolute, name));
    relocated.set(`.review-loop-v2/${name}`, `${archiveRelative}/${name}`);
  }
  const relocateEntry = (entry) => {
    if (!entry || typeof entry !== "object") return entry;
    return {
      ...entry,
      report: relocated.get(entry.report) ?? entry.report,
      resolution: relocated.get(entry.resolution) ?? entry.resolution,
      summary: relocated.get(entry.summary) ?? entry.summary,
    };
  };
  if (checkpoint.version) {
    checkpoint = {
      ...checkpoint,
      last_completed: relocateEntry(checkpoint.last_completed),
      last_full: relocateEntry(checkpoint.last_full),
    };
    writeJson(checkpointPath, checkpoint);
  }
  process.stderr.write(`Archived prior review cycle (${reason}) to ${archiveAbsolute}\n`);
  state = {};
}

function reviewPrompt(reviewScope, context, baseline) {
  const common = [
    `Repository: ${context.repoRoot}.`,
    `Current branch: ${context.branch}. Base: ${context.base} (${context.baseSha}).`,
    "Inspect current file contents so working-tree files override committed versions.",
    "Inspect affected callers, dependencies, contracts, and tests across the repository.",
    "Do not edit files, create commits, or read .review-loop or .review-loop-v2 artifacts.",
    "Return only prioritized, actionable P0-P3 findings with file and line evidence, or No findings.",
  ];
  if (reviewScope === "uncommitted") {
    return [
      `Review only staged, unstaged, and untracked changes relative to current HEAD ${context.head}.`,
      ...common,
    ].join(" ");
  }
  if (reviewScope === "since-last") {
    return [
      `Review only changes after completed checkpoint ${baseline.head}: commits in ${baseline.head}..HEAD plus staged, unstaged, and untracked changes.`,
      "Treat earlier branch changes as context unless newer work regresses them.",
      ...common,
    ].join(" ");
  }
  return [
    `Review the complete proposed change from merge base ${context.mergeBase} through HEAD, including staged, unstaged, and untracked changes.`,
    ...common,
  ].join(" ");
}

function completionResult(entry, fromCheckpoint = false) {
  return {
    status: "already_complete",
    branch: entry.branch,
    base: entry.base,
    pass: entry.pass ?? null,
    review_scope: entry.review_scope,
    completion_scope: entry.completion_scope,
    branch_ready: entry.completion_scope === "full",
    fingerprint: entry.fingerprint,
    report: entry.report ?? null,
    resolution: entry.resolution ?? null,
    summary: entry.summary ?? null,
    checkpoint: ".review-loop-v2/checkpoint.json",
    from_checkpoint: fromCheckpoint,
  };
}

function prepare(args) {
  const options = optionParser(args, {
    values: ["--base", "--scope", "--max-passes", "--initial-report"],
    booleans: ["--final", "--dry-run"],
    positionalBase: true,
  });
  let requestedScope = options["--scope"] ?? "auto";
  if (!VALID_SCOPES.has(requestedScope)) {
    fail(`Invalid review scope: ${requestedScope}.`, 2);
  }
  const finalReview = options["--final"] === true;
  if (finalReview && requestedScope !== "auto" && requestedScope !== "full") {
    fail("--final conflicts with a non-full --scope value.", 2);
  }
  if (finalReview) requestedScope = "full";
  const requestedMax = options["--max-passes"] === undefined ? undefined
    : parsePositiveInteger(options["--max-passes"], "--max-passes");
  const base = detectBase(options["--base"]);
  let context = repositoryContext(base);

  if (state.status === "convergence_blocked") { emit(stopResult(state)); return; }
  const stateContextChanged = state.branch && (
    state.branch !== context.branch ||
    state.base !== context.base ||
    state.base_sha !== context.baseSha ||
    state.merge_base !== context.mergeBase
  );
  if (stateContextChanged) {
    archiveCycle("branch, base revision, or merge base changed");
  }

  if (state.status === "complete") {
    if (state.fingerprint === context.fingerprint) {
      const satisfies = requestedScope === "auto" ||
        state.completion_scope === "full" ||
        state.review_scope === requestedScope;
      if (satisfies) {
        emit(completionResult(state));
        return;
      }
      archiveCycle(`${requestedScope} review requested after ${state.review_scope} completion`);
    } else {
      archiveCycle("completed review target changed");
    }
  }

  const completed = requestedScope === "full"
    ? checkpoint.last_full
    : checkpoint.last_completed;
  if (
    checkpointContextMatches(completed, context) &&
    completed.fingerprint === context.fingerprint
  ) {
    emit(completionResult(completed, true));
    return;
  }

  if (context.sourceState === "clean") {
    emit({ status: "no_changes", branch: context.branch, base: context.base });
    return;
  }

  if (
    ["prepared", "review_ready", "pass_candidate"].includes(state.status) &&
    state.fingerprint !== context.fingerprint
  ) {
    fail(
      `The review target changed while the cycle was ${state.status}. Resolve or archive the stale cycle before continuing.`,
      6,
    );
  }
  if (state.status === "review_ready") {
    emit({
      status: "review_ready",
      pass: state.pass,
      report: state.report,
      branch: state.branch,
      base: state.base,
      review_scope: state.review_scope,
      completion_scope: state.completion_scope,
      fingerprint: state.review_fingerprint,
      reused: true,
    });
    return;
  }
  if (state.status === "prepared") {
    emit({
      status: "prepared",
      pass: state.pass,
      branch: state.branch,
      base: state.base,
      review_scope: state.review_scope,
      completion_scope: state.completion_scope,
      source_state: state.source_state,
      scope_reason: state.scope_reason,
      reviewed_from: state.reviewed_from,
      fingerprint: state.review_fingerprint,
      review_prompt: state.review_prompt,
      report: reportPathFor(state.pass),
      reused: true,
    });
    return;
  }
  if (state.status === "pass_candidate") {
    emit({
      status: "completion_ready",
      pass: state.pass,
      report: state.report,
      resolution: state.last_resolution,
      branch: state.branch,
      base: state.base,
      review_scope: state.review_scope,
      completion_scope: state.completion_scope,
      fingerprint: state.fingerprint,
    });
    return;
  }
  if (state.status === "blocked") {
    if (state.fingerprint === context.fingerprint) {
      emit({
        status: "blocked",
        pass: state.pass,
        report: state.report,
        resolution: state.last_resolution,
        reason: "The recorded blocker remains and the review target has not changed.",
      });
      return;
    }
    state = { ...state, status: "ready_for_rereview", fingerprint: context.fingerprint };
    writeJson(statePath, state);
  }

  const activeScope = ACTIVE_STATUSES.has(state.status) ? state.review_scope : undefined;
  if (activeScope && requestedScope !== "auto" && requestedScope !== activeScope) {
    fail(`The active cycle is pinned to ${activeScope}; requested ${requestedScope}.`, 6);
  }

  let reviewScope = activeScope;
  let scopeReason = activeScope ? `continuing the active ${activeScope} cycle` : "";
  let baseline = state.baseline_checkpoint ?? checkpoint.last_completed ?? null;
  if (!reviewScope) {
    if (requestedScope === "full") {
      reviewScope = "full";
      scopeReason = finalReview
        ? "final readiness requested; reviewing the complete proposed change"
        : "full scope explicitly requested";
      baseline = null;
    } else if (requestedScope === "uncommitted") {
      if (!context.hasUncommitted) fail("Uncommitted scope requested, but the worktree is clean.", 4);
      reviewScope = "uncommitted";
      scopeReason = "uncommitted scope explicitly requested";
      baseline = cumulativeCheckpoint(checkpoint.last_completed, context)
        ? checkpoint.last_completed
        : null;
    } else if (requestedScope === "since-last") {
      if (!cumulativeCheckpoint(checkpoint.last_completed, context)) {
        fail("Since-last scope requires a compatible cumulative checkpoint.", 6);
      }
      baseline = checkpoint.last_completed;
      if (context.hasUncommitted && baseline.head === context.head) {
        reviewScope = "uncommitted";
        scopeReason = "the checkpoint covers current HEAD; reviewing working-tree changes";
      } else {
        reviewScope = "since-last";
        scopeReason = "reviewing commits and working changes after the completed checkpoint";
      }
    } else if (cumulativeCheckpoint(checkpoint.last_completed, context)) {
      baseline = checkpoint.last_completed;
      if (context.hasUncommitted && baseline.head === context.head) {
        reviewScope = "uncommitted";
        scopeReason = "a completed checkpoint covers current HEAD; reviewing working-tree changes";
      } else if (baseline.head !== context.head && isAncestor(baseline.head, context.head)) {
        reviewScope = "since-last";
        scopeReason = "a completed checkpoint covers an ancestor; reviewing later changes";
      } else {
        reviewScope = "full";
        scopeReason = "checkpoint lineage is ambiguous; using full scope";
        baseline = null;
      }
    } else if (!context.hasCommitted && context.hasUncommitted) {
      reviewScope = "full";
      scopeReason = "all proposed changes are uncommitted, so they constitute full coverage";
      baseline = null;
    } else {
      reviewScope = "full";
      scopeReason = "no compatible checkpoint exists; using full scope";
      baseline = null;
    }
  }

  // Ignore legacy max_passes: older versions silently assigned four to every cycle.
  const maxPasses = requestedMax ?? state.pass_budget ?? null;
  const pass = state.status === "ready_for_rereview" ? Number(state.pass) + 1 : 1;
  if (maxPasses !== null && pass > maxPasses) {
    emit({ status: "max_passes_reached", attempted_pass: pass, max_passes: maxPasses,
      reason: "The user-selected budget is exhausted; a confirming pass is still required." });
    return;
  }
  const completionScope = reviewScope === "full" ? "full" : "incremental";
  const reviewedFrom = reviewScope === "full"
    ? context.mergeBase
    : reviewScope === "uncommitted"
      ? context.head
      : baseline.head;
  const prompt = reviewPrompt(reviewScope, context, baseline);
  const preparedState = {
    ...state,
    version: 1,
    status: "prepared",
    branch: context.branch,
    base: context.base,
    base_sha: context.baseSha,
    merge_base: context.mergeBase,
    pass,
    pass_budget: maxPasses,
    review_scope: reviewScope,
    completion_scope: completionScope,
    source_state: context.sourceState,
    scope_reason: scopeReason,
    baseline_checkpoint: baseline,
    reviewed_from: reviewedFrom,
    head: context.head,
    fingerprint: context.fingerprint,
    review_fingerprint: context.fingerprint,
    review_content_fingerprint: context.contentFingerprint,
    review_prompt: prompt,
    prepared_at: new Date().toISOString(),
  };

  if (options["--dry-run"] === true) {
    emit({
      status: "dry_run",
      pass,
      branch: context.branch,
      base: context.base,
      review_scope: reviewScope,
      completion_scope: completionScope,
      source_state: context.sourceState,
      scope_reason: scopeReason,
      reviewed_from: reviewedFrom,
      fingerprint: context.fingerprint,
      review_prompt: prompt,
      report: reportPathFor(pass),
    });
    return;
  }

  state = preparedState;
  writeJson(statePath, state);
  const initialReport = options["--initial-report"];
  if (initialReport !== undefined && pass === 1) {
    const rawText = readableFile(initialReport, "Initial review report");
    const report = recordReport(state, rawText, "imported");
    emit({
      status: "review_ready",
      pass,
      report,
      branch: context.branch,
      base: context.base,
      review_scope: reviewScope,
      completion_scope: completionScope,
      source_state: context.sourceState,
      scope_reason: scopeReason,
      fingerprint: context.fingerprint,
      imported: true,
      reused: false,
    });
    return;
  }
  emit({
    status: "prepared",
    pass,
    branch: context.branch,
    base: context.base,
    review_scope: reviewScope,
    completion_scope: completionScope,
    source_state: context.sourceState,
    scope_reason: scopeReason,
    reviewed_from: reviewedFrom,
    fingerprint: context.fingerprint,
    review_prompt: prompt,
    report: reportPathFor(pass),
    reused: false,
  });
}

function recordReview(args) {
  const options = optionParser(args, { values: ["--pass", "--input"] });
  const pass = parsePositiveInteger(options["--pass"], "--pass");
  if (state.status !== "prepared" || state.pass !== pass) {
    fail(`Pass ${pass} is not the currently prepared review pass.`, 6);
  }
  const input = options["--input"];
  if (input === undefined) fail("--input is required.", 2);
  const context = repositoryContext(safeBase(state.base));
  if (context.fingerprint !== state.review_fingerprint) {
    fail("The review target changed while the independent reviewer was running.", 6);
  }
  const rawText = readableFile(input, "Review result");
  const report = recordReport(state, rawText, "independent");
  emit({
    status: "review_ready",
    pass,
    report,
    branch: state.branch,
    base: state.base,
    review_scope: state.review_scope,
    completion_scope: state.completion_scope,
    fingerprint: state.review_fingerprint,
    imported: false,
    reused: false,
  });
}

function resolvePass(args) {
  const options = optionParser(args, {
    values: ["--pass", "--status", "--resolution"],
  });
  const pass = parsePositiveInteger(options["--pass"], "--pass");
  const status = options["--status"];
  if (!RESOLUTION_STATUSES.has(status)) {
    fail(`Invalid resolution status: ${JSON.stringify(status)}.`, 2);
  }
  if (state.status !== "review_ready" || state.pass !== pass) {
    fail(`Pass ${pass} is not awaiting a resolution.`, 6);
  }
  const resolutionInput = options["--resolution"];
  if (resolutionInput === undefined) fail("--resolution is required.", 2);
  const resolution = relativeLoopFile(resolutionInput);
  const resolutionText = readableFile(resolution, "Resolution artifact");
  const marker = STATUS_MARKERS[status];
  if (resolutionText.trimEnd().split("\n").at(-1)?.trim() !== marker) {
    fail(`Resolution artifact must end with ${marker} on its own line.`, 6);
  }
  const context = repositoryContext(safeBase(state.base));
  if (
    context.branch !== state.branch ||
    context.baseSha !== state.base_sha ||
    context.mergeBase !== state.merge_base
  ) {
    fail("Branch or base context changed while resolving the review.", 6);
  }
  const changed = context.fingerprint !== state.review_fingerprint;
  if (status === "pass_candidate" && changed) {
    fail("A changed review target requires READY_FOR_REREVIEW and a confirming pass.", 6);
  }
  if (status === "ready_for_rereview" && !changed) {
    fail("READY_FOR_REREVIEW requires a changed review target.", 6);
  }
  let assessed;
  try { assessed = finish(state, status, context.contentFingerprint, resolution); }
  catch (error) { fail(error.message, 6); }
  const resolutions = Array.isArray(state.resolutions) ? state.resolutions : [];
  state = {
    ...assessed,
    status: assessed.status === "convergence_blocked" ? assessed.status : status,
    fingerprint: context.fingerprint,
    head: context.head,
    source_state: context.sourceState,
    last_resolution: resolution,
    resolved_at: new Date().toISOString(),
    resolutions: [
      ...resolutions,
      {
        pass,
        status,
        report: state.report,
        resolution,
        review_fingerprint: state.review_fingerprint,
        resolved_fingerprint: context.fingerprint,
        resolved_at: new Date().toISOString(),
      },
    ],
  };
  writeJson(statePath, state);
  if (state.status === "convergence_blocked") { emit(stopResult(state)); return; }
  emit({
    status,
    pass,
    report: state.report,
    resolution,
    branch: state.branch,
    base: state.base,
    review_scope: state.review_scope,
    completion_scope: state.completion_scope,
    fingerprint: state.fingerprint,
    changed,
  });
}

function assessPass(args) {
  const options = optionParser(args, { values: ["--pass", "--input"] });
  if (parsePositiveInteger(options["--pass"], "--pass") !== state.pass) fail("Assessment pass does not match the active report.", 6);
  const context = repositoryContext(safeBase(state.base));
  if (context.fingerprint !== state.review_fingerprint) fail("Assess the report before editing its target.", 6);
  if (!options["--input"]) fail("--input is required.", 2);
  try { state = assess(state, JSON.parse(readableFile(options["--input"], "Assessment")), context.contentFingerprint); }
  catch (error) { fail(error.message, 6); }
  writeJson(statePath, state);
  emit(state.status === "convergence_blocked" ? stopResult(state) : { status: "assessment_ready", pass: state.pass });
}

function resumeCycle(args) {
  const options = optionParser(args, { values: ["--decision"] });
  if (!options["--decision"]) fail("--decision is required.", 2);
  const context = repositoryContext(safeBase(state.base));
  if (!checkpointContextMatches(state, context)) fail("Restore the stopped branch/base before resuming.", 6);
  try { state = resume(state, relativeLoopFile(options["--decision"])); }
  catch (error) { fail(error.message, 6); }
  state.fingerprint = context.fingerprint;
  writeJson(statePath, state);
  emit({ status: state.status, pass: state.pass, decision: options["--decision"] });
}

function complete() {
  if (state.status !== "pass_candidate") {
    fail("The active review cycle is not a pass candidate.", 6);
  }
  const context = repositoryContext(safeBase(state.base));
  if (context.fingerprint !== state.fingerprint) {
    fail("The review target changed after the pass candidate was recorded.", 6);
  }
  if (!state.report || !existsSync(join(repoRoot, state.report))) {
    fail("The final review report is missing.", 6);
  }
  if (!state.last_resolution || !existsSync(join(repoRoot, state.last_resolution))) {
    fail("The final resolution artifact is missing.", 6);
  }
  const completedAt = new Date().toISOString();
  const entry = {
    version: 1,
    branch: state.branch,
    base: state.base,
    base_sha: state.base_sha,
    merge_base: state.merge_base,
    head: context.head,
    fingerprint: context.fingerprint,
    pass: state.pass,
    review_scope: state.review_scope,
    completion_scope: state.completion_scope,
    cumulative_coverage: state.completion_scope === "full" ||
      state.baseline_checkpoint?.cumulative_coverage === true,
    report: state.report,
    resolution: state.last_resolution,
    summary: ".review-loop-v2/final-summary.md",
    completed_at: completedAt,
  };
  const sameContext = checkpoint.branch === entry.branch &&
    checkpoint.base === entry.base &&
    checkpoint.base_sha === entry.base_sha &&
    checkpoint.merge_base === entry.merge_base;
  checkpoint = {
    version: 1,
    branch: entry.branch,
    base: entry.base,
    base_sha: entry.base_sha,
    merge_base: entry.merge_base,
    last_completed: entry,
    last_full: entry.completion_scope === "full"
      ? entry
      : sameContext
        ? checkpoint.last_full ?? null
        : null,
  };
  writeJson(checkpointPath, checkpoint);
  state = { ...state, ...entry, status: "complete" };
  writeJson(statePath, state);
  emit({
    status: "complete",
    pass: state.pass,
    branch: state.branch,
    base: state.base,
    review_scope: state.review_scope,
    completion_scope: state.completion_scope,
    cumulative_coverage: entry.cumulative_coverage,
    branch_ready: state.completion_scope === "full",
    fingerprint: state.fingerprint,
    report: state.report,
    resolution: state.last_resolution,
    summary: ".review-loop-v2/final-summary.md",
    checkpoint: ".review-loop-v2/checkpoint.json",
  });
}

function showStatus() {
  emit({
    status: state.status ?? "none",
    state: existsSync(statePath) ? ".review-loop-v2/state.json" : null,
    checkpoint: existsSync(checkpointPath) ? ".review-loop-v2/checkpoint.json" : null,
    branch: state.branch ?? null,
    base: state.base ?? null,
    pass: state.pass ?? null,
    review_scope: state.review_scope ?? null,
    completion_scope: state.completion_scope ?? null,
    fingerprint: state.fingerprint ?? null,
    report: state.report ?? null,
    resolution: state.last_resolution ?? null,
  });
}

const [command, ...args] = process.argv.slice(2);
if (command === "prepare") {
  prepare(args);
} else if (command === "record-review") {
  recordReview(args);
} else if (command === "assess") {
  assessPass(args);
} else if (command === "resume") {
  resumeCycle(args);
} else if (command === "resolve") {
  resolvePass(args);
} else if (command === "complete") {
  if (args.length > 0) fail("complete accepts no arguments.", 2);
  complete();
} else if (command === "status") {
  if (args.length > 0) fail("status accepts no arguments.", 2);
  showStatus();
} else {
  fail(
    "Usage: review-loop-state.mjs <prepare|record-review|assess|resolve|resume|complete|status> [options]",
    2,
  );
}
