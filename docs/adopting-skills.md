# Adopt a skill

Start with the [catalog](../README.md#catalog). Pick the tool for the work in
front of you. You can install one skill without installing the rest of this
collection.

## Choose the version first

An **adapted skill** has its own directory here, with SKILL.md, PROVENANCE.md,
and the upstream license. Read its provenance to see what changed. An
**external skill** links to the author's distribution and is installed from
there. A built-in skill comes with its harness.

When an agent helps you choose, it should check for an existing adaptation
first and ask whether you want that version or a fresh adaptation from the
actual upstream source. Upstream unchanged is also an option when it fits.
If you've already chosen a version, the agent can proceed with that choice.

For example, ask:

> Read this repository's catalog and AGENTS.md. I want a verification skill for
> my app. Check our adaptation and its upstream source, explain the differences,
> then ask which version I want before installing or adapting it.

## Install an included skill

Open a terminal in your clone of this repository. Set the skill name below.
These commands link the complete directory, including its references and
helpers. The source stays in this checkout.

```sh
# Run from the shared-agent-tools repository root.
skill_name=create-verification-skill
source_dir="$PWD/skills/$skill_name"
target_dir="$HOME/.agents/skills"
skill_link_ready=false

if [ ! -f "$source_dir/SKILL.md" ]; then
  echo "No included skill at $source_dir"
else
  mkdir -p "$target_dir"
  if [ -e "$target_dir/$skill_name" ] || [ -L "$target_dir/$skill_name" ]; then
    echo "Already exists: $target_dir/$skill_name. Compare it before replacing it."
  else
    if ln -s "$source_dir" "$target_dir/$skill_name"; then
      skill_link_ready=true
    fi
  fi
fi
```

Codex can discover the shared `~/.agents/skills` directory. For Claude Code,
link the same directory into `~/.claude/skills` if your setup does not already
expose the shared skill there. After running the first block, in the same shell:

```sh
if [ "$skill_link_ready" = true ]; then
  mkdir -p "$HOME/.claude/skills"
  if [ -e "$HOME/.claude/skills/$skill_name" ] || [ -L "$HOME/.claude/skills/$skill_name" ]; then
    echo "Claude destination exists; inspect it before replacing it."
  else
    ln -s "$source_dir" "$HOME/.claude/skills/$skill_name"
  fi
else
  echo "Resolve the shared installation above before adding a Claude link."
fi
```

If a destination already exists, inspect its link target or compare its files.
Preserve local changes and decide which copy is canonical before replacing
anything. These examples deliberately leave an existing destination alone.
Keep the checkout in place while using its symlinks. You can also copy the
whole skill directory into your harness's skill directory; updates then need
to be copied deliberately.

Restart or reload the agent's skill list if the new skill is not shown. In a
fresh session, check discovery by typing `$create-verification-skill` in Codex
or `/create-verification-skill` in Claude. Type the command as part of the task
you want performed; invoking it starts that workflow.

Review Loop has different packaging. Use its
[Claude and Codex setup guide](tools/review-loop.md).

## What each adaptation needs

| Skill | Before using it | Example request |
| --- | --- | --- |
| [Create Verification Skill](../skills/create-verification-skill/SKILL.md) | A runnable app, source access, and a way to drive its main surface. The skill inspects existing commands and harnesses first. | `$create-verification-skill Create and prove a verification skill for this app.` |
| [Maintain Verification Skill](../skills/maintain-verification-skill/SKILL.md) | An existing project verification skill and feature map, plus the tools and test access that skill needs. Source review can run serially if subagents are unavailable. | `$maintain-verification-skill Audit this app's verification skill and recheck every mapped feature.` |
| [Figure It Out](../skills/figure-it-out/SKILL.md) | Source material for the decision or project. Python 3 is needed only for the bundled logging helper; the core has a manual logging fallback. Optional standards and Spec Kit integrations need their own setup. Still under evaluation. | `$figure-it-out Plan this migration, test the risky assumptions, and stop before implementation.` |
| [UI](../skills/ui/SKILL.md) | The UI source, its existing design constraints, and a browser or renderer for visual checks. Without rendering, the agent must report the remaining verification gap. Companion skills are optional. Still under evaluation. | `$ui Improve this settings screen using the app's existing styles and check desktop and narrow layouts.` |

For Claude, replace the leading `$` with `/`. Other harnesses may use
different discovery paths or invocation syntax; follow their skill-loading
instructions and keep the whole directory together.

No adaptation requires Mark's personal accounts, workspace names, or standards
packages. The two verification skills do not require Spec Kit. The generated
`verify-<app>` skill can have real project prerequisites, such as browser
automation, local credentials, fixtures, or a native simulator. It should discover
and document them.

## Make it fit your project

Keep reusable instructions in the installed skill. Put app-specific launch
commands, selectors, ports, data directories, fixtures, and evidence locations
in the project-local `verify-<app>` skill that the generator creates. Start with
the [verification walkthrough](tools/verification-skills.md).

For a fresh adaptation, read and pin the author's actual source, check its
license, and document the changes in PROVENANCE.md. Keep required license and
copyright notices. Adapt paths, dependencies, and examples to the user's
project rather than copying private defaults from a different installation.

## Check, update, and remove

Read SKILL.md and confirm its local references and helper files are present.
Then perform its documented proof on a disposable or approved test environment.
For verification skills, a healthy process alone is insufficient: drive a
real user path, capture the result, clean up, and confirm the evidence remains.

Symlinked skills use changes from this checkout immediately. Review updates and
their provenance before using them in a running task. Copied installations need
an explicit refresh that preserves local changes.

To uninstall, inspect the destination with `readlink` and confirm `test -L`
succeeds before removing just that symlink. Keep the canonical source and any
project verification artifacts you still need.
