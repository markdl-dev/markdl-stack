# markdl-stack

Skills and workflows I use to build software with coding agents.

I'm Mark DL. This is my working spellbook: skills I use in projects and a few
I'm still trying. Install shared skills directly in compatible agents;
harness-specific tools have separate packages.

Collection version: [0.1.0](VERSION) · [Changelog](CHANGELOG.md).
Plugins keep their own manifest versions.

<img src="assets/catalog.svg" alt="Mark's mage beside five catalog groups: working on a feature, review and verification, fixing a bug, use as needed, and trying out." width="960" />

[Working on a feature](#working-on-a-feature) · [Review and verification](#review-and-verification) ·
[Fixing a bug](#fixing-a-bug) · [Use as needed](#use-as-needed) · [Trying out](#trying-out) ·
[Install](#install-what-you-need) · [Documentation and attribution](#documentation-and-attribution)

<a id="catalog"></a>

## The spellbook

Names link to skill instructions, plugin documentation, or tool guides.
Included adaptations credit the original author and record changes in
PROVENANCE.md. External entries link to their authors' distributions; built-in
skills come with their harness.

Most triggers use Claude's `/skill-name` notation. In Codex, use `$skill-name`
for standalone skills. Plugin and external commands follow their own guides.

### Working on a feature

#### Fast prototypes and POCs

I'm trying these for faster prototypes and proofs of concept.

| Name | Trigger / usage | Description | Type | Author / source |
| --- | --- | --- | --- | --- |
| [Craft Anything](https://github.com/storytold/craft-anything/blob/main/crates/setup/src/skill.md) | `/craft-anything` | *Still evaluating.* Inspect a reference app or website before building a proof of concept. Requires Craft Anything's [CLI/MCP setup](docs/tools/craft-anything.md). | External skill / tool | [storytold](https://github.com/storytold/craft-anything) |
| [Figure It Out](skills/figure-it-out/SKILL.md) | `/figure-it-out` | *Still evaluating.* Plan, build, and check a small experiment. | Adapted skill | [Lauren Tan (poteto), pstack](https://github.com/cursor/plugins/tree/main/pstack); adapted by Mark DL |
| [REA: Reverse Engineer Anything](https://github.com/morluto/rea/blob/main/.agents/skills/reverse-engineer-anything/SKILL.md) | `/reverse-engineer-anything` | *Still evaluating.* Study shipped software before building a prototype. Requires REA and, for binary decompilation, [Ghidra](https://github.com/NationalSecurityAgency/ghidra) or another native engine. [Setup](docs/tools/rea.md). | External skill / tool | [morluto](https://github.com/morluto/rea) |
| [Think](https://github.com/tw93/Waza/blob/main/skills/think/SKILL.md) | `/think` | *Still evaluating.* Work through the idea and choose an approach before building. | External skill | [tw93, Waza](https://github.com/tw93/Waza) |

#### Feature workflow

I pick from these based on where the feature stands. Depende sa task.

| Name | Trigger / usage | Description | Type | Author / source |
| --- | --- | --- | --- | --- |
| [Grill Me](https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md) | `/grill-me` | Before a feature or project, question assumptions and settle scope. Use [`/prototype`](https://github.com/mattpocock/skills/blob/main/skills/engineering/prototype/SKILL.md) during the discussion when an experiment would help. | Skill | [Matt Pocock](https://github.com/mattpocock/skills) |
| [Chunk Plan for Spec Kit](skills/chunk-plan-for-spec-kit/SKILL.md) | `/chunk-plan-for-spec-kit` | Split a large plan into features with clear boundaries, dependencies, and build order. Keep a focused plan together. | Skill | Mark DL |
| [Start Spec Feature](skills/start-spec-feat/SKILL.md) | `/start-spec-feat` | Check readiness and specify one feature or selected chunk. Requires [Spec Kit](docs/tools/spec-kit.md) initialized in the project. | Skill | Mark DL |
| [Continue Spec Development](skills/continue-spec-development/SKILL.md) | `/continue-spec-development` | Resume a feature from its specs and tasks, then continue the requested phase. Requires [Spec Kit](docs/tools/spec-kit.md) and existing feature artifacts. | Skill | Mark DL |

### Review and verification

I use these to review changes, clean up code, and check the app's behavior.

| Name | Trigger / usage | Description | Type | Author / source |
| --- | --- | --- | --- | --- |
| [Create Verification Skill](skills/create-verification-skill/SKILL.md) | `/create-verification-skill` | For a runnable app, create and prove a project-local skill that drives user paths and captures evidence. [Walkthrough](docs/tools/verification-skills.md). | Adapted skill | [Lauren Tan (poteto), pstack](https://github.com/cursor/plugins/tree/main/pstack); adapted by Mark DL |
| [Maintain Verification Skill](skills/maintain-verification-skill/SKILL.md) | `/maintain-verification-skill` | As the app changes, check an existing verification skill against source and live behavior. Repair map or harness drift and report product regressions. | Adapted skill | [Lauren Tan (poteto), pstack](https://github.com/cursor/plugins/tree/main/pstack); adapted by Mark DL |
| [Review Loop for Claude](plugins/claude/review-loop/README.md) | `/review-loop` (personal install); `/review-loop:review-loop` (plugin) | Review and fix a change in Claude using fresh Codex CLI reviewers. Track progress and stop for circular fixes. [Setup and requirements](docs/tools/review-loop.md). | Claude plugin / personal skills | Mark DL |
| [Review Loop for Codex](skills/codex/review-loop/SKILL.md) | `$review-loop` | Review and fix a change in Codex using fresh, read-only subagents. Track progress and stop for circular fixes. [Setup and requirements](docs/tools/review-loop.md). | Codex skill | Mark DL |
| [Simplify](https://code.claude.com/docs/en/commands) | `/simplify` | For code cleanup, review reuse, simplicity, efficiency, and abstractions. Use a separate correctness review. | Built-in skill | Anthropic |

### Fixing a bug

These commands require [Spec Kit's bug extension](docs/tools/spec-kit.md#fixing-a-bug).
Use the same `slug` through assessment, fixing, and testing. Command spelling
varies by integration; the examples use the dotted form.

| Name | Trigger / usage | Description | Type | Author / source |
| --- | --- | --- | --- | --- |
| [Assess bug](docs/tools/spec-kit.md#fixing-a-bug) | `/speckit.bug.assess <report> slug=<name>` | Assess a report against the code and propose a fix without editing product source. | External command | [GitHub](https://github.com/github/spec-kit/tree/main/extensions/bug) |
| [Fix bug](docs/tools/spec-kit.md#fixing-a-bug) | `/speckit.bug.fix slug=<name>` | From an assessment, apply a scoped fix and record the changes. | External command | [GitHub](https://github.com/github/spec-kit/tree/main/extensions/bug) |
| [Test bug fix](docs/tools/spec-kit.md#fixing-a-bug) | `/speckit.bug.test slug=<name>` | After the fix, rerun the reproduction and relevant tests. Report verified, partial, or failed. | External command | [GitHub](https://github.com/github/spec-kit/tree/main/extensions/bug) |

### Use as needed

Get a session ready, try an idea, reflect on the work, or edit prose.

| Name | Trigger / usage | Description | Type | Author / source |
| --- | --- | --- | --- | --- |
| [Prototype](https://github.com/mattpocock/skills/blob/main/skills/engineering/prototype/SKILL.md) | `/prototype` | Explore a design question with a throwaway prototype. | Skill | [Matt Pocock](https://github.com/mattpocock/skills) |
| [Retro](https://github.com/mattpocock/skills/blob/main/skills/engineering/retro/SKILL.md) | `/retro` | After a coding session, identify useful improvements to instructions, automated checks, and tool use. | External skill | [Matt Pocock](https://github.com/mattpocock/skills) |
| [Spec Kit](docs/tools/spec-kit.md) | `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, etc. | Develop features through specifications, plans, and tasks. | External tool | [GitHub](https://github.com/github/spec-kit) |
| [Start Session](skills/start-session/SKILL.md) | `/start-session` | Work on tickets in parallel with one Git worktree per ticket. Check existing work, then add a ticket key to create or reuse its checkout. | Skill | Mark DL |
| [Unslop](https://github.com/poteto/noodle/blob/main/.agents/skills/unslop/SKILL.md) | `/unslop` | When prose feels stiff, remove filler and AI writing habits while preserving meaning and voice. | External skill | [poteto](https://github.com/poteto/noodle) |

### Trying out

I'm still evaluating UI in my projects. Check its provenance for changes and limits.

| Name | Trigger / usage | Description | Type | Author / source |
| --- | --- | --- | --- | --- |
| [UI](skills/ui/SKILL.md) | `/ui` | When building or refining UI, follow existing product styles and constraints, then inspect the rendered layout and interaction states. | Adapted skill | [tw93, Waza](https://github.com/tw93/Waza); adapted by Mark DL |

## Install what you need

Choose a tool from the catalog, then follow the setup for its distribution:

- Included skills: [Adopt a skill](docs/adopting-skills.md#install-an-included-skill)
  explains how to install the whole directory and preserve existing copies.
  Codex-specific skills use the installation guide linked from their entry.
- Plugins: open the package's README for its harness-specific installation.
  See the [Claude plugin catalog](plugins/claude/README.md).
- External tools and built-in skills: follow the linked author's or harness's
  instructions. External catalog entries are installed from their sources.

Prerequisites, account settings, and tool-specific examples live in the linked
guides. You can install one skill without installing the rest of the collection.

## Use this catalog with an agent

Ask your agent to read this README and [AGENTS.md](AGENTS.md). It should check
for our adaptation first, read its provenance, and explain the options before
installing or adapting a tool. If you've already selected a version, that choice
carries forward.

You can copy this prompt and replace `<tool name>`:

> Read this repository's README.md and AGENTS.md. Help me adopt `<tool name>`.
> Check for an existing adaptation and read its provenance. Compare it with the
> actual upstream source. If I haven't chosen a version, ask whether I want our
> adaptation, upstream as-is, or a fresh adaptation for my setup. Preserve my
> existing installations.

The [adoption guide](docs/adopting-skills.md) covers prerequisites, example
prompts, updates, and removal.

<a id="optional-workflow-examples"></a>

## Spell combinations

These are examples. Pick the parts you need.

- For a broad feature plan, use `/grill-me` to settle scope and `/prototype` when
  an experiment helps. `/chunk-plan-for-spec-kit` can find feature boundaries;
  `/start-spec-feat` and `/continue-spec-development` work on one selected feature
  through Spec Kit.
- For a bug report, use `/speckit.bug.assess`, `/speckit.bug.fix`, and
  `/speckit.bug.test` with the same slug. The
  [Spec Kit guide](docs/tools/spec-kit.md#fixing-a-bug) explains their required arguments.
- For a change ready to review, use `/simplify` for code cleanup and Review Loop
  for review and fix cycles (`/review-loop` in Claude, `$review-loop` in Codex).
  Run your app's verification skill to check user flows, and use
  `/maintain-verification-skill` when its saved checks need updating.

### A shortcut I use

I used to spell out the same feature flow for each ticket in Claude. Using today's
skill names, I'd start with `/start-session PROJ-123` to prepare the worktree,
then `/start-spec-feat` and `/continue-spec-development` to specify and build the
feature. After the code changes came `/simplify` and `/review-loop`, with
`/maintain-verification-skill` when the app's checks needed updating.

Now I use **`/ticket PROJ-123`**. The project skill carries that sequence, switches
to the bug workflow when needed, and includes the app checks and evidence steps.
I don't have to spell out the prompt or remember each check.

My `/ticket` is a Claude project skill; it isn't bundled here. Shipping still
follows the project's approval rules. Once you know which combination works for
your project, you can save it as a skill too.

## Documentation and attribution

- [Review Loop guide](docs/tools/review-loop.md): installation, accounts, models,
  invocation, and upgrading existing installations.
- [App verification walkthrough](docs/tools/verification-skills.md): generate,
  use, and maintain a project-local verification skill.
- [Spec Kit guide](docs/tools/spec-kit.md): feature planning and the bug workflow.
- [Third-party index](THIRD_PARTY.md): authors, sources, and licenses. Each
  included adaptation also has its own PROVENANCE.md.
- [Contributing](CONTRIBUTING.md): repository layout, packaging, promotion,
  publishing, and versioning rules.
- [Agent instructions](AGENTS.md): how agents maintain the collection and help
  users choose an adaptation.
- [Changelog](CHANGELOG.md): collection changes and component versions.

Original material is available under the [MIT license](LICENSE). Included
third-party material retains its own licenses and notices; see the
[source index](THIRD_PARTY.md).
