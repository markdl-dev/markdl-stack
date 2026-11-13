# Create Verification Skill provenance

- Original author: Lauren Tan (poteto), pstack.
- Upstream: [cursor/plugins, pstack](https://github.com/cursor/plugins/tree/main/pstack).
- Source file: [create-verification-skill/SKILL.md](https://github.com/cursor/plugins/blob/519d36aa98955bf680db01bcde5fdfba686dc901/pstack/skills/create-verification-skill/SKILL.md).
- Pinned comparison revision: `519d36aa98955bf680db01bcde5fdfba686dc901`.
- Imported material: the locally used adaptation, promoted on 2026-10-27.
  Its original import commit was not recorded. The pinned revision above is the
  upstream comparison baseline, not a claim that this fork matches that revision.
- License: upstream MIT; the full notice is preserved in [LICENSE](LICENSE).
- Adaptation maintained by: Mark DL.

## Changes

The local adaptation replaces Cursor-only output paths with a canonical
`.agents/skills/verify-<app>/` directory and a Claude discovery symlink. It adds
Codex invocation metadata and documents checkout resolution, run identity,
worktree overrides, dependency fallback, and proof that the selected checkout
actually runs. The feature-map examples are included with the local adaptation.

For sharing, the private workspace example was replaced with a generic,
optional project convention. No named account, fixed model, private workspace,
or personal standards package is required.

This is a tested local fork, not a synchronized copy of upstream main. The
comparison revision has additional first-launch seeding and real-target coverage
guidance that has not been merged into this adaptation.

## Updating and validation

Compare upstream changes against the pinned baseline and this adaptation. Review
behavioral changes deliberately, preserve the license, update this record, and
repeat the generated-skill proof in SKILL.md. Do not overwrite it with an
installer update. The end-to-end acceptance procedure is launch, doctor, drive
one mapped feature, capture evidence, cleanup, then confirm the evidence survives.
Test worktree selection when that convention exists in the target project.
