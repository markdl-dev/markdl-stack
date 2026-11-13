---
name: continue-spec-development
description: Reconstruct and continue an existing Spec Kit feature by reporting artifact and task state, selecting the correct next phase, using adaptive direct delegation for independent work, verifying results, and keeping tasks.md truthful. Use when the user invokes /continue-spec-development or $continue-spec-development, asks to resume a feature, requests current Spec Kit status, or wants to implement a specific phase or task set.
---

# Continue Spec Kit Development

Reconstruct the feature from durable project artifacts before acting. Report the
current state first. Reuse the phase or task scope already authorized in the
conversation and continue it after the status report. If scope remains unclear,
ask one concise question after presenting the available next actions.

Do not expand beyond the requested phase or task set unless the user explicitly
asks to finish a broader scope.

## 1. Resolve The Project And Active Feature

1. Read applicable `AGENTS.md`, `CLAUDE.md`, repository documentation, and
   project-specific verification instructions.
2. Confirm `.specify/` exists and inspect
   `.specify/memory/constitution.md`.
   Resolve the intended project root using installed behavior, including a valid
   `SPECIFY_INIT_DIR` or a nested project's `.specify/` marker.
3. Prefer `specify version --features --json` and
   `specify integration status --json` when supported.
   Read project-recorded versions, integration settings, and relevant overrides,
   presets, and hooks separately. Select native instructions for the active
   harness; a different default integration or modified template is not by
   itself permission to switch, upgrade, or repair it.
4. Resolve the feature from the user's named feature or source-to-feature
   mapping, then verify it against the installed native directory resolver.
   In Spec Kit 0.15.1, `SPECIFY_FEATURE_DIRECTORY` takes precedence over
   `.specify/feature.json`; `SPECIFY_FEATURE` and Git branches are labels, not
   alternative directory selectors. Flag conflicts and bind execution to the
   intended directory instead of silently using stale session state. For other
   versions, inspect their installed resolver rather than assuming this order.
5. Use the platform-appropriate helper identified by the installed native phase.
   For reconstruction, use its read-only paths mode, such as
   `check-prerequisites.sh --paths-only --json` in 0.15.1. This avoids requiring
   `plan.md` and prevents persistence to `feature.json`. If no read-only mode is
   available, inspect metadata and files directly. Do not run setup, normal
   prerequisite checks that persist state, or mutating hooks for a status request.
6. If the active selector is absent or stale, inspect existing feature artifacts
   and any supplied source reference. Missing selection does not imply that a
   new feature is needed. If more than one feature could be intended, report the
   candidates and ask the user to select one. Never guess when that could modify
   the wrong artifacts.
7. When engine-managed runs exist, inspect `specify workflow status --json` when
   supported and correlate relevant runs with their saved inputs and artifacts.
   Record the run ID, status, pending step, and review gates; choose execution
   mode in section 4 before acting.

Recommend `/start-spec-feat` in Claude Code or `$start-spec-feat` in Codex when
no matching existing feature can be found, not merely when active state is absent.

## 2. Reconstruct Feature State

Inspect the feature directory and classify:

- `spec.md`: requirements and intended behavior;
- `plan.md`: technical design and constraints;
- supporting research, contracts, data models, quickstarts, and checklists;
- `tasks.md`: phases, dependencies, completed tasks, pending tasks, and
  acceptance criteria;
- implementation and tests already present in the repository;
- relevant workflow run state and unresolved findings.

Read source provenance when present, whether it points to a roadmap chunk, a
standalone plan, or another source. Report material source drift without silently
replacing accepted feature scope. A source planning document is not automatically
the native technical `plan.md` required for implementation.

Map missing or stale artifacts to the appropriate native phase:

| State | Next phase |
| --- | --- |
| No specification | specify |
| Material ambiguity | clarify |
| No current technical plan | plan |
| Domain requirements need a quality checklist | checklist, then evaluate it |
| No actionable task breakdown | tasks |
| Spec, plan, and tasks may disagree | analyze |
| Tasks and applicable quality gates are ready | implement |
| Planned implementation appears complete | converge |

Do not infer task completion only because a similarly named file exists.
Clarify and checklist are conditional gates, not mandatory stops after every
artifact. Analyze needs complete spec, plan, and tasks. An incomplete checklist
needs evaluation or resolution, not another checklist-generation pass.

## 3. Report Status Before Work

Include:

- active feature and path;
- selected integration, constitution status, CLI and project versions, and
  relevant customization or compatibility findings;
- artifact presence and important drift;
- phase-level completed and total task counts;
- current phase, dependencies, blockers, and acceptance criteria;
- checklist completion, unresolved analysis findings, and any relevant workflow
  run's pending step or review gate;
- the recommended next action and any valid alternatives.

Keep the report proportional to the feature. List individual tasks only when the
user needs them to choose scope or understand a blocker.

## 4. Select And Execute The Requested Scope

1. Treat a status-only request as read-only.
2. Choose between direct native phase execution and engine-managed continuation.
   Direct phase calls do not advance a persisted workflow run. For a requested
   run resume, inspect its remaining steps and gates before using
   `specify workflow resume <run-id>` with installed syntax. Resume may execute
   all remaining steps, so use it only when that scope is authorized. If a narrow
   phase request overlaps a paused or failed run, explain the mismatch and
   resolve execution mode before changes; avoid later replay of manual work.
3. Let the main agent invoke the selected integration's native skill or command
   for artifact phases and implementation. Read the actual installed instructions
   and preserve their checklist checks and pre/post hook behavior. Carry forward
   existing explicit authorization; optional hooks grant no additional scope,
   and mandatory hooks conflicting with the user's boundary need resolution.
4. Before implementation, require usable `spec.md`, `plan.md`, and `tasks.md`,
   satisfied task dependencies, and the installed implementation readiness
   checks. Evaluate existing requirements checklists against artifacts; generating
   them is not completion. Honor native handling of unfinished checklists and
   any explicit waiver already given for the same state. Run analyze when
   consistency is unknown or artifacts changed materially; resolve blocking
   findings within authorized scope or report the required prerequisite action.
   An analysis run alone does not establish that its findings were resolved.
5. Give native implement the authorized phase, user story, or exact task IDs,
   dependency constraints, and stopping condition before delegating any work.
   Its default is all tasks; a partial request overrides that default and must
   leave out-of-scope tasks untouched. Do not remove tasks to manufacture scope.
6. Stop at the requested boundary after verification unless the user asked for a
   broader autonomous run.

## 5. Use Adaptive Direct Delegation

The main agent owns phase transitions, shared artifacts, integration decisions,
and the final verification.

Delegate when one or more of these conditions apply:

- independent task groups have clear file or component ownership;
- parallel exploration materially reduces elapsed time;
- tests, logs, or repository searches would flood the main context;
- separate frontend, backend, data, infrastructure, or documentation work has
  stable interfaces;
- a fresh-context reviewer would improve confidence.

Keep work in the main context when tasks share substantial state, modify the same
files, require frequent cross-domain decisions, or are too small to justify
handoff overhead.

Delegate directly from the main agent. Do not route work through a PM subagent
that must spawn more subagents. Reuse suitable existing agents; do not create
permanent agents automatically. When subagents are unavailable, complete the
work in the main context.

Every delegation must include:

- exact task IDs and requested outcome;
- relevant spec, plan, and acceptance-criteria paths;
- allowed ownership boundaries and dependencies;
- project conventions and required verification;
- a request for changed files, commands run, results, and blockers.

When multiple agents run, keep `tasks.md` under main-agent ownership to avoid
conflicting updates. User instructions to avoid, require, or aggressively use
subagents override this default.

## 6. Verify And Update Task State

1. Review the actual diff and tool results for every claimed completion.
2. Derive verification commands from project instructions, CI configuration,
   package scripts, Makefiles, and established tooling. Do not invent generic
   commands when the repository defines its own.
3. Run focused tests for the changed scope, then broader build, integration, E2E,
   or visual checks when the risk warrants them.
4. Check the phase acceptance criteria explicitly.
5. Mark a task `[x]` only after its implementation and required verification
   succeed. Leave failed, skipped, or partially completed tasks unchecked and
   record the reason.
6. Use a fresh verifier after high-risk work or multi-agent implementation when
   a separate context would materially improve review quality.
7. Run native converge when implementation has run and feature completion or
   convergence is inside the authorized scope; otherwise recommend it as the
   next phase. Check that the installed phase is available. Preserve its
   append-only task contract and report its outcome separately from code review.
   If it appends work, keep those tasks pending and repeat implementation only
   within authorized scope, then reconverge. Stop automatic cycles when the same
   gap remains without progress and report the unresolved evidence or blocker.

## 7. Report The Result

Report:

- tasks completed, still pending, or blocked;
- files created or modified;
- verification commands and pass/fail results;
- acceptance criteria met or unmet;
- subagents used and their ownership;
- artifact or implementation drift found;
- native phase or workflow execution mode, relevant run state, and checklist,
  analysis, and convergence outcomes when applicable;
- the next phase and whether its dependencies are satisfied.

State failures and skipped verification plainly. Do not claim the phase is
complete while required checks fail. Do not create a commit, push, or pull
request unless the user asks.

## Guardrails

- Preserve user changes and existing project conventions.
- Do not overwrite generated artifacts blindly; inspect and reconcile drift.
- Do not upgrade Spec Kit, force-refresh managed files, or replace the
  constitution without approval.
- Do not let delegated summaries replace direct verification.
- Do not mark tasks complete merely because an agent reports success.
