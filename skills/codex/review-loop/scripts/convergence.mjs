// Canonical portable guard: shared-agent-tools/plugins/claude/review-loop/
// skills/review-loop/scripts/convergence.mjs. Bundle an identical copy with Codex.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const actions = new Set(["fix", "invalid", "defer", "blocked"]);
const requireText = (value, label) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be nonempty text.`);
};
const ledger = state => state.convergence ?? { version: 1, rounds: [], decisions: [] };
const windowRounds = log => log.rounds.filter(round => round.pass > (log.resume_after_pass ?? 0));

function validateChecks(item, required) {
  if (item.checks === undefined && !required) return;
  if (!Array.isArray(item.checks) || !item.checks.length) throw new Error(`Checks for ${item.id} must be a nonempty array.`);
  const ids = new Set();
  for (const check of item.checks) {
    requireText(check.id, `Check id for ${item.id}`);
    requireText(check.evidence, `Check evidence for ${item.id}/${check.id}`);
    if (ids.has(check.id) || !["pass", "fail"].includes(check.result)) throw new Error(`Invalid or duplicate check for ${item.id}/${check.id}.`);
    ids.add(check.id);
  }
}

function knownChecks(rounds, id) {
  const checks = new Map();
  for (const round of rounds) {
    for (const item of [...round.findings, ...(round.resolved ?? [])]) {
      if (item.id === id) for (const check of item.checks ?? []) checks.set(check.id, check);
    }
  }
  return checks;
}

function compareChecks(rounds, item, retainedRounds = rounds) {
  const previous = knownChecks(rounds, item.id);
  const current = new Map(item.checks.map(check => [check.id, check]));
  for (const id of knownChecks(retainedRounds, item.id).keys()) {
    if (!current.has(id)) throw new Error(`Retain and recheck ${item.id}/${id}; dropping a case is not progress.`);
  }
  return {
    progressed: item.checks.filter(c => c.result === "pass" && previous.get(c.id)?.result === "fail").map(c => c.id),
    regressed: item.checks.filter(c => c.result === "fail" && previous.get(c.id)?.result === "pass").map(c => c.id),
  };
}

function outstandingFixes(rounds) {
  const pending = new Map();
  for (const round of rounds) {
    // Read older v2 ledgers without rewriting them. New rounds require explicit closure evidence.
    if (!Array.isArray(round.resolved)) for (const id of round.retired_ids ?? []) pending.delete(id);
    for (const finding of round.findings) {
      if (["fix", "blocked"].includes(finding.action)) pending.set(finding.id, finding);
      else pending.delete(finding.id);
    }
    for (const item of round.resolved ?? []) pending.delete(item.id);
  }
  return pending;
}

export function stopCycle(state, reason, evidence, phase) {
  const log = ledger(state);
  return { ...state, status: "convergence_blocked", convergence: { ...log,
    stop: { pass: state.pass, reason, evidence, phase, recorded_at: new Date().toISOString() } } };
}

export function assess(state, input, contentFingerprint) {
  if (state.status !== "review_ready") throw new Error("Only a review_ready pass can be assessed.");
  if (!input || !Array.isArray(input.findings)) throw new Error("Assessment requires a findings array (empty for No findings).");
  const resolved = input.resolved ?? [];
  if (!Array.isArray(resolved)) throw new Error("resolved must be an array of verified issue closures.");
  const log = ledger(state);
  const existing = log.rounds.find(round => round.pass === state.pass);
  if (existing) {
    if (!existing.status && existing.before === contentFingerprint && JSON.stringify(existing.findings) === JSON.stringify(input.findings) && JSON.stringify(existing.resolved ?? []) === JSON.stringify(resolved) && input.stop_reason === undefined) return state;
    throw new Error("This pass already has an assessment; preserve it and resolve the recorded findings.");
  }
  const ids = new Set();
  for (const f of input.findings) {
    if (!f || typeof f !== "object") throw new Error("Each finding must be an object.");
    requireText(f.id, "Finding id");
    requireText(f.evidence, `Evidence for ${f.id}`);
    if (ids.has(f.id)) throw new Error(`Duplicate finding identity: ${f.id}`);
    ids.add(f.id);
    if (!/^P[0-3]$/.test(f.priority) || !actions.has(f.action)) throw new Error(`Invalid priority/action for ${f.id}`);
    if (f.new_evidence !== undefined) requireText(f.new_evidence, `New evidence for ${f.id}`);
    if (f.conflicts_with !== undefined && (!Array.isArray(f.conflicts_with) || f.conflicts_with.some(id => typeof id !== "string" || !id.trim()))) throw new Error("conflicts_with must contain finding identities.");
    if (f.action === "defer" && (state.pass < 3 || /^P[01]$/.test(f.priority))) throw new Error("Only pass-3-or-later P2/P3 may be deferred.");
    validateChecks(f, f.action === "fix");
    if (f.action === "fix" && !f.checks.some(check => check.result === "fail")) throw new Error(`A required fix needs a failing check: ${f.id}.`);
  }
  const rounds = windowRounds(log).filter(round => round.pass < state.pass && round.status);
  // A user decision resets cycle detection, not unfinished work or its verification obligations.
  const obligationRounds = log.rounds.filter(round => round.pass < state.pass);
  const outstanding = outstandingFixes(obligationRounds);
  const closureIds = new Set();
  for (const item of resolved) {
    if (!item || typeof item !== "object") throw new Error("Each resolved entry must be an object.");
    requireText(item.id, "Resolved issue id");
    if (ids.has(item.id) || closureIds.has(item.id) || !outstanding.has(item.id)) throw new Error(`Resolved issue must uniquely identify an outstanding fix: ${item.id}.`);
    closureIds.add(item.id);
    validateChecks(item, true);
    compareChecks(rounds, item, obligationRounds);
    if (item.checks.some(check => check.result !== "pass")) throw new Error(`Resolved issue still has a failing check: ${item.id}.`);
  }
  const previous = rounds.at(-1);
  const fixes = input.findings.filter(f => f.action === "fix");
  const closed = [...outstanding.keys()].filter(id => closureIds.has(id) || input.findings.some(f => f.id === id && ["invalid", "defer"].includes(f.action)));
  const issueProgress = fixes.map(f => {
    const comparison = compareChecks(rounds, f, obligationRounds);
    const closedAt = rounds.findLast(r => r.resolved?.some(item => item.id === f.id))?.pass ?? 0;
    const attempts = rounds.filter(r => r.pass > closedAt && r.findings.some(old => old.id === f.id && old.action === "fix"));
    const prior = attempts.findLast(r => r.issue_progress?.some(item => item.id === f.id))?.issue_progress.find(item => item.id === f.id);
    const progressed = comparison.progressed.length > 0 && comparison.regressed.length === 0;
    return { id: f.id, attempt_passes: attempts.map(r => r.pass).concat(state.pass),
      stalled_attempts: !attempts.length || progressed ? 0 : (prior?.stalled_attempts ?? Math.max(0, attempts.length - 1)) + 1,
      progressed_checks: comparison.progressed, regressed_checks: comparison.regressed,
      failing_checks: f.checks.filter(c => c.result === "fail").map(c => c.id) };
  });
  const stagnant = fixes.length && outstanding.size && !closed.length && !issueProgress.some(i => i.progressed_checks.length && !i.regressed_checks.length) ? (previous?.stagnant ?? 0) + 1 : 0;
  const round = { pass: state.pass, report: state.report, before: contentFingerprint,
    findings: input.findings, resolved, issue_progress: issueProgress, stagnant, retired_ids: closed };
  const next = { ...state, convergence: { ...log, rounds: [...log.rounds.filter(r => r.pass !== state.pass), round] } };
  if (input.stop_reason !== undefined) {
    requireText(input.stop_reason, "stop_reason");
    requireText(input.stop_evidence, "stop_evidence");
    return stopCycle(next, input.stop_reason, [input.stop_evidence], "assessment");
  }
  for (const id of outstanding.keys()) {
    if (!ids.has(id) && !closureIds.has(id)) throw new Error(`Recheck outstanding issue ${id}: include it in findings or resolved, even when the reviewer omits it.`);
  }
  for (const f of fixes) {
    if (f.conflicts_with?.length) return stopCycle(next, "A proposed fix reverses or conflicts with an earlier resolution.",
      [{ id: f.id, conflicts_with: f.conflicts_with, evidence: f.evidence }], "assessment");
    const recurring = rounds.filter(r => r.findings.some(old => old.id === f.id && ["fix", "invalid", "defer"].includes(old.action)));
    const progress = issueProgress.find(item => item.id === f.id);
    const continuingProgress = outstanding.has(f.id) && progress.progressed_checks.length && !progress.regressed_checks.length;
    if (recurring.length && !f.new_evidence && !continuingProgress) return stopCycle(next, "A resolved finding is being reopened without new evidence.",
      [{ id: f.id, earlier_passes: recurring.map(r => r.pass), current_pass: state.pass, evidence: f.evidence }], "assessment");
  }
  const regression = issueProgress.find(item => item.regressed_checks.length);
  if (regression) return stopCycle(next, "A previously passing issue check is failing again.", [regression], "assessment");
  const stalled = issueProgress.find(item => item.stalled_attempts >= 2);
  if (stalled) return stopCycle(next, "An issue has two successive attempts without verified progress on its failing checks.", [stalled], "assessment");
  return next;
}

export function finish(state, status, contentFingerprint, resolution) {
  const log = ledger(state);
  const round = log.rounds.find(r => r.pass === state.pass);
  if (!round || round.status) throw new Error("Assess this report before resolving it; each pass resolves once.");
  if (state.status !== "review_ready") throw new Error("The review is stopped; obtain a user decision before continuing.");
  const changed = round.before !== contentFingerprint;
  if (status === "pass_candidate" && (changed || round.findings.some(f => ["fix", "blocked"].includes(f.action)))) throw new Error("A changed target or required fix cannot be a pass candidate.");
  if (status === "ready_for_rereview" && (!changed || round.findings.some(f => f.action === "blocked"))) throw new Error("Rereview requires changed content and no blocked findings.");
  const updated = { ...round, after: contentFingerprint, status, resolution };
  const next = { ...state, convergence: { ...log, rounds: log.rounds.map(r => r === round ? updated : r) } };
  if (status === "ready_for_rereview") {
    const repeated = windowRounds(log).filter(r => r.before === contentFingerprint || r.after === contentFingerprint);
    if (repeated.length) return stopCycle(next, "Fixes returned the code to a previously reviewed content state.",
      [{ earlier_passes: repeated.map(r => r.pass), current_pass: state.pass, fingerprint: contentFingerprint }], "resolution");
  }
  return next;
}

export function resume(state, decisionPath) {
  if (state.status !== "convergence_blocked") throw new Error("Only a convergence stop can be resumed with this command.");
  const decision = readFileSync(decisionPath, "utf8");
  requireText(decision, "User decision record");
  const log = ledger(state);
  const decisions = [...log.decisions, { pass: state.pass, stop: log.stop, decision: decisionPath,
    sha256: createHash("sha256").update(decision).digest("hex"), recorded_at: new Date().toISOString() }];
  // The user chooses the next attempt; retain history and restart detection from this baseline.
  return { ...state, status: "ready_for_rereview", convergence: { ...log, decisions,
    stop: null, resume_after_pass: state.pass } };
}

export function stopResult(state) {
  return { status: "convergence_blocked", pass: state.pass, branch_ready: false,
    report: state.report, resolution: state.last_resolution ?? null,
    reason: state.convergence.stop.reason, evidence: state.convergence.stop.evidence,
    decision_required: true, state: ".review-loop-v2/state.json" };
}
