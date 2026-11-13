# Figure It Out provenance

- Original author: Lauren Tan (poteto), pstack.
- Upstream: [cursor/plugins, pstack](https://github.com/cursor/plugins/tree/main/pstack).
- Imported upstream revision: `c86f349b102feb91f1966f8a6a60882a4e601b50`.
- Source: [pinned original skill](https://github.com/cursor/plugins/blob/c86f349b102feb91f1966f8a6a60882a4e601b50/pstack/skills/figure-it-out/SKILL.md).
- Original source SHA-256:
  `d9574cc24929773d5c23f40626ae1e09660afddd7de48e08dd6494d9fff9bbf0`.
- Local adaptation reviewed on 2026-10-14; promoted on 2026-10-27.
- License: upstream MIT; [LICENSE](LICENSE) retains Lauren Tan's notice.
- Adaptation maintained by: Mark DL.
- Status: under evaluation.

## Changes

Preserve the frame, design, experiment, decision trail, and verification
discipline while making the core independent of pstack companion skills.
Add explicit read-only, planning, specification, and implementation boundaries;
new-project discovery; small verification gates; stopping conditions for stalled
experiments; and a bundled TSV logging helper.

On 2026-10-28, restore the explicit never-block-on-the-human principle from the
[pinned pstack principle](https://github.com/cursor/plugins/blob/c86f349b102feb91f1966f8a6a60882a4e601b50/pstack/skills/principle-never-block-on-the-human/SKILL.md).
The earlier standalone rewrite retained narrower continuation guidance but
omitted this explicit rule. Inline it in the assignment step so it needs no
companion skill or harness-specific tool: make reasonable decisions, proceed
with authorized reversible work, report results, and correct discovered problems
within scope. Missing product decisions or required authorization block only
dependent work. Prior choices, read-only and planning boundaries, and the
authorization requirements for irreversible actions and external messages remain
in force. The imported revision and license are unchanged.

Standards, domain modeling, Prototype, Spec Kit, cleanup, and review loops are
optional integrations. A missing integration does not block the standalone core;
a missing requested gate remains unresolved. No fixed account or model is used.
Claude's explicit invocation flag and Codex's explicit-only metadata are retained.

For sharing, remove the personal standards wording, describe operator names as
optional examples, and route to the promoted `review-loop` name. Private intake
notes and an archived duplicate of the upstream prompt are excluded. This record
replaces the local comparison document.

## Updating and validation

Compare changes manually against the pinned original, then update the pin and
change notes after review. Avoid replacing the standalone workflow with the
pstack installer. Preserve the license and the helper's single-writer schema.

The local adoption record reports disposable-fixture checks for planning-only
discovery and bounded implementation, and logging checks for append, sanitation,
invalid results, missing newlines, and malformed logs. Those records are not a
claim that every integration works. Packaging validation checks references,
metadata, privacy, and the helper; full Spec Kit handoffs, completed review-loop
cycles, and multi-agent implementation remain under evaluation.

For changes to the restored principle, walk through these cases:

- An authorized reversible task has a routine implementation choice: choose a
  reasonable default, do the work, and report the result without another approval
  round.
- A material product decision or required authorization is missing: ask for that
  specific decision and continue independent authorized units while waiting.
- The request is read-only or planning-only, or an irreversible or external action
  lacks authorization: retain the requested boundary and obtain any required
  authorization before that action.

Compare the instructions with the pinned principle and check that its behavior
is stated inline without requiring pstack, another skill, or a particular harness.
