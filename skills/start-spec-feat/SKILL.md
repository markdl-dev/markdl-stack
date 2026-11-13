---
name: start-spec-feat
description: Start a substantial new Spec Kit feature from a description, standalone plan, or roadmap entry by checking project readiness, grounding scope in source material and the repository, creating a trustworthy specification, and identifying the next phase. Use when the user invokes /start-spec-feat or $start-spec-feat, asks to begin a new project feature with Spec Kit, or wants a governed entry point before planning and implementation.
---

# Start a Spec Kit Feature

Use the feature description or source reference from the invoking user message.
In Claude Code, `$ARGUMENTS` contains text passed after the slash command.

## Outcome

Create a reviewed feature specification that captures what to build and why,
records assumptions and unresolved decisions, and leaves the user with a clear
next step. Do not continue into planning or implementation unless the user asks
for that broader scope.

The bundled Spec Kit 0.15.1 workflow runs the following core sequence, with
review gates between specification, planning, and task generation:

```text
specify -> plan -> tasks -> implement
```

Project governance may add clarify before planning, domain requirements
checklists, analyze after tasks, and converge after implementation. Choose these
gates from the installed workflow, constitution, and feature risk. A checklist
checks requirements quality; generating it does not complete its evaluation.
This starter ends after specification and any necessary clarification.

## 1. Understand The Request

1. Require a non-empty description or an identifiable source. Read any plan,
   document, issue, or roadmap entry named by the user before defining scope.
2. For a roadmap entry, read the selected chunk, its referenced source sections,
   applicable global constraints, exclusions, dependencies, and decision gates.
   Keep its stable chunk ID separate from native Spec Kit numbering.
3. For a standalone plan, including a single Markdown file, extract the desired
   outcome, accepted behavior, constraints, exclusions, dependencies, and open
   decisions directly. No chunking skill, roadmap format, or chunk ID is required.
   If it describes one cohesive feature, use it intact; multiple related user
   stories or actors can belong to that feature. If it spans separate features,
   use the user's named boundary or present bounded candidates and resolve which
   one to specify. Offer chunking when useful without running it automatically.
4. Check prerequisite evidence. Distinguish decisions that prevent trustworthy
   specification from dependencies needed only before implementation. Preserve
   unresolved choices as decisions, not invented requirements.
5. Build a substantive native specify input from the selected source scope;
   passing only a path or chunk number is insufficient. Carry source references
   and accepted constraints through to the specification, and distinguish new
   assumptions from source commitments.
6. Ask a concise question only when missing information would materially change
   the feature boundary. Otherwise proceed with clearly labeled assumptions.
7. Keep implementation choices out of the specification unless the user or
   accepted source stated them as constraints.

## 2. Inspect The Project

Before creating artifacts:

1. Read applicable `AGENTS.md`, `CLAUDE.md`, repository documentation, and
   existing project instructions.
   Resolve the intended project root before running CLI commands; honor a valid
   `SPECIFY_INIT_DIR` and nested projects rather than assuming the Git root.
2. Inspect the current architecture, package/runtime configuration, neighboring
   features, existing specifications, and established conventions.
3. Read `.specify/memory/constitution.md` when present.
4. Preserve existing user changes and project-specific rules.

## 3. Check Spec Kit Readiness

1. Confirm the `specify` CLI is available.
2. Prefer `specify version --features --json` for capability detection.
3. Confirm the project contains `.specify/`.
4. Prefer `specify integration status --json` to detect installed integrations
   and managed-file health.
5. Read the project's recorded version and integration settings separately from
   the CLI version. Select the installed integration matching the active harness;
   the project default may name another integration. Confirm the actual native
   specify and clarify instructions are available when needed. CLI feature flags
   and healthy manifests do not establish phase availability or artifact versions.
6. Inspect relevant project overrides, presets, and hook configuration when they
   affect this phase. Use the installed resolution stack and phase instructions;
   assess modified managed files as possible intentional customization. Preserve
   those decisions instead of treating every warning as a repair request.
7. If setup is missing, report the exact current command using the active client,
   such as:

   ```text
   specify init --here --integration <claude|codex|other>
   ```

8. Initialize or repair project infrastructure only when the user requested
   setup or approved the change. Do not upgrade the CLI, force-refresh managed
   files, or overwrite custom templates or the constitution without approval.
9. If an older CLI or project installation lacks a preferred command, inspect its
   installed files and use the compatible workflow instead of assuming failure.

## 4. Check Project Governance

1. Preserve an established constitution.
2. If the constitution is missing or still contains unresolved template
   placeholders, establish or clarify project principles before relying on it.
3. Keep the constitution focused on product and engineering governance. Do not
   insert model-specific orchestration, agent roles, or tool-specific process
   rules.

## 5. Use Adaptive Delegation

The main agent owns the feature boundary, shared artifacts, and user decisions.

Delegate only when it improves evidence or reduces context noise:

- Explore independent frontend, backend, data, infrastructure, or domain areas
  in parallel for a complex brownfield feature.
- Research unfamiliar integrations or constraints independently.
- Use a fresh-context reviewer for a complex or high-risk specification.

Keep simple work in the main context. Delegate directly to available specialists;
do not create permanent PM, Architect, or specialist agents automatically, and
do not require nested delegation. Reuse existing project agents when they are a
good fit. Ask delegates for evidence, constraints, risks, and open questions;
the main agent synthesizes the final specification.

## 6. Create And Review The Specification

1. Invoke the current integration's native Spec Kit specify skill or command.
   Pass the extracted feature description, source commitments, and authorized
   boundary. Follow its hook behavior within existing user authorization.
   Do not reproduce its full internal prompt inside this wrapper or launch a
   full engine-managed workflow for a specification-only request.
2. Let the installed Spec Kit workflow select the feature directory. Do not
   assume a Git branch is required; report a branch when the Git extension or
   project workflow creates one.
3. Do not overwrite an existing feature with the same identity. Reuse, revise,
   or create a separate feature only after resolving the conflict.
4. Record compact source provenance in `spec.md`: source paths and selected
   headings or requirement IDs, plus the roadmap chunk ID only when one exists.
   Store and report the mapping to the actual native feature directory. Preserve
   template structure and existing roadmap identities; a standalone plan needs
   only its source-to-feature mapping.
5. Review the resulting `spec.md` against the source inventory for:
   - clear users, scenarios, and outcomes;
   - testable functional requirements and success criteria;
   - explicit assumptions, dependencies, constraints, and exclusions;
   - unresolved template placeholders or contradictory requirements;
   - implementation details that do not belong in the specification.
   Account for each accepted item in the selected scope and each exclusion;
   flag uncovered items rather than claiming the source is fully represented.
6. Evaluate the native specification quality checklist, including
   `checklists/requirements.md` when generated. Mark items complete only with
   evidence from the specification; report unresolved failures and readiness.
7. Invoke the native clarify phase when material ambiguity remains. Do not use
   an arbitrary fixed question limit; follow the installed Spec Kit behavior.
   Recheck affected specification and checklist items after clarification.

## 7. Report

Report concisely:

- feature name and feature-directory path;
- source path or description, selected scope, source coverage, and the mapping
  from any roadmap chunk ID to the native feature directory;
- branch or active-feature selector, when applicable;
- constitution, selected integration, CLI and project versions, and relevant
  customization or compatibility findings;
- important assumptions, clarifications, and exclusions;
- whether subagents were used and what they contributed;
- specification review result;
- the next recommended phase.

Recommend `/continue-spec-development` in Claude Code or
`$continue-spec-development` in Codex for the next phase.

## Guardrails

- Do not implement code during this skill unless the user explicitly expands the
  scope.
- Do not invent requirements to make the specification appear complete.
- Do not modify agent configuration or the constitution merely to enforce this
  skill's workflow.
- Honor the user's authorized boundary when hooks or handoffs request additional
  actions; resolve a mandatory conflict instead of silently skipping or expanding
  scope. Optional hooks do not grant new authorization.
- Stop and ask when an existing feature, destructive refresh, or unresolved
  product decision makes proceeding unsafe.
