# AGENTS.md

## Purpose

Use "Mark DL" for the maintainer's public display name and author metadata.
Use "markdl-stack" as the README's public title. The spell and
crafting theme belongs in presentation copy and artwork; preserve actual skill
names, commands, source credits, package names, and directory names.

This repository contains working tools that are safe to share across agent
harnesses. Treat the repository copy as the canonical source for every tool
stored here. Do not maintain a second editable copy in a harness installation
directory.

## Repository structure

```text
skills/<skill-name>/              Harness-neutral skills
skills/codex/<skill-name>/        Standalone Codex-specific skills
plugins/claude/<plugin-name>/     Claude plugin packages
plugins/codex/<plugin-name>/      Codex plugin packages
```

Use lowercase kebab-case for skill and plugin directory names.

Keep the README focused on choosing and adopting tools. Use this order: short
introduction and version, quick navigation, Catalog, Install what you need, Use
this catalog with an agent, Optional workflow examples, Documentation and
attribution. Keep the five catalog sections: Working on a feature, Review and
verification, Fixing a bug, Use as needed, and Trying out.
Keep table columns exactly: Name, Trigger / usage, Description, Type,
Author / source. Lead descriptions with the use case and outcome; link longer
setup, account, dependency, and usage details to tool guides. Retain Spec Kit
dependencies in the feature descriptions and the bug-extension requirement
alongside its commands. Keep original authors and adaptation credits visible.
Use a general installation entry rather than a separate README quick start for
one tool. Keep workflow examples optional and preserve the adaptation-selection
prompt and existing version choices. Put repository layout, packaging, promotion,
and publishing details in CONTRIBUTING.md or this file; link them from the
README footer alongside guides, attribution, changelog, and license status.

Update the README catalog when adding a tool. Do not add a Harness column.
Explain bundled versus external tools in
the surrounding text; do not add an Availability column.
Link included skills directly to SKILL.md, plugins to their README, and external
tools to upstream instructions or a guide under docs/tools/. Record external
references in THIRD_PARTY.md without implying their source is bundled.
Keep the README's Working on a feature table in usage order: Grill Me, Chunk
Plan for Spec Kit, Start Spec Feature, Continue Spec Development.
Keep the Fast prototypes and POCs highlight table before that feature workflow,
with Craft Anything, Figure It Out, REA, and Think marked as still evaluating. List
each tool once in the catalog; evaluation status can appear in the highlight
without duplicating its row under Trying out. Craft Anything links upstream and
requires its CLI/MCP setup.
REA also links upstream; document its CLI/MCP setup and Ghidra or another native
engine for binary decompilation. Static JavaScript analysis needs no native engine.
The approved mage graphic lives at `assets/catalog.svg`, below the introduction
and above navigation. Preserve its five catalog groups and light/dark support.
Keep comparison prototypes and private artwork provenance out of the public tree.
Describe these as tools to choose from, not mandatory numbered steps. Mention
Prototype alongside Grill Me and also keep its separate Use as needed entry.
Put review, verification, and code-cleanup tools in Review and verification:
Create Verification Skill, Maintain Verification Skill, Review Loop for Claude,
Review Loop for Codex, and Simplify. Keep that table alphabetical, including
future review tools, and explain each tool's scope in its description.
Keep session retrospectives such as Retro in Use as needed, with tools listed
alphabetically.
Keep Start Session in Use as needed. Its shared package is harness-neutral;
project remotes, ticket sites, and service tools belong in a local adapter.
Describe it as preparation for parallel ticket work, with a separate Git worktree
per ticket. It prepares checkouts and reports state; it does not launch parallel
workers by itself.
Workflow shortcuts such as `/ticket PROJ-123` are project-local examples. State
their target harness and whether they are bundled. Keep their project commands,
verification gates, and approval rules local rather than publishing private
configuration or implying one call is permission to ship.
Explain their benefit through a short narrative, with each skill command in
inline code and the shorter call that replaces the repeated prompt. Keep these
examples out of fenced command blocks. Use current catalog names and generic
ticket keys in public examples.
Split the shortcut story into readable paragraphs and emphasize the new call.
In usage prose, show invocations in inline code so readers can recognize the
commands; preserve normal tool names in catalog name and attribution columns.
Keep Trying out alphabetical and explicitly under evaluation. Link upstream
sources for unchanged tools. Include reviewed adaptations deliberately promoted
by the user, retaining their evaluation status. Keep experimental review tools
in Trying out until promoted to Review and verification.
Keep the Fixing a bug table in assess, fix, test order. Link these external
commands to the Spec Kit guide and state their bug-extension dependency.
Keep the THIRD_PARTY.md index alphabetical. Link built-in harness skills to
official documentation and distinguish them from packages distributed here.

### Harness-neutral skills

A portable skill belongs in `skills/<skill-name>/` and must have a `SKILL.md`
entry point. Keep its scripts, references, templates, examples, and assets
inside the same skill directory so it can be installed as one unit.

Do not put Codex-only or Claude-only assumptions in a portable skill unless the
skill clearly marks those sections as optional platform behavior. Prefer plain
instructions and portable scripts over harness-specific commands.

### Codex skills

Keep Codex-specific standalone skills under `skills/codex/`, with the full skill
directory as the installation unit. In catalog entries, name the target harness
when Claude and Codex versions share a skill name. Link installation details to
`docs/tools/review-loop.md` when adding or updating either Review Loop implementation.

### Claude plugins

A Claude plugin belongs in `plugins/claude/<plugin-name>/`. Keep the complete
Claude package, including its manifest and packaged resources, inside that
directory. A plugin may bundle or refer to shared skill content when the Claude
plugin format requires it, but avoid silently creating a second canonical copy.

### Codex plugins

A Codex plugin belongs in `plugins/codex/<plugin-name>/`. Each package must
include `.codex-plugin/plugin.json` and all resources needed by the plugin. Keep
plugin-specific skills, MCP configuration, apps, and documentation inside the
plugin directory.

## What agents may add

Only add a tool when it already works in every environment its documentation
claims to support. Experimental, broken, private, or machine-specific work stays
outside this repository until it is ready to promote. A user may explicitly
promote a working adaptation still under evaluation; keep its limits visible in
Trying out and its provenance rather than implying full workflow validation.

## Using the catalog with a user

Use README.md as the tool index and THIRD_PARTY.md as the source index. Before
recommending, installing, or adapting a listed tool:

1. Check whether this repository includes an adaptation. Read its SKILL.md and
   PROVENANCE.md, including dependencies, changes, and evaluation status. An
   external catalog link alone is not a bundled adaptation.
2. If an adaptation exists and the user has not chosen a version, briefly explain
   what differs and ask whether they want our existing adaptation or a fresh
   adaptation of the actual upstream source for their setup. Include upstream
   unchanged as a choice when it already fits. Wait for that choice before the
   dependent installation or adaptation.
3. If none exists, say so. Inspect the actual upstream instructions and license;
   ask whether the user wants upstream as-is or an adaptation when a material
   setup decision remains. Do not reconstruct an author's work from its catalog
   summary or call an older installed snapshot our adaptation without evidence.
4. Carry forward an explicit choice. A request to use our adaptation, adapt
   upstream, or perform an already-selected installation needs no second version
   question. Reading the catalog and investigating sources may proceed meanwhile.
5. Follow docs/adopting-skills.md for installation and
   docs/tools/verification-skills.md for the verification pair. Explain required
   tools and how to invoke the selected skill. Preserve existing installations
   and personal configuration; installing into a user's harness is separate from
   adding files to this repository.

Keep the original author visible for both adaptations and external tools. A
fresh adaptation needs a licensed, pinned source, a record of its actual changes,
and a verification procedure. Honor the user's requested scope; a catalog entry
does not authorize unrelated setup, account changes, or publishing.

Before adding or changing a tool, an agent must:

1. Inspect the target harness requirements and the nearest existing tool for
   repository conventions.
2. Confirm the tool contains no secrets, private URLs, personal data, local-only
   absolute paths, or files without redistribution rights.
3. Keep the change scoped to one self-contained skill or plugin when practical.
4. Document prerequisites, installation, usage, supported harnesses, and a
   repeatable validation command or procedure.
5. Run the documented validation and inspect the complete Git diff before
   considering the change ready to publish.

## Third-party sources and attribution

Do not recreate, copy, translate, or lightly rewrite another author's skill or
plugin to avoid referencing its source. Prompts, scripts, examples, templates,
and assets may be protected material even when they are easy to copy.

Prefer these approaches in order:

1. Link users to the author's maintained repository or marketplace when the
   upstream package already works.
2. Depend on or install from a pinned upstream release when a stable dependency
   mechanism exists.
3. Vendor or fork the tool only when its license permits redistribution and the
   repository needs a reviewed, stable snapshot or material adaptation.
4. Write an independent implementation only from requirements and observed
   behavior when copying is unnecessary; do not copy expressive instructions or
   code from an incompatible or missing license.

Every vendored or materially adapted tool must include a `PROVENANCE.md` in its
directory recording the original author, upstream URL, imported tag or full
commit SHA, license, local changes, and update method. Preserve the upstream
license and notices. Add the same tool to the repository-level `THIRD_PARTY.md`
index.

For a previously adapted local copy whose original import cannot be recovered,
state that limitation and record a pinned upstream comparison baseline. Never
present the comparison revision as the original import.

If no license is present upstream, treat the material as not redistributable.
Link to the original source or ask the author for permission instead of copying
it into this repository.

When adapting an upstream tool, keep its original identity clear in the README
and metadata. Use “fork of,” “adapted from,” or “based on” as appropriate. Do
not list the local maintainer as the sole author of copied work.

Do not move an unfinished local tool into this repository merely to work on it.
Copy or move it here only as a deliberate promotion after validation, then make
this repository its canonical source.

## Creating a skill

Create a new directory at `skills/<skill-name>/` with this minimum layout:

```text
skills/<skill-name>/
  SKILL.md
```

Add `scripts/`, `references/`, `assets/`, or `templates/` only when the skill
needs them. Resolve paths relative to the skill directory. Avoid dependencies on
the checkout location or the current user's home directory.

The `SKILL.md` frontmatter and instructions must state a narrow purpose and
clear trigger conditions. Instructions should tell an agent what outcome to
produce, what evidence to inspect, and how to verify completion.

## Creating a plugin

Create the package beneath the directory for its target platform. Follow the
current platform manifest specification and include a plugin-level README with:

- supported platform and minimum version, if applicable;
- installation and removal instructions;
- permissions, external services, and dependencies;
- included commands, skills, hooks, apps, or MCP servers;
- validation or smoke-test steps.

If equivalent Claude and Codex plugins share substantial behavior, keep the
portable behavior in `skills/` or another explicitly shared source directory.
Keep each platform package independently installable and testable.

## Installing with symlinks

Run symlink commands from the repository root. Replace `<skill-name>` or
`<plugin-name>` with the actual directory name.

### Shared skills directory

Use `~/.agents/skills` as the default cross-harness skill installation:

```sh
mkdir -p "$HOME/.agents/skills"
ln -s "$PWD/skills/<skill-name>" "$HOME/.agents/skills/<skill-name>"
```

Before creating a link, inspect the destination. Never overwrite an existing
directory or symlink automatically. If an older editable copy exists, compare
it with the repository version, preserve unique changes, and replace it only
after the canonical copy is confirmed.

Use an absolute symlink target so the link works regardless of the harness's
current directory. Verify it with:

```sh
readlink "$HOME/.agents/skills/<skill-name>"
test -f "$HOME/.agents/skills/<skill-name>/SKILL.md"
```

### Harness-specific skill directories

When a harness does not discover `~/.agents/skills`, link the same canonical
skill into its configured skill directory. Common local destinations may
include `~/.claude/skills` and `~/.codex/skills`, but agents must inspect current
harness configuration before assuming either path.

```sh
ln -s "$PWD/skills/<skill-name>" "$HOME/.claude/skills/<skill-name>"
ln -s "$PWD/skills/<skill-name>" "$HOME/.codex/skills/<skill-name>"
```

Do not create all three links when the harnesses already share
`~/.agents/skills`; use the smallest installation surface that works.

### Plugins

Plugin installation paths and discovery rules vary by platform and may change.
Read the current Claude or Codex plugin documentation and inspect the local
configuration before linking a plugin. Link the complete plugin directory, not
individual manifest or resource files, unless the platform explicitly requires
a different layout.

## Updating installed tools

Edit files in this repository, validate the tool, and commit the result. A
correct symlink makes the update immediately available to the local harness, so
agents must consider whether a running harness needs to restart or reload its
tool index.

Never edit through multiple installation paths in the same change. Resolve the
symlink and edit the canonical repository path so Git captures the work.

## Removing installed tools

Remove only the symlink from the harness installation directory. Do not delete
the canonical repository directory as part of uninstalling a local tool. Before
removing anything, verify with `test -L` that the destination is a symlink and
inspect its target with `readlink`.

## Git and publishing

Follow CONTRIBUTING.md's versioning rules. VERSION owns the collection version;
plugin manifests own component versions. Add user-visible changes to
CHANGELOG.md under Unreleased, and update provenance when adapting upstream
material. Preparing a release moves entries into a dated version section and
updates VERSION; do not create release tags or publish without authorization.

Keep commits focused and reviewable. Do not commit generated caches, dependency
directories, environment files, credentials, or local harness state. Review
`git status` and `git diff --staged` before every commit.

Keep personal planning drafts outside this repository. If local scratch files
must stay inside the checkout, use the ignored `.local/` or `docs/drafts/`
directories and leave them untracked. Public usage guides, tool provenance,
licenses, and repeatable verification instructions belong in version control.

Do not push, publish a release, or make a repository public unless the user has
authorized that external action. Before the first public push, select a license
and perform secrets, privacy, license, and third-party attribution reviews over
the complete repository history.
