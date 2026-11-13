# Start Session

Work on tickets in parallel with a separate Git worktree for each. Start Session
checks what's already in progress; add a ticket key to create or reuse its
checkout. Run each session in its ticket's worktree. Maintained by Mark DL.

## Install and use

Follow [Adopt a skill](../../docs/adopting-skills.md#install-an-included-skill)
with `start-session` as the skill name. Keep this entire folder together.

Use `/start-session` in Claude Code or `$start-session` in Codex. Add a ticket
key, such as `/start-session PROJ-123`, to read its scope and prepare a worktree.
Use `/start-session finish PROJ-123` only when you intend to remove its clean,
verified merged worktree. The equivalent Codex invocations start with `$`.

Git is required. A configured remote is needed for syncing and remote-merge
checks. Jira or PR summaries need their own tools and authentication only when
the project's adapter configures them. Generic local checks work without those
services; this package includes no tracker account or organization defaults.

Put project facts in `.agents/start-session.md` at the workspace root. See the
[adapter reference](references/adapter.md). Project instructions retain ownership
of branch naming, commit rules, external writes, and deployment.

## Shared version

This is the portable repository version of Mark DL's session workflow. Its
examples are generic, missing remotes or integrations are reported as skips,
and a project-local version may supply its own procedure. Existing personal
installations are not replaced by adding this package to the collection.

## Verification

On disposable local repositories, check these cases:

- A clean default-branch clone behind its remote can fast-forward and reports
  the commits it received.
- A dirty clone, another checked-out branch, or local commits ahead of the remote
  keeps its work intact and reports why the fast-forward was skipped.
- A repository without a remote or tracker still produces a truthful local brief.
- A dirty worktree is in progress even if its branch's earlier commits merged.
- An existing ticket worktree is reused; an unapproved conversion or cleanup does
  not run. Finish mode refuses dirty or unverified targets.

These checks verify Git procedures and packaging. Each configured service and
host still needs its own integration check; a passing local fixture is not a
claim that Jira or PR access has been tested.
