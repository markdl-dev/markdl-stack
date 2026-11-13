---
name: chunk-plan-for-spec-kit
description: Assess and turn a product plan, architecture document, proposal, roadmap, notes, or set of ADRs into an ordered backlog of bounded, dependency-aware feature slices ready for Spec Kit. Use when an input may be too large for one specification, when the user asks what to build first, wants source-to-feature coverage checked, needs a Spec Kit feature roadmap, or wants confirmation that an already-focused plan is small and specific enough to pass directly to start-spec-feat.
---

# Chunk a Plan for Spec Kit

Assess the input before changing it. If it already defines one cohesive feature,
report that it is Spec Kit-ready and preserve it intact. If it spans multiple
independently valuable outcomes, create or revise a durable feature roadmap.

Do not initialize Spec Kit, invoke the specify workflow, create feature
directories, or implement code unless the user separately requests those actions.

## 1. Establish Scope and Output

1. Read the plan or source named by the user. Accept any useful form: prose,
   planning document, proposal, architecture notes, roadmap, issue, decision log,
   or ADRs. Do not require ADR formatting.
2. If no path is named, inspect the repository for product plans, architecture
   docs, ADRs, decision logs, roadmaps, pending decisions, and applicable
   `AGENTS.md` or `CLAUDE.md` files.
3. Read every source that defines accepted scope, constraints, exclusions, or
   unresolved decisions. Do not infer coverage from filenames alone.
4. Preserve existing changes and established decisions.
5. Default a durable roadmap to `docs/spec-kit-feature-roadmap.md`. Reuse a
   clearly established roadmap path instead of creating a duplicate. Treat a
   request to analyze or preview only as read-only.
6. Ask one concise question only when the target release, product boundary, or
   conflicting decision would materially change the result. Otherwise proceed
   with labeled assumptions.

## 2. Decide Whether Chunking Is Necessary

Treat the input as one Spec Kit-ready feature when all are true:

- it has one primary user, operator, or developer outcome;
- its behavior forms one cohesive workflow or lifecycle change;
- it can have testable requirements and success criteria without bundling
  separately valuable releases;
- its dependencies are prerequisites rather than additional features hidden in
  the same scope;
- its inclusions and exclusions can be stated clearly;
- it does not mix unrelated clients, operational programs, or release risks.

When the input passes this test:

1. Do not split it merely because it touches UI, API, data, and infrastructure.
2. Report why it is already bounded and ready.
3. Identify assumptions, missing exclusions, or decision gates that
   `$start-spec-feat` should capture or clarify.
4. Provide an exact `$start-spec-feat` or `/start-spec-feat` invocation.
5. Do not create a multi-feature roadmap unless the user explicitly wants one.

A cohesive feature may contain several prioritized, independently testable user
stories. Multiple actors participating in the same outcome, such as a requester
and an approver, do not by themselves require separate features. Split at feature
boundaries, not at every story or actor boundary.

Chunk the input when it contains multiple independent outcomes, actors,
lifecycles, clients, release risks, or features that could deliver value at
different times. If uncertain, prefer explaining the boundary assessment over
forcing a split.

## 3. Build a Coverage Inventory

For input that needs chunking, extract atomic items before proposing boundaries:

- user and stakeholder outcomes;
- workflows and observable behavior;
- domain objects and lifecycle transitions;
- accepted technical and governance constraints;
- security, privacy, authorization, tenancy, accessibility, reliability,
  observability, and data-lifecycle requirements;
- integrations and operational capabilities;
- dependencies and sequencing constraints;
- provisional or unresolved decisions;
- explicit release inclusions and exclusions;
- deferred capabilities.

Classify each item as one of:

- **feature behavior** — belongs in a bounded Spec Kit feature;
- **enabling slice** — technical foundation with a demonstrable outcome;
- **cross-cutting constraint** — acceptance criteria for every relevant slice;
- **decision gate** — must be resolved before a named feature or phase;
- **deferred** — intentionally excluded from the target release.

Give each atomic item a stable source reference: document path plus heading,
existing requirement ID, or a short inventory ID when the source has none. Keep
accepted scope, assumptions, unresolved choices, and exclusions distinguishable.

Do not silently convert an unresolved decision into a requirement.

## 4. Form Vertical Feature Slices

Prefer end-to-end outcomes that a user, operator, or developer can verify.
Combine the minimum necessary UI, API, data, and infrastructure behavior rather
than mirroring frontend, backend, database, document, or ADR boundaries.

Each slice must have:

- a stable numeric identifier and concise name;
- one-sentence outcome;
- explicit inclusions and exclusions;
- dependencies and prerequisite decision gates;
- observable completion conditions suitable for later specification;
- source references for its behavior and applicable constraints;
- current status and an existing native feature-directory mapping, when known.

Roadmap identifiers are stable backlog identities, not reserved Spec Kit feature
numbers or directory names. Keep them unchanged when sequencing changes; let
the installed specify workflow choose its own numeric or timestamped directory.

Keep a slice small enough for one coherent `spec.md`. Split it when it contains
multiple independently valuable outcomes, unrelated actors, different release
risks, or a dependency that would block only part of the work. Do not split so
finely that a slice has no demonstrable result.

Do not place all platform setup first by habit. Introduce infrastructure with
the earliest behavior that exercises it, except for the smallest foundation
needed to scaffold, run, test, and govern the project.

## 5. Order the Backlog

1. Build a dependency graph before assigning sequence numbers.
2. Put governance and unresolved-choice gates immediately before the feature
   they block.
3. Prefer an early thin vertical slice through the product's core value loop.
4. Add breadth, convenience, scale, secondary clients, lifecycle behavior, and
   production operations after the core loop is proven.
5. Identify branches that can proceed in parallel without implying they are
   independent when they share a prerequisite.
6. Keep deferred work outside the ordered target-release backlog.

Use implementation complexity only as sequencing evidence. Keep code-level
design out of feature descriptions unless an accepted decision makes it a
constraint.

## 6. Prove Nothing Was Missed

Create a coverage matrix mapping every atomic source item to at least one
feature, cross-cutting constraint, decision gate, or deferred item. Include the
source path and heading or requirement ID. A document-level row is sufficient
only when the document defines a single atomic item; a link to a substantial
document does not prove coverage of its contents. Then verify:

- every accepted target-release behavior is covered;
- every explicit exclusion remains excluded;
- each cross-cutting constraint appears globally and in high-risk slices;
- every feature dependency refers to an earlier slice or explicit gate;
- no slice contradicts a decision or invents product requirements;
- no feature is merely a component layer without a verifiable outcome;
- later operations exist for retries, repair, deletion, export, and audit when
  the sources require them;
- the first recommended slice is actually unblocked.

If coverage is uncertain, report it instead of claiming completeness.

## 7. Write the Roadmap

Use this structure unless the repository has an established equivalent:

```text
# Spec Kit Feature Roadmap
## Sequencing Principles
## Decision Gates
## Ordered Feature Backlog
### 001 — Feature name
Outcome / Includes / Excludes / Depends on / Source references / Status
Native feature directory (when already created)
## Dependency View
## Cross-Cutting Acceptance Constraints
## Source Coverage Matrix
## Explicitly Deferred
## Recommended Starting Invocation
```

Make the starting invocation name exactly one feature and instruct
`$start-spec-feat` or `/start-spec-feat` to respect that feature's outcome,
inclusions, exclusions, dependencies, and cross-cutting constraints.

Include the roadmap path and stable chunk ID so the starter can read the entry
and its source references. For an already-ready standalone plan, point directly
to that plan and any selected heading; no chunk ID or roadmap is required.
The starter records the source-to-feature mapping after native specification.

## 8. Report

For an already-ready input, report:

- the ready feature boundary and why it does not need splitting;
- assumptions, missing exclusions, and decision gates;
- source coverage or conflicts;
- the exact next invocation, without running it.

For a chunked input, report:

- roadmap path or read-only result;
- number of target-release slices;
- recommended first slice and why;
- decision gates and material uncertainties;
- coverage result and any uncovered source items;
- whether existing artifacts were changed;
- the exact next invocation, without running it.

## Guardrails

- Do not turn a complete product plan into one giant specification.
- Do not split an already cohesive feature just to produce a backlog.
- Do not equate ADR or document boundaries with feature boundaries.
- Do not require plans to be written as ADRs.
- Do not start the first feature automatically.
- Do not initialize, upgrade, or repair Spec Kit as part of chunking.
- Do not overwrite an existing roadmap without reconciling its feature
  identities and completed work.
- Do not fabricate requirements to make the coverage matrix appear complete.
- Do not move deferred items into the target release without explicit approval.
