---
name: figure-it-out
description: "Design and execute an evidence-backed workflow for an uncertain new project, an ambitious change, or a migration. Define success, resolve unknowns, verify small units, and keep a decision trail. Use for $figure-it-out, /figure-it-out, or 'figure it out'."
disable-model-invocation: true
---

# Figure it out

Adapted from Lauren Tan's (poteto) pstack skill. See [PROVENANCE.md](PROVENANCE.md)
for its origin and changes. This adaptation remains under evaluation.

Design the workflow before doing the work. Deliver a bounded plan, evidence for
its decisions, and verified results within the user's requested scope. The core
workflow below runs without pstack or other skills. Local skills are conditional
integrations, not prerequisites for ordinary planning or execution.

## 1. Resolve the assignment

Read the request, named sources, applicable `AGENTS.md` / `CLAUDE.md`, current
changes, and existing project artifacts. For an existing Spec Kit feature, use
its accepted specification, technical plan, and task state as the source of
truth; reconcile the workflow with them rather than creating competing tasks.

State the requested outcome and execution boundary:

- **Read-only:** investigation, preview, or status. Keep the plan and findings in
  the reply; leave files and workflow state untouched.
- **Planning:** discover the product, define the MVP, assess architecture, or
  prepare a roadmap. Create planning artifacts when within the request; end at
  the plan and next invocation.
- **Specification:** create or clarify the selected feature specification.
- **Implementation:** build the named feature, migration, or task set and verify
  it. Carry forward any already-authorized broader run.

For "start a project" without build instructions, begin with planning. Record the
target users, problem, core value loop, constraints, MVP inclusions and exclusions,
and unresolved product choices. A planning request does not authorize production
code, dependency installation, or project setup. A requested scratch experiment
can settle an unknown without becoming production implementation.

### Never block on the human

The human sets product direction and reviews execution asynchronously. Within
the authorized scope, make reasonable decisions and carry reversible work through
to a reviewable result. Choose routine implementation details yourself, record
assumptions that matter, and explain the result. Continue through authorized
steps and phases without asking the human to approve each transition again.

Research observable technical facts and test uncertain approaches with small
experiments. When a missing product decision changes scope or acceptance
criteria, or a required authorization is missing, ask for that specific decision.
Continue independent authorized work while waiting, and preserve prior choices
and authorization.

When you discover a problem within scope, record it and correct it in the next
appropriate unit. Obtain any missing authorization before irreversible actions
or external messages. Keep read-only and planning boundaries intact; reversible
work must still fit the requested outcome and execution mode.

**Exit:** a named outcome, mode, source of truth, and stopping boundary.

## 2. Frame success and risk

Write observable acceptance predicates: the action or input, expected result,
observation method, and evidence to retain. A planning predicate checks source
coverage, explicit exclusions, decisions, and a usable first slice; an
implementation predicate checks behavior on the real product. Label assumptions
and estimates separately from measured facts.

Count rough work units, prerequisites, and unresolved unknowns. Estimate effort
only when useful and state the uncertainty. Select rigor by consequence:

| Rigor | Use when | Evidence |
| --- | --- | --- |
| Light | Small, reversible, understood work | Focused acceptance check and a compact plan |
| Standard | New capability or several dependent units | Baseline where meaningful, unit gates, integration checks, decision trail |
| Elevated | Data integrity, security, public contracts, broad migrations, or costly architecture choices | Failure-path evidence, recovery plan where relevant, aggregate acceptance, and independent verification when available |

Present the frame and important tradeoffs before a long execution. Use a human
checkpoint when the user or project requires it, or a material product choice
remains unresolved. Existing authorization permits the corresponding next step.

**Exit:** scope, predicates, rigor, and blocking decisions are explicit.

## 3. Design the workflow

Inspect project conventions and relevant adopted standards. When a local skill
would materially improve this task, read only its applicable route in
[references/integrations.md](references/integrations.md) and then the actual
installed skill. Keep the chosen product, stack, and viable project conventions.

For a costly architecture decision, compare plausible alternatives against the
predicates and constraints. Use a small experiment when it can settle the
unknown; record tradeoffs and the chosen boundary. Routine changes need no design
bakeoff. Prefer core types, runnable scaffolding, and the smallest verification
setup before broad feature work. For a new product, aim for an early thin vertical
slice that exercises its core value loop.

Break the work into independently verifiable units. For each unit record its
outcome, dependencies, changed area, acceptance gate, and recovery action when
needed. Sequence riskiest unknowns first within prerequisite constraints. Attach
decision gates to the units they block instead of blocking the entire project.

Keep a compact task list. Reuse established plan and log locations; otherwise use
`docs/plans/<task-slug>.md` and `.audit/<task-slug>.tsv`. Planning artifacts supplement
native Spec Kit artifacts; they never replace `spec.md`, `plan.md`, or `tasks.md`.
For read-only work, the reply is the plan and decision record.

When the selected rigor calls for a file-backed trail and writes are in scope,
read [references/decision-trail.md](references/decision-trail.md). Record framing
and design decisions as they happen, including planning-only runs. Continue the
same trail during execution and verification.

Delegate only when permitted and useful across clear ownership boundaries.
Give writers separate worktrees or disjoint files and a concrete acceptance
contract. The main agent owns shared plans, logs, integration, and task state.
Review actual delegated artifacts and checks before accepting them. Keep small
or tightly coupled work in the main context.

**Exit:** a reviewable phase list with dependencies and verifiable unit gates.
Stop here when the requested deliverable is the plan. For a Spec Kit handoff,
follow the integration's phase boundary and return its exact next invocation.

## 4. Execute and measure

For each authorized unit:

1. State the hypothesis and expected observation.
2. Capture the pre-change baseline when it makes a meaningful comparison. For
   greenfield behavior, record its absence and expected new result instead.
3. Make the smallest complete change consistent with the selected design.
4. Run the unit gate against the artifact and relevant failure paths. Derive
   commands from project tooling and required checks. Use inspection for prose
   and plans; add tests or a harness when they prove material behavior.
5. Classify the predicate as `VERIFIED`, `NOT VERIFIED`, or `INCONCLUSIVE`.
   A successful build alone proves only the build. Investigate unexpectedly easy
   passes and confirm the observation could detect the relevant failure.
6. Keep a successful unit. Correct or revert an unsuccessful change within its
   ownership boundary while preserving pre-existing work. Fix a demonstrated
   faulty gate as a separate explained change, preserving the accepted outcome.
7. Record the decision and evidence before starting the next dependent unit.

When repeated attempts reach the same failure without new evidence, stop that
loop, revisit the premise or gate, and report the unresolved decision. Continue
unaffected authorized units. Record recurring lessons as checks or constraints
when that prevents a demonstrated recurrence.

**Exit:** each attempted unit has an artifact-backed verdict and truthful state.

## 5. Review, verify, and hand back

Check the combined result against the original predicates on the real product
and inspect the final diff. Run the required project checks at the appropriate
scope. An independent verifier is useful for high-risk or delegated work; if
unavailable, disclose that verification used the implementer's context.

Audit the decision trail against the artifacts and tool results available in
this run. Check that evidence resolves and supports each verdict. Supersede an
incorrect row with a correction; preserve history. Mark Spec Kit tasks complete
only after their required implementation and verification succeed.

When a review loop is explicitly requested or required by project guidance, use
the active host's installed `review-loop` or the user's chosen review skill
through [references/integrations.md](references/integrations.md). Honor its
independence, scope, convergence, checkpoint, and completion rules. Finalize any
plan, trail, and task edits included in its target before the confirming pass;
record the loop outcome in its own summary. A later edit to reviewed files
invalidates that completion and requires the loop's fresh verification. Ordinary
task verification remains separate from review-loop completion.

Report the designed workflow, rigor and reason, completed scope, predicate
verdicts with evidence, plan/log/review paths, unmet gates, and the next action.
Distinguish a verified increment from a verified whole and an approved plan from
an implemented product. Honor the requested stopping boundary.

## Integration boundaries

Read-only and planning modes retain their boundaries through every integration.
Use existing standards for this project without silently applying snapshots,
activating draft profiles, migrating packages, or changing canonical standards.
Commits, pushes, PRs, publishing, external messages, and destructive operations
follow the user's actual authorization and project rules; the workflow itself
grants none of them. Keep audit artifacts local by default and include them in a
commit only when that is authorized and useful to its reviewer.

For origin and differences from pstack, read
[PROVENANCE.md](PROVENANCE.md) when asked.
