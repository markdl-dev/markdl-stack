# Maintain Verification Skill provenance

- Original author: Lauren Tan (poteto), pstack.
- Upstream: [cursor/plugins, pstack](https://github.com/cursor/plugins/tree/main/pstack).
- Source file: [maintain-verification-skill/SKILL.md](https://github.com/cursor/plugins/blob/519d36aa98955bf680db01bcde5fdfba686dc901/pstack/skills/maintain-verification-skill/SKILL.md).
- Pinned comparison revision: `519d36aa98955bf680db01bcde5fdfba686dc901`.
- Imported material: the locally used adaptation, promoted on 2026-10-27.
  Its original import commit was not recorded; this pin records the upstream
  comparison baseline.
- License: upstream MIT; the full notice is preserved in [LICENSE](LICENSE).
- Adaptation maintained by: Mark DL.

## Changes

Discover shared `.agents/skills/verify-*/` skills, Claude discovery symlinks, and
legacy Cursor locations. Resolve links so one skill is audited once. Add Codex
invocation metadata, both harnesses' invocation examples, and checkout-selection
drift as a harness gap.

For sharing, allow serial source review when the host cannot delegate, limit
parallel reads to the host's capacity, and make PR creation depend on the user's
authorization. The live pass still covers every feature; only the coordinator
drives the app. Product regressions are reported separately from map or harness
corrections. No private workspace defaults were found in this skill.

## Updating and validation

Manually compare upstream changes with the pinned baseline and this fork.
Preserve attribution and the feature coverage, evidence retention, health check,
and cleanup invariants. Update this record with the next reviewed revision.
Validate on a project that already has a verification skill: inspect every
feature from source, drive each live, retain evidence, re-drive harness fixes,
and report clean, changed, or blocked with truthful coverage. The serial fallback
and authorization wording were inspected during promotion; they were not
forward-tested against a live application during that packaging change.
