# Changelog

Changes to this collection are recorded here. The collection version lives in
[VERSION](VERSION). Skills use that version; plugin packages retain their own
manifest versions. See [versioning](CONTRIBUTING.md#versioning-and-changelog)
for the update rules.

## Unreleased

### Added

- REA: Reverse Engineer Anything in Fast prototypes and POCs, with upstream
  attribution and a guide covering REA's CLI/MCP setup and Ghidra for native
  analysis.
- The approved light/dark mage catalog graphic in the README and an MIT license
  for original repository content. Bundled third-party notices remain in place.
- Craft Anything as an upstream external skill/tool in Fast prototypes and POCs,
  marked under evaluation, with source attribution and a CLI/MCP setup guide.
- Start Session under Use as needed, with a portable skill, optional workspace
  adapter, setup guide, and Git/worktree verification procedure. The shared
  package has no private project or service defaults; personal installations
  remain separate.
- A project-local Claude `/ticket PROJ-123` example explaining how to combine an
  established workflow into one skill while retaining project checks and
  approval rules. The example is not a bundled Ticket skill.

### Changed

- Named the Claude marketplace `markdl-stack` to match the public repository.
- Made skill invocations explicit in workflow prose and split the shortcut story
  into shorter paragraphs, with `/ticket PROJ-123` emphasized as the new entry.
- Aligned the README's feature highlights with the HTML: Figure It Out and Think
  stay under evaluation beside Craft Anything, with one catalog row per tool.
- Reworded Start Session around parallel ticket work with separate Git worktrees.
  Updated its catalog description, setup guide, discovery metadata, and agent
  guidance without changing its Git procedures.
- Replaced the generic workflow shortcut description with a short narrative
  grounded in earlier Claude sessions. Individual skill commands use inline
  code; `/ticket PROJ-123` replaces the repeated prompt. Used current skill names
  and generic ticket keys, and tightened the README copy with an Unslop pass.
- Named the collection markdl-stack in the README, shortened the
  maintainer introduction to "I'm Mark DL," and used Spell combinations for
  optional workflow examples. Skill names, commands, and package paths are
  unchanged.
- Grouped Create Verification Skill, Maintain Verification Skill, both Review
  Loop versions, and Simplify under Review and verification in the catalog.
  Updated agent guidance to keep future review tools in that section and
  experimental tools in Trying out until promoted.
- Removed the README's Review Loop quick-start section and kept installation,
  invocation, and account guidance in the dedicated Review Loop guide.
- Reorganized the README with quick navigation, a general installation entry,
  a copyable agent prompt, optional workflow examples, and documentation and
  attribution links. Shortened catalog descriptions while preserving all five
  sections, triggers, types, and author/source columns. Moved maintainer details
  into CONTRIBUTING.md and updated agent guidance for the new structure.

- Promoted Retro from Trying out to Use as needed for session reflection.
  Retained the external upstream skill and Matt Pocock's attribution, removed
  its evaluation label, and updated catalog guidance for session retrospectives.

- Excluded private planning drafts, local scratch files, and review state from
  Git, and documented where private planning belongs.

### Fixed

- Aligned the Claude plugin manifest name with `review-loop` and its documented
  `/review-loop:review-loop` command. The package is now version 2.4.1.
- Restored Figure It Out's never-block-on-the-human principle inline, keeping the
  adaptation standalone and harness-neutral. Authorized reversible work proceeds
  through routine choices and phase transitions; missing decisions block only
  dependent work. Existing scope, planning boundaries, and required authorization
  for irreversible actions and external messages still apply.

## 0.1.0 - 2026-10-27

Initial local baseline. This records the repository's current contents; it does
not announce a published release or Git tag.

### Added

- Shared Spec Kit skills for chunking a plan, starting a feature, and continuing
  development.
- Convergence-aware Review Loop for Claude and Codex, with setup instructions,
  account configuration guidance, and independent review cycles.
- Shared adaptations of Lauren Tan's Create Verification Skill and Maintain
  Verification Skill, with upstream notices and provenance.
- Figure It Out and UI adaptations under evaluation, with original and inherited
  credits, licenses, and documented limits.
- Catalog entries for external skills, Spec Kit and its bug workflow, and
  Claude's built-in Simplify.
- Adoption instructions, example prompts, an app-verification walkthrough,
  and a source audit distinguishing adaptations from upstream snapshots.
- Agent instructions to check for an existing adaptation and ask which version
  the user wants when a version has not already been selected.

### Changed

- Promoted the tested v2 workflow to the main Review Loop name. Claude's package
  is version 2.4.0; the standalone Codex skill follows the collection version.
- Made shared defaults generic while retaining optional local account settings.
- Replaced the verification generator's private workspace example with an
  optional project convention.
- Allowed serial source review in maintenance when delegation is unavailable,
  and made PR creation follow the user's authorization.
