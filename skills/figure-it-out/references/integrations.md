# Local integrations

Read only the branch the task needs. Resolve a skill from the active session's
catalog first. Otherwise inspect the active host's skill directory
(`~/.codex/skills` for Codex, `~/.claude/skills` for Claude Code), then
`~/.agents/skills`. Read the actual `SKILL.md` before invoking it. Symlinks may
resolve into the shared-agent-tools repository. Host-specific review skills have
different runners; use the matching host's version and its bundled helpers.

If an optional skill is missing, follow the standalone core for that part and
report the omission when material. If a requested or mandatory gate depends on
an unavailable integration, report that gate as unresolved and continue only
independent work. Installation, activation, and infrastructure repair are
separate scopes. No pstack skills are required.

## Engineering standards

When engineering choices or implementation touch a covered stack, inspect
existing standards, agent instructions, and constitution first. Use the project's
adopted guidance. The following optional operator names are examples from the
original local setup; use an equivalent installed skill when appropriate, or
follow repository guidance directly. None is required to use this skill:

| Project area | Operator skill |
| --- | --- |
| Go backend or API | `go-backend-standards` |
| React web or shared React | `frontend-react-standards` |
| TypeScript language and tooling | `typescript-standards` |
| Mobile application | `mobile-app-standards` |

Choose by the actual project shape, not by a preferred template. React Native
must use applicable native guidance; web rules do not transfer automatically.
For operators with `STATUS` / `SYSTEM.json`, check active status and adopted
profiles before applying guidance. A draft or unsupported profile is a gap,
not an adopted standard. Preserve project-specific rules and documented local
deviations. Use standards to guide in-scope decisions; run apply/refresh or edit
governance files only within an explicitly requested setup or standards operation.

When terminology, ownership, or lifecycle modeling needs sharpening, use
`domain-modeling`. Follow its separation of domain glossary from implementation
decisions and create durable records only when there is something to record.

For an existing system whose architecture needs explanation, `how` can supply
grounding. For a requested throwaway UI or state-model experiment, `prototype`
can supply its relevant branch. Keep experiments inside the authorized scope;
its capture/publishing steps do not grant additional external or Git actions.

## Spec Kit

Use this branch when the user selects Spec Kit or the project already governs
the work through it. Otherwise the standalone plan and unit gates are sufficient.
Inspect the installed integration and project artifacts; do not assume a CLI
version, feature-directory naming rule, branch scheme, or mandatory phase sequence.

| Assignment | Skill and boundary |
| --- | --- |
| Assess a product plan's feature boundaries | `chunk-plan-for-spec-kit` determines whether chunking is needed, produces coverage when it is, and returns the first invocation. It never starts that feature automatically. |
| Create one selected new feature specification | `start-spec-feat` checks project readiness and creates/reviews the specification. Its default boundary is specification and necessary clarification. |
| Resume or implement an existing feature | `continue-spec-development` reconstructs state and executes only the authorized phase or task set. It owns native phase selection and truthful task updates. |

After a chunking or specification-only deliverable, return the next invocation
and stop. Continue into the next phase only when the user explicitly authorized
that broader scope. For a whole-project build, carry that authorization forward
while respecting mandatory native gates. Missing Spec Kit setup is an actionable
prerequisite; a planning request does not authorize initialization or repair.

For a multi-feature project, use a bounded core-value slice as the first feature.
Keep the roadmap's stable feature identity mapped to the native directory chosen
by the installed workflow. For an existing feature, bind implementation to its
resolved artifacts rather than making a parallel feature or ad hoc task list.

## Review and cleanup

Use a review loop when the user explicitly asks for it or project guidance
requires it. This repository's `review-loop` includes the convergence-aware
workflow formerly called v2. Use the installed host's version and its bundled
state helper. Preserve an existing cycle's host, base, scope, and checkpoint.

- `review-loop` owns fresh reviewers, finding validation, evidenced fixes,
  convergence stops, and durable checkpoints.
- `simplify` handles a requested bounded behavior-preserving cleanup. It is
  optional and does not certify correctness or replace acceptance verification.

Review-loop skills require a trustworthy Git review target and their required
checks and independent reviewer. If those prerequisites are absent, report the
requested review as incomplete; do not simulate a completed checkpoint. A
planning document can be inspected against its sources without starting a Git
review loop. Incremental review certifies its selected delta; final readiness
requires the loop's aggregate completion policy.

Audit artifacts outside the loop's excluded state directory can be part of its
Git fingerprint even when untracked. Finish their edits before the confirming
review and freeze them through completion. Keep subsequent review bookkeeping
in the loop's own summary artifacts; an edit to a reviewed plan, log, or task
file is a new target change. Let the installed helper decide freshness rather
than assuming that documentation cannot invalidate a checkpoint.

When the user asks only to build or plan, perform appropriate verification and
recommend a review invocation if useful. Do not launch a full loop merely
because this skill refers to it. Reading or installing a skill is not invocation.
