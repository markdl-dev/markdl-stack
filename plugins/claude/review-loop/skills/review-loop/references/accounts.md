# Reviewer accounts

A new installation uses `current`: the normal Codex CLI environment, login,
and credential configuration. A named profile is optional.

```text
/review-loop
/review-loop --account current
/review-loop --account work --final
```

Profile names are lowercase letters, digits, and hyphens, start with a letter,
and contain at most 64 characters. `current` is reserved for the normal login.

## Account selection

The runner selects the account in this order:

1. An explicit `--account` option.
2. The account already pinned to an active cycle.
3. `REVIEW_LOOP_ACCOUNT` in the invoking environment.
4. `defaultAccount` in local configuration.
5. `current`.

An explicit option cannot change an active cycle's account. Finish that cycle
using its existing account first. Local default changes take effect on the next
cycle; later passes, assessments, resolutions, resume, and completion retain the
active cycle's selection.

## Local defaults

Keep personal preferences outside the checkout. The default configuration path
is `~/.config/review-loop/config.json`, or
`$XDG_CONFIG_HOME/review-loop/config.json` when `XDG_CONFIG_HOME` is set.
`REVIEW_LOOP_CONFIG` can point to a different file.
If the canonical file is absent, the runner reads the older
`~/.config/review-loop-v2/config.json` location for compatibility.

```json
{
  "defaultAccount": "work"
}
```

Use an existing named profile as the value, or choose `current`. The setting
contains only the profile name. It does not create a login or contain secrets.
A malformed setting stops the command rather than choosing another account.

For a session-only default:

```sh
export REVIEW_LOOP_ACCOUNT=work
```

The runner reads this configuration itself. Existing installations linked to
the checkout pick up the local preference without a wrapper command.

## Optional reviewer model

New installations inherit Codex's model and reasoning settings. To override them
for a new cycle, use `--model <id>` and `--reasoning <effort>` in the skill
invocation. Model availability and supported reasoning levels depend on the
selected account and model. The runner stops on a model error without silently
choosing a replacement.

Persistent overrides use optional `model` and `reasoningEffort` fields in the
same local configuration file. `REVIEW_LOOP_MODEL` and
`REVIEW_LOOP_REASONING_EFFORT` override those fields for a session; explicit
command options take precedence. Omit both fields to inherit Codex defaults.

The selected overrides are recorded and pinned during an active cycle. Changing
local defaults takes effect only on the next cycle; explicit changes to active
overrides are rejected. Completed coverage from a different override is not
reused. An existing v2 cycle without recorded overrides retains its historical
`gpt-6-sol` and `xhigh` settings until it ends.

## Current Codex login

Use `codex login` and `codex login status` to manage the normal CLI login.
The runner forwards the inherited environment and does not create or overwrite
credential files, select a credential backend, or force a login method for
`--account current`.

Native credential stores may not expose a stable account identity to this
helper. Current-login cycles therefore start fresh rather than reusing a
completed cycle or an incremental checkpoint from an earlier cycle. Active
cycles retain their scope and convergence history. Use a named profile when you
want identity-bound checkpoint reuse.

## Named isolated profiles

Run these commands from a terminal; no Git repository is required:

```sh
node <skill-directory>/scripts/review-accounts.mjs login work
node <skill-directory>/scripts/review-accounts.mjs status work
```

Complete the browser flow using the intended account and workspace. Check the
email shown after login. Profile names are local labels; a label does not verify
which organization or workspace was selected. For headless login, add
`--device-auth` when that login method is enabled for the account.

Each profile's credentials and reviewer-local Codex state live under:

```text
~/.local/share/review-loop-v2/codex-accounts/<profile>/
```

`REVIEW_LOOP_ACCOUNTS_DIR` can choose a different storage root. Keep it outside
project source and unchanged during a cycle. Existing named-profile directories
continue to work without moving or copying credentials.
The storage directory retains its historical name to preserve existing logins.

Named profiles use a child-only `CODEX_HOME`, ChatGPT login, and file-based
credential storage. The runner removes inherited API-key/access-token variables
for these children and forces the OpenAI provider. Missing or invalid named
credentials stop the review; the runner never falls back to the current login.
It rejects profile stores that overlap the main Codex home and linked credential
or configuration files. System-enforced authentication requirements still apply.

Reports, state, history, and checkpoints record the account label and a digest
of the named ChatGPT user/workspace identity. They do not record credentials or
email addresses. Treat each profile's `auth.json` as a password and keep it out
of source control and review artifacts.

## Existing v2 history

Active named cycles retain their account, including profiles created before
local defaults were introduced. Reauthenticating a profile as another
user/workspace blocks its active cycle; restore the original login to continue.
Completed checkpoints cannot substitute for another named account's review.

Saved reports remain processable while signed out. The next fresh review
requires the selected account to be available. Older reports without account
metadata retain their original labels; the first account-aware continuation of
an older incremental cycle upgrades to full scope while preserving pass count,
findings, and convergence history.

Account selection alone does not change model overrides or the convergence policy.
