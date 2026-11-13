# Convergence and user decisions

The implementer owns review history; each reviewer still starts fresh. There is no default
pass count limit. Continue while verified fixes retire real defects. A user-supplied
`--max-passes N` is an optional total budget for this cycle, independent of convergence.
The helpers store only explicitly selected budgets in `pass_budget`. V2 keeps its own
`.review-loop-v2/` history; it does not migrate or modify the original loop state.

## Compare before editing

Before resolving each report, read the active cycle's assessments and resolutions in
`.review-loop-v2/state.json` and the referenced artifacts. Also consult earlier archived
resolutions for matching concerns. If structured history is incomplete, reconstruct relevant history from the existing v2
reports/resolutions. Record any detected historical cycle with `stop_reason` and
`stop_evidence` below. Preserve report IDs separately from stable issue identities.

Match by affected component/symbol, violated contract, root cause, and reachable failure
scenario. Reuse the same identity when wording, priority, line numbers, or the suggested
fix changes. Split distinct root causes even when they share a file. Inspect code and tests
to establish the match; counts and text similarity alone are not proof of convergence.

For each finding choose `fix`, `invalid`, `defer`, or `blocked`, with evidence. Preserve a
previous invalid/deferred disposition while its rationale still holds; new evidence or
changed behavior may justify reopening it. An unchanged invalid/deferred finding needs
neither another fix nor another review. Apply the normal priority and completion gates.

### Verify progress for each issue

For each `fix`, record nonempty `checks`: stable case IDs, `result: pass|fail`, and
`evidence` citing the exact command and observed result (prefer a saved output artifact),
or a reproducible manual/source inspection with expected and observed behavior. At least
one check must fail for an actionable fix. General claims such as "tests pass" do not
establish progress on an issue. Use the same case ID when wording, test names, or lines move.

Recheck and retain every case already recorded for that issue, including passing cases.
A previous failing case becoming passing is verified progress; renaming/dropping a case,
adding evidence text, introducing another failing case, and fixing another issue are not.
If a previously passing case fails again, stop for a user decision. When an issue remains
actionable after two attempted corrections without verified progress on its own cases,
the helper stops even if other issues were fixed. Genuine progress on that issue resets
its counter and may continue beyond four passes. For a still-outstanding issue, retained
cases changing from fail to pass establish progress without a separate `new_evidence` claim.

Reviewer silence is not closure. Before assessing the next report, recheck earlier
outstanding fixes against the current target. Include each in `findings` if still open
(even when absent from the fresh report), or in top-level `resolved` with all retained
checks passing. A justified `invalid` or eligible `defer` disposition stays in `findings`
with its rationale; it is not a claim of a verified fix. The final clean report still
requires this reconciliation. Keep checks in the repository when useful so later fixes
cannot silently undo the behavior.

Save `.review-loop-v2/pass-N-assessment.json` before editing, then run the harness's `assess`
action. Example (all findings must be represented; use `findings: []` for no remaining
issues, with `resolved` evidence for outstanding fixes):

```json
{
  "findings": [
    {
      "id": "orders:submit:duplicate-charge",
      "priority": "P1",
      "action": "fix",
      "evidence": "The retry path calls capture twice; cite current code and test evidence.",
      "new_evidence": "Only when reopening: concrete changed code, requirement, or newly demonstrated scenario.",
      "conflicts_with": [],
      "checks": [
        { "id": "retry-captures-once", "result": "fail", "evidence": "node --test retry.test.mjs: expected 1 capture, observed 2; pass-N-checks.log." }
      ]
    }
  ],
  "resolved": [
    {
      "id": "orders:cancel:stale-status",
      "checks": [
        { "id": "cancel-updates-status", "result": "pass", "evidence": "node --test cancel.test.mjs: expected cancelled, observed cancelled; pass-N-checks.log." }
      ]
    }
  ]
}
```

`resolved` may contain only outstanding issue IDs and must retain every previously
recorded case for them. It may be omitted when there is nothing to close. An issue ID
appears in either `findings` or `resolved`, once per assessment.

`new_evidence` is optional; omit it for a new finding. Renamed findings, a new reviewer,
a stronger opinion, and higher severity are not new evidence. This text explains a
reopening; it does not reset the per-issue progress counter. `conflicts_with` contains
stable identities whose accepted remedies this fix would reverse or contradict. Name
those identities even when unrelated changes make the overall code fingerprint different.
For semantic cycles found in prose or older artifacts, add nonempty `stop_reason` and
`stop_evidence` with the pass chain and artifact/code citations. These fields stop the
loop before any new edits. Only proceed after `assessment_ready`.

## Stop conditions

The helpers persist `convergence_blocked` when:

- an actionable finding reopens a previously fixed, invalid, or deferred issue without
  materially new evidence;
- a proposed fix reverses or conflicts with an earlier accepted remedy;
- an issue remains actionable after two attempted corrections without verified progress
  on its retained failing cases, regardless of progress on other issues;
- a previously passing case for an issue fails again; or
- fixes return the target's content to an earlier state (A → B → A, or longer cycles).

The implementer also stops through `stop_reason` when semantic inspection shows equivalent
behavior oscillating despite different text, defects moving between components, or repeated
fix attempts with no verified improvement. Show the evidence; do not invent a numeric
finding threshold or treat a larger report as proof of failure. New independent defects
with verified corrections are progress and may continue beyond any former default cap.

A concern that keeps returning in new forms after two fixes, where closing it needs
information the system cannot provide (no idempotency key, no record of who created an
item), is a product decision, not a defect to patch again: each further fix is only
another heuristic. Keep its variants under one identity. Defer it with the options and
their trade-offs when it is an eligible P2/P3; otherwise stop with `stop_reason`. Either
way, put the decision to the user.

Content identity supplements the existing report fingerprint; commits and staging alone
are not progress. Exact fingerprint checks cannot establish semantic equivalence. Stable
identity assignment, validation, and evidence remain the implementer's responsibility.
The helper validates the recorded check structure and transitions; it does not execute
commands or independently verify that supplied observations are truthful. The guards help
enforce recorded decisions; they do not replace code review or tests.

Existing v2 rounds remain readable. On the next assessment, establish current checks for
older issues that lack them; prior unsupported claims do not earn progress credit. Preserve
already-recorded assessments and resolutions. An explicit resume starts a new detection
window and requires fresh check observations under the user's chosen approach. Outstanding
issues, including blocked issues and findings first recorded at the stop, still require
resolution or a justified disposition; retain their case IDs across resume.

## Report and stop

On `convergence_blocked`, stop editing and launching reviewers. Save
`.review-loop-v2/convergence-summary.md` with:

- `CONVERGENCE_BLOCKED`, current pass, scope, and remaining mandatory findings;
- the implicated identities and pass-by-pass fixes/dispositions, with artifact links;
- each stalled issue's attempt passes, retained failing cases, and observed check results;
- the repeated state or conflicting contract and concrete supporting evidence;
- checks already run, current diff status, and why another automatic attempt is unlikely
  to help; and
- the specific decision needed: choose a contract/remedy, authorize one revised attempt,
  defer an eligible P2/P3 with rationale, or leave the loop stopped.

Present that decision to the user. A convergence stop is not completion, readiness, a
successful checkpoint, or permission to discard changes. Keep all history and artifacts.
Ordinary reruns and incidental code changes must leave the stop in place.

After an explicit user decision, save their instruction and chosen approach under
`.review-loop-v2/decision-N.md` and use the harness's resume action. The helper records that
file's digest, keeps the old stop/history, and starts a new detection window. Resume
permits a fresh review under the chosen decision; it does not disable guards or waive
mandatory fixes, confirming review, or verification. Do not automatically resume, delete
history, rename issue identities, or increase a user budget to evade a stop. The decision
file is an audit record, not a way for the helper to verify human authorization.
