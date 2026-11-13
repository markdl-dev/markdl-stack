# Skills

This directory contains shared skills at the top level and Codex-specific skills
under `codex/`. Each skill has a `SKILL.md` entry point.

See [Adopt a skill](../docs/adopting-skills.md) for installation, example prompts,
and selecting our adaptation or upstream. Adapted skills include their original
license and PROVENANCE.md. Keep the full directory together.

## Session setup

[Start Session](start-session/SKILL.md) prepares separate worktrees so sessions
can work on tickets in parallel. Check existing work, then add a ticket key to
create or reuse its checkout. Put project-specific
tracker, remote, and PR settings in the optional
[workspace adapter](start-session/references/adapter.md); local Git checks work
without service integrations. See its [guide](start-session/README.md) for setup
and verification.

## Verification skills

[Create Verification Skill](create-verification-skill/SKILL.md) generates and
proves an app-specific verification skill. [Maintain Verification Skill](maintain-verification-skill/SKILL.md)
checks an existing map against source and live behavior. Both are adaptations
of Lauren Tan's pstack skills. Start with the
[walkthrough](../docs/tools/verification-skills.md).

## Adaptations under evaluation

[Figure It Out](figure-it-out/SKILL.md), adapted from Lauren Tan's pstack,
provides a standalone planning and execution workflow. [UI](ui/SKILL.md),
adapted from tw93's Waza, adds product-aware overrides to its visual workflow.
Both remain in the catalog's Trying out section; read their provenance for limits.

## Codex skills

[Review Loop](codex/review-loop/SKILL.md) uses the current Codex session to
resolve findings from fresh, read-only subagents. Invoke it with
`$review-loop`. See the [setup guide](../docs/tools/review-loop.md) for
installation and the differences from the Claude package.

## Spec Kit skills

For Spec Kit work, use these in order:

1. [Chunk Plan for Spec Kit](chunk-plan-for-spec-kit/SKILL.md) checks a high-level
   plan and splits it into ordered features when needed.
2. [Start Spec Feature](start-spec-feat/SKILL.md) creates a specification for
   one selected feature.
3. [Continue Spec Development](continue-spec-development/SKILL.md) picks up
   that feature's planning or implementation work.

Keep private and unfinished skills outside the repository. Deliberately promoted
working adaptations may remain under evaluation when their status and limits
are clear.
