# Spec Kit

[Spec Kit](https://github.com/github/spec-kit) is GitHub's toolkit for
specification-driven development. Install it using the
[upstream setup instructions](https://github.com/github/spec-kit#readme),
select your agent integration, and initialize the target project.

Use the commands provided by that project's installed integration, including
`/speckit.specify`, `/speckit.plan`, and `/speckit.tasks` where available.
Command availability and invocation syntax depend on the installed version and
harness. Keep generated project commands in the target project.

## Our workflow

Start with `/grill-me` to work through a new project or feature, then write down
the agreed plan. Use `/prototype` when a runnable experiment would settle a
design question.

Pass that high-level plan to
[Chunk Plan for Spec Kit](../../skills/chunk-plan-for-spec-kit/SKILL.md). It
checks whether the plan fits one feature. Larger plans become an ordered
roadmap with scope boundaries, dependencies, and a record of where each
requirement belongs. A focused plan can go straight to specification.

Use [Start Spec Feature](../../skills/start-spec-feat/SKILL.md) with a feature
description, a standalone plan such as one Markdown file, or one roadmap entry.
For a roadmap entry, include its path and chunk identifier. The skill reads the
source, preserves the selected scope and constraints, checks project readiness,
and records the source-to-feature mapping in the resulting specification.
Roadmap identifiers do not reserve native Spec Kit directory numbers.

Then use
[Continue Spec Development](../../skills/continue-spec-development/SKILL.md)
to pick up the feature and work through its technical plan, tasks, and
implementation. This per-feature planning is separate from the high-level plan
used to decide the chunks.

Use [Review Loop](../../plugins/claude/review-loop/README.md) in Claude Code
when the code is ready for review. Return to the roadmap for the next feature
once its dependencies are satisfied.

## Example prompts

These examples cover feature development. For an existing bug, use the
[bug workflow](#fixing-a-bug) below.

Replace these example paths and feature names with your own. Chunking defaults
to `docs/spec-kit-feature-roadmap.md`; use the actual path it returns.

```text
/grill-me I want to build a booking app. Help me settle the first release scope.
/chunk-plan-for-spec-kit docs/product-plan.md
/start-spec-feat Specify chunk 001 from docs/spec-kit-feature-roadmap.md. Preserve its scope, exclusions, and dependencies.
/continue-spec-development Create the technical plan for the active feature.
/continue-spec-development Create and check the task breakdown for the active feature.
/continue-spec-development Implement the first ready task group and verify it.
/review-loop --final
```

Run each step after inspecting the previous result. These examples do not
authorize the agent to run the entire sequence automatically.

The wrapper skills do not include Spec Kit itself. They use the project's
installed workflow and preserve its constitution and templates.

A focused plan can start directly, without creating a roadmap:

```text
/start-spec-feat Specify the cohesive feature in docs/booking-plan.md. Preserve its requirements, constraints, and exclusions.
```

Use `$start-spec-feat` for the equivalent Codex invocation. If a source spans
separate features, name the desired feature or section. The starter resolves a
bounded scope before creating a specification.

The bundled Spec Kit 0.15.1 workflow runs specify, plan, tasks, and implement with
review gates. Clarify, domain requirements checklists, analyze, and converge are
additional phases selected according to installed capabilities, governance, and
feature risk. Continuation uses native phase instructions, including checklist
checks and extension hooks, while preserving the user's authorized task scope.
An engine-managed run requires its own resume decision: invoking a phase
manually does not advance that run, and resuming can execute remaining phases.

## Validating the wrappers

Run the target harness's skill validator on each of the three skill directories,
then check the installed runtime with `specify version --features --json` and
the target project's `specify integration status --json`. Inspect project versions
and actual phase instructions separately from the CLI version.

In a temporary project using the installed Spec Kit assets, verify path-only
resolution before a plan exists, explicit directory override precedence, label
variables that do not select directories, and unchanged feature state during
status inspection. Exercise standalone-plan specification, roadmap-to-directory
mapping with preexisting feature numbers, and a scoped continuation with existing
checklists or workflow gates. Inspect resulting artifacts and scope, rather than
testing only the wrapper's wording. Keep generated fixtures outside this repo.
The shared installation should link to the repository skill directories so both
harnesses read the same source.

## Fixing a bug

Spec Kit's optional [bug extension](https://github.com/github/spec-kit/tree/main/extensions/bug)
provides assess, fix, and test commands. It does not require a feature
specification workflow first. Install it from the target project directory:

```sh
specify extension add bug
```

Use one slug throughout so each stage reads the same bug's reports:

```text
/speckit.bug.assess "Submitting an empty password crashes the login form." slug=login-crash
/speckit.bug.fix slug=login-crash
/speckit.bug.test slug=login-crash
```

Run assess first and inspect the proposed fix before continuing. Assess writes
`.specify/bugs/login-crash/assessment.md` without changing source code. Fix
applies the remediation and writes `fix.md`. Test checks the reproduction and
tests, then writes `test.md` with a `verified`, `partial`, or `failed` result.
Missing verification must not be reported as a successful fix.

To resume, use the same slug with the next command after checking the saved
reports. A partial or failed test result needs investigation before calling the
bug resolved.

The [upstream bug workflow reference](https://github.com/github/spec-kit/blob/main/docs/reference/agentic-bugfix.md)
documents the dotted commands above. Some integrations use hyphenated names,
such as `/speckit-bug-assess`; use the commands exposed by the installed
integration. These commands are installed by Spec Kit, not bundled here.
