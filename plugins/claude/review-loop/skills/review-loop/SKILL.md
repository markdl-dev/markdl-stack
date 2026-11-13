---
name: review-loop
description: Run convergence-aware review and fix cycles from Claude Code with a fresh Codex reviewer each pass. Use for /review-loop or a request to detect review cycles and stalled progress. Validate findings, track resolutions, verify fixes, and stop with evidence for a user decision when progress stalls.
---

# Independent Review Loop

This is the convergence-aware Review Loop, promoted from v2. Keep artifacts and
checkpoints under `.review-loop-v2/` so existing cycles remain readable. Legacy
v1 state under `.review-loop/` stays separate.

Keep Claude as the stateful implementer and fixer. Start a fresh, read-only Codex reviewer for every pass. Persist handoffs under `.review-loop-v2/`; never copy review text between terminals.

Use the configured Codex reviewer model and login by default. Model, reasoning,
and account overrides are optional and remain pinned within an active cycle.

Use the bundled [resolve-review](../resolve-review/SKILL.md) skill to process every Codex report. Read that skill completely
before the first pass, and read [references/convergence-policy.md](references/convergence-policy.md)
before comparing findings or continuing passes.

## Arguments

Raw invocation:

```text
$ARGUMENTS
```

Accept:

- `/review-loop` — auto-detect scope and use the configured account default, or the current Codex login when none is configured.
- `--account current|<profile>` — select the normal Codex login or a named isolated profile; later calls inherit the cycle's account.
- `--model <id>` — optionally override the Codex reviewer model for a new cycle.
- `--reasoning <effort>` — optionally override reviewer reasoning effort; support depends on the model.
- `/review-loop main` — use the positional base branch.
- `/review-loop --account work --base develop` — select an optional profile and an explicit base branch.
- `--scope auto` — use the state-aware default.
- `--scope uncommitted` — review staged, unstaged, and untracked changes only.
- `--scope since-last` — review commits and working-tree changes after the last compatible completed checkpoint.
- `--scope full` — review the complete proposed change from the base through the current working state.
- `--final` — force full scope and require a full-branch completion result.
- `--max-passes N` — optional user-selected total pass budget (positive integer); no default cap.

Reject unknown options and conflicting scope arguments. Never treat option text as shell syntax.

Let the runner select the default; preserve an explicit user account choice.
Read [accounts.md](references/accounts.md) for initial login, account status, storage
isolation or an account mismatch. The runner pins the selected login across an active
cycle; later helper calls can omit `--account`. Use the same base throughout.

## Scope Policy

Keep Git state separate from review scope:

- **Git state:** committed, uncommitted, or mixed.
- **Review scope:** full, uncommitted, or since-last.
- **Completion scope:** full or incremental.

Use `auto` unless the user explicitly chooses another scope or asks for final PR, merge, or release readiness.

In auto mode:

1. Reuse `.review-loop-v2/checkpoint.json` only when its branch, base, base revision, merge base, and reviewed lineage or content still match.
2. When the checkpoint covers current `HEAD`, review only staged, unstaged, and untracked changes.
3. When compatible reviewed `HEAD` is an ancestor of current `HEAD`, review only later commits plus current working-tree changes.
4. When all proposed changes are uncommitted, use the uncommitted Codex target but treat it as full coverage.
5. When the checkpoint is missing, stale, rebased, based on a different base revision, or otherwise ambiguous, choose full scope automatically. Do not interrupt the loop to ask which scope to use.
6. Keep the active scope pinned across all passes in the same cycle.

Force full scope without asking when:

- the user says final, PR-ready, merge-ready, release-ready, or equivalent;
- changes affect authentication, authorization, permissions, security posture, persisted schemas, migrations, destructive behavior, public APIs, shared build/dependency infrastructure, or broad cross-cutting contracts; or
- repository history or base compatibility cannot be established safely.

An incremental completion certifies only the reviewed delta. Never call it full-branch or PR-ready. Run `/review-loop --final` for the final aggregate gate.

Review scope does not narrow verification scope. Always inspect affected callers and dependencies, perform circular-fix analysis across the repository, and run the complete relevant project checks.

## Non-Negotiable Finding Policy

Apply the following policy after validating each finding:

- **Passes 1 and 2:** Attempt to fix every valid or partially valid P0, P1, P2, and P3 finding. Do not defer P2/P3 merely because they are nonblocking.
- **Pass 3 and later:** P0/P1 remain mandatory. Decide whether each valid P2/P3 should be fixed or deferred based on correctness, risk, scope, evidence, churn, and verification cost.
- Never defer a P2/P3 required by tests, acceptance criteria, security, data integrity, user-visible correctness, project standards, or safe resolution of a P0/P1.
- Record a concrete rationale and recommended follow-up for every deferral.
- Keep the safety and ambiguity gates in `resolve-review` active on every pass.

When a finding fingerprint appeared in an archived Claude resolution, preserve its justified disposition unless new evidence or changed code invalidates it. Claude may inspect prior resolution artifacts for this comparison; never give the ledger or prior resolution arguments to Codex.

## Phase 1: Preflight

1. Confirm the current directory is inside a Git repository.
2. Read `CLAUDE.md`, `AGENTS.md`, active specifications/tasks, and referenced review policy.
3. Determine the required build, test, lint, type-check, and acceptance commands.
4. Run the relevant checks before pass 1. Fix in-scope failures when safe; otherwise return `BLOCKED`.
5. Confirm `codex --version` succeeds. Do not use `claude -p`; stay in the current interactive Claude session.
6. Locate this skill's `scripts/run-review-pass.mjs`. Do not copy or rewrite it in the project.
7. Decide whether the risk rules require `--scope full`; otherwise retain the user's scope or `auto`.

Do not commit, amend, push, create a pull request, or change the base branch unless the user separately authorizes it.

## Phase 2: Run a Fresh Codex Pass

Before each pass, tell the user which pass is starting. Then run:

```bash
node <skill-directory>/scripts/run-review-pass.mjs [--account current|<profile>] [--model <id>] [--reasoning <effort>] [--base <branch>] [--scope <scope> | --final] [--max-passes N]
```

The script:

- detects committed, uncommitted, or mixed Git state;
- validates and reuses a successful review checkpoint when safe;
- automatically selects and announces full, uncommitted, or since-last scope;
- falls back to full scope instead of asking when history is ambiguous;
- starts a new read-only `codex review` process;
- writes `.review-loop-v2/pass-N-codex.md`;
- records scope, branch, base, revisions, reviewed origin, and content fingerprints in `.review-loop-v2/state.json`; and
- emits a final `REVIEW_LOOP_RESULT` JSON line.

Handle runner results:

- `review_ready` — process the report. Reuse it when `reused: true`.
- `already_complete` — stop; report whether the saved completion is incremental or full.
- `completion_ready` — do not start another review; complete the existing pass candidate.
- `convergence_blocked` — write the convergence summary and return the decision to the user.
- `max_passes_reached` — the user-selected budget is exhausted; ask for a new budget.
- Any error or incompatible active-cycle message — return `BLOCKED` with the exact reason.

Keep the base and reviewed target consistent throughout a cycle:

- Reuse the same resolved base for the pass, `--assess`, `--resolve`, `--resume`, and `--mark-complete`. When starting with an explicit `--base`, pass it on later calls too. Omitting it fails if automatic detection selects a different base.
- Keep the reviewed source state unchanged while Codex runs. A change to that state discards the pass; local review artifacts remain excluded from the target.
- Run `--assess` on the target exactly as reviewed, before any edit, including new tests and formatting ("Assess the report before editing its target"). Base its failing checks on existing tests or a source inspection with expected and observed behavior; write new tests after `assessment_ready`.
- End the resolution file with its status marker in capitals (`READY_FOR_REREVIEW`, `PASS_CANDIDATE`, `BLOCKED`) as the last line.

Do not give Codex Claude's prior resolution arguments or the review ledger. Every pass must independently inspect its selected diff, current code, project guidance, and tests.

## Phase 3: Process the Report

Use the bundled `resolve-review` skill as if invoked with:

```text
/resolve-review --file <report-path> --auto
```

Follow its validation, impact analysis, routing, verification, pass-aware priority policy,
resolution persistence, and safety boundaries. Before edits, save the convergence assessment
with current per-issue checks and verified closures from the convergence policy, then run:

```bash
node <skill-directory>/scripts/run-review-pass.mjs --assess .review-loop-v2/pass-N-assessment.json
```

Continue only on `assessment_ready`. `convergence_blocked` stops edits and new reviewers.
The bundled processor performs this assessment when invoked in automated loop mode;
the orchestrator must not perform it a second time.

Require `.review-loop-v2/pass-N-claude-resolution.md` and one status:

- `READY_FOR_REREVIEW` — fixes were applied and checks pass.
- `PASS_CANDIDATE` — the active pass policy is satisfied and checks pass.
- `BLOCKED` — user input, failed verification, or mandatory work remains.

The processor records its resolution through the runner:

```bash
node <skill-directory>/scripts/run-review-pass.mjs \
  --resolve .review-loop-v2/pass-N-claude-resolution.md \
  --status <ready_for_rereview|pass_candidate|blocked>
```

The helper can return `convergence_blocked` after detecting repeated content. Its status
takes precedence over the resolution marker. Never write state by hand. If the processor
omits its artifact or transition, return `BLOCKED`; do not guess.

## Phase 4: Continue or Complete

- On `READY_FOR_REREVIEW`, rerun all relevant checks, then start the next fresh Codex pass with the same invocation scope. The runner pins the active cycle even when `auto` was requested.
- On `BLOCKED` or `convergence_blocked`, stop and present the exact decision or failure.
  For convergence, follow the summary and decision procedure in the convergence policy.
  Only after an explicit user decision, save `.review-loop-v2/decision-N.md` and run
  `node <skill-directory>/scripts/run-review-pass.mjs --resume .review-loop-v2/decision-N.md`.
  Then run a fresh pass; history remains and convergence checks apply again.
- On `PASS_CANDIDATE`, verify the current diff and all required checks once more, then run:

```bash
node <skill-directory>/scripts/run-review-pass.mjs [--base <branch>] --mark-complete
```

The completion command verifies the report, resolution artifact, branch, base, and fingerprints; marks `.review-loop-v2/state.json` complete; and updates the durable `.review-loop-v2/checkpoint.json`.

After successful completion, write `.review-loop-v2/final-summary.md` and report:

- `INCREMENTAL_COMPLETE` when `completion_scope` is `incremental`;
- `FULL_COMPLETE` when `completion_scope` is `full`.

There is no default maximum pass. Continue while corrections make evidenced progress;
stop for the convergence conditions in the policy. If an explicitly requested budget is
exhausted after fixes, ask for a new budget without claiming completion. Unresolved P0/P1
and missing confirming review still block completion. Only explicitly justified
pass-3-or-later P2/P3 deferrals with green checks may remain.

## Completion Gate

Complete only when:

- every valid P0/P1 is fixed;
- passes 1 and 2 leave no valid unresolved P2/P3;
- every pass-3-or-later P2/P3 is fixed or explicitly deferred with rationale;
- build, tests, lint/type checks, and specification acceptance checks pass;
- the final review pass required no further mandatory fixes;
- review and resolution artifacts match the current branch and fingerprints; and
- the completion checkpoint was written successfully.

Report:

- selected review and completion scopes, including the automatic selection reason;
- passes run;
- findings fixed, invalidated, deferred, or blocked by priority;
- verification commands and results;
- deferred P2/P3 rationales;
- final branch/base and fingerprints;
- whether the result is full-branch ready; and
- paths to the final Codex report, Claude resolution, summary, and checkpoint.

## Manual Fallback

The existing workflow remains valid:

```text
/resolve-review <pasted review feedback>
```

It retains its original confirmation gates. A saved report can also be processed manually with `/resolve-review --file <path>`.
