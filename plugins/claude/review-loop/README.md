# Review Loop for Claude Code

Claude applies fixes while a fresh, read-only Codex process reviews each pass.
The implementer checks every finding before editing, verifies the fixes, and
keeps a record of progress. Repeated or conflicting fixes stop for a decision.

## Get started

You need Claude Code, Codex CLI, Node.js, and Git. If Codex already works in your
terminal, you can use its existing login and model. There is no required
Review Loop account or model configuration.

Check the prerequisites:

```sh
node --version
git --version
codex --version
codex login status
```

If you have not signed in to Codex, run `codex login` first. See
[Codex authentication](https://learn.chatgpt.com/docs/auth) for supported login
methods.

### Personal install with the short command

From this repository's root, create these links when the destinations are free.
Compare and back up an existing installation before replacing it.

```sh
mkdir -p "$HOME/.claude/skills"
ln -s "$PWD/plugins/claude/review-loop/skills/review-loop" "$HOME/.claude/skills/review-loop"
ln -s "$PWD/plugins/claude/review-loop/skills/resolve-review" "$HOME/.claude/skills/resolve-review"
```

Start a new Claude session in the Git project you want to review:

```text
/review-loop
```

Use `/review-loop --base main` when the comparison branch is not detected
correctly. Use `/review-loop --final` for a full review before opening or merging
a pull request.

### Plugin install

Add the public marketplace and install the package:

```sh
claude plugin marketplace add markdl-dev/markdl-stack
claude plugin install review-loop@markdl-stack
```

To try it from a checkout:

```sh
claude --plugin-dir ./plugins/claude/review-loop
```

[Claude namespaces plugin skills](https://code.claude.com/docs/en/skills#choose-where-skills-load),
so invoke this installation with:

```text
/review-loop:review-loop
/review-loop:review-loop --final
```

The plugin also bundles the `resolve-review` processor, which the loop uses to
validate and fix findings. Personal installation exposes the shorter
`/review-loop` and `/resolve-review` commands. Choose one installation method to
avoid duplicate entries.

## Model and account settings are optional

The default uses your normal Codex configuration and login. Model access and
reasoning levels depend on that account and model. A model error stops the
review; the runner does not silently choose another model.

For a one-off choice:

```text
/review-loop --model YOUR_MODEL_ID --reasoning high
```

Replace `YOUR_MODEL_ID` with a model available to your Codex account. Model and
reasoning overrides apply to the reviewer, not to Claude's implementation model.
The separate [Codex skill](../../../skills/codex/review-loop/SKILL.md) uses the
active Codex session and its subagents.

For persistent preferences, create
`~/.config/review-loop/config.json` outside the checkout. Every field is optional:

```json
{
  "defaultAccount": "current",
  "model": "YOUR_MODEL_ID",
  "reasoningEffort": "high"
}
```

Omit `model` and `reasoningEffort` to inherit Codex's own settings. Codex
documents these in its [configuration reference](https://developers.openai.com/codex/config-reference).
An optional named profile, such as `work`, keeps a reviewer login separate.
See [account and local configuration](skills/review-loop/references/accounts.md)
for profile setup, environment overrides, and migration from earlier versions.

## Useful commands

| Command | When to use it |
| --- | --- |
| `/review-loop` | Let the runner choose the review scope. |
| `/review-loop --base develop` | Compare against a specific branch. |
| `/review-loop --final` | Review the full proposed change. |
| `/review-loop --scope uncommitted` | Review only working-tree changes. |
| `/review-loop --max-passes 6` | Set an optional total pass budget. |
| `/review-loop --account work` | Use a named profile you have configured. |
| `/review-loop --model YOUR_MODEL_ID --reasoning high` | Override reviewer settings for a new cycle. |

For plugin installation, use the qualified command shown above with the same
arguments.

## How a round works

1. Claude reads the project instructions and runs the relevant baseline checks.
2. A fresh Codex process reviews the selected changes. It receives no prior
   resolution arguments or deferred-finding ledger.
3. Claude checks each finding against the code and classifies it as valid,
   partially valid, invalid, or needing clarification.
4. Before editing, Claude traces affected callers, dependencies, contracts, and
   tests. It checks whether the remedy conflicts with an accepted fix.
5. Claude applies valid fixes and runs the relevant project checks. Changed code
   goes through another fresh review.

A round ending does not mean the review is finished. There is no default pass
cap. Fixes can continue while there is evidence of progress; an explicit
`--max-passes` adds a budget. The loop asks for a decision when it detects a
cycle or exhausts that budget.

## Priorities and circular fixes

| Findings | Passes 1 and 2 | Pass 3 onward |
| --- | --- | --- |
| Valid P0/P1 | Fix them or stop as blocked. | Still mandatory; cannot be deferred. |
| Valid P2/P3 | Attempt every finding. | Fix required correctness and acceptance issues. Other findings may be deferred with evidence, rationale, and follow-up. |

Stable issue identities and retained check results help detect reopened
defects, contradictory remedies, two unsuccessful correction attempts on one
issue, a passing check failing again, and a return to an earlier code state.
Progress on an unrelated finding cannot reset another issue's counter.

The runner enforces recorded transitions. Claude remains responsible for
truthful evidence, sound issue identities, and detecting semantic cycles that
fingerprints cannot establish. See the
[convergence policy](skills/review-loop/references/convergence-policy.md).

## Completion and saved state

Completion requires mandatory findings to be resolved, justified deferrals,
passing project checks, and a final review with no further mandatory fixes.
The summary records reviewed scope, passes, dispositions, and verification.

Artifacts remain in `.review-loop-v2/` so tested v2 cycles and checkpoints stay
readable after the public rename. The runner adds that directory to Git's local
exclude file. Legacy v1 artifacts in `.review-loop/` remain separate.

Account and model overrides stay pinned during an active cycle. Finish the cycle
before switching them. Native-login mode starts fresh on a later cycle because
the helper cannot bind a hidden credential-store identity to a checkpoint;
named profiles support identity-bound reuse.

## Validation

From this package directory:

```sh
node --test skills/review-loop/scripts/*.test.mjs
```

The tests use temporary Git repositories and mocked reviewers. They cover
scope, account isolation, model selection, progress, cycle stops, completion,
and explicit resume. They do not call a live model.
