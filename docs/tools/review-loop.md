# Review Loop

Review Loop has two implementations with the same finding and convergence
policy. Pick the one for the session where you do the implementation work.

| Use it in | Install | Trigger | Reviewer |
| --- | --- | --- | --- |
| Claude Code, personal skills | [Claude setup](../../plugins/claude/review-loop/README.md#personal-install-with-the-short-command) | `/review-loop` | A fresh Codex CLI process |
| Claude Code, plugin | [Plugin setup](../../plugins/claude/review-loop/README.md#plugin-install) | `/review-loop:review-loop` | A fresh Codex CLI process |
| Codex | [Codex skill](../../skills/codex/review-loop/SKILL.md) | `$review-loop` | A fresh, read-only Codex subagent |

## Get started

Follow the [Claude installation](../../plugins/claude/review-loop/README.md#get-started)
or [Codex installation](#install-in-codex), then use the matching trigger above.
Add `--final` when you want the whole change reviewed before a pull request.
The model and account defaults are explained below.

## Do users have to choose a model and account?

Usually, no. The Claude package uses the model and login already configured for
Codex CLI. If the CLI has not been set up, sign in with `codex login` and confirm
`codex login status` first. See
[Codex authentication](https://learn.chatgpt.com/docs/auth).

The Codex skill uses the active session and its subagents. It does not require
the Claude package's local configuration or a separate account.

For the Claude package, `--model`, `--reasoning`, and `--account` provide optional
overrides. Save personal defaults outside the repository in
`~/.config/review-loop/config.json`. See the
[account and settings guide](../../plugins/claude/review-loop/skills/review-loop/references/accounts.md).
Model availability is determined by the selected account; an unavailable model
stops the run.

## Install in Codex

From the repository root, link the full skill directory when the destination is
free. Compare and back up an existing copy before replacing it.

```sh
mkdir -p "$HOME/.codex/skills"
ln -s "$PWD/skills/codex/review-loop" "$HOME/.codex/skills/review-loop"
```

Start a new Codex session in the Git project and invoke:

```text
$review-loop
$review-loop --final
```

Run helper tests from `skills/codex/review-loop/`:

```sh
node --test scripts/review-loop.test.mjs
```

## Existing installations

The tested v2 workflow is now the main `review-loop`; the earlier pass-limited
implementation remains in Git history. Install the canonical paths above when
upgrading. Keep a backup of an older editable installation before replacing it.

The state directory remains `.review-loop-v2/` for continuity. Do not rename
it or merge it with old v1 `.review-loop/` history. Claude and Codex use
different runner interfaces, so keep an active cycle in its original harness.

Existing isolated account stores keep their locations. The Claude package
also reads the older `~/.config/review-loop-v2/config.json` when the canonical
configuration file does not exist. Explicit `REVIEW_LOOP_CONFIG` and
`REVIEW_LOOP_ACCOUNTS_DIR` overrides remain supported.
