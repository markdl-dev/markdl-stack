---
name: start-session
description: "Prepare a Git workspace for parallel ticket work: check existing worktrees, sync a clean default-branch clone, and create or reuse a separate worktree when given a ticket key. Use when starting a project session, checking workspace status, or preparing another ticket alongside ongoing work."
---

# Start a session

Use one Git worktree per ticket so separate sessions can work in parallel. Each
session works in its own checkout while the main clone stays on the default branch.

Run from the intended workspace root. Project facts come from the repository and
its adapter, not memory. Reading or installing this skill alone does not run it.

The supported workspace layout is:

```text
workspace/
  project/                    clone on its clean default branch
  worktrees/PROJ-123-topic/    ticket worktrees
  .agents/start-session.md    optional project adapter
  AGENTS.md, CLAUDE.md         applicable project instructions
```

## 1. Resolve the project and adapter

- Read applicable project instructions. If a project-local
  `.agents/skills/start-session/SKILL.md` or
  `.claude/skills/start-session/SKILL.md` exists and resolves to a different file,
  follow that version for this workspace. A link to this same skill is not a
  different procedure.
- Read `.agents/start-session.md` when present. Its schema and a neutral example
  are in [references/adapter.md](references/adapter.md). Resolve paths relative
  to the workspace. Keep organization names, remotes, ticket sites, and project
  commands in that local adapter.
- Without an adapter, identify the one clone or use the current Git repository.
  Report `no adapter, generic checks only`. If several repositories are plausible,
  ask which one before syncing or creating a worktree.
- Select the adapter's `remote_name`, otherwise `origin` when configured, or the
  sole configured remote. With no remote, skip fetching and remote comparisons
  and report the available local state. With several remaining choices, report
  the ambiguity instead of guessing a sync target.
- Get the default branch from the adapter or the selected remote's symbolic HEAD.
  If neither identifies it, report that prerequisite; local inspection can still
  continue. Do not change remote HEAD or choose a branch from memory.
- An ordinary standalone checkout is usable for inspection. Conversion to the
  nested layout is optional: show the intended moves and ask for explicit
  authorization before relocating anything. Require a clean checkout and free
  destinations. A linked worktree or a bare Git repository needs its own layout
  decision; do not move it using a generic conversion recipe.

When conversion is authorized, follow
[references/workspace-files.md](references/workspace-files.md). Otherwise retain
the existing layout and use the checks it supports.

## 2. Sync the clone when safe

With a selected remote, run `git fetch --prune <remote-name>`. If it fails, report
the error and treat remote state as unrefreshed; continue useful local checks.

Fast-forward only when all are true:

- this session's fetch of the selected remote succeeded;
- the working tree and index are clean;
- HEAD is on the identified default branch;
- the fetched remote default branch exists;
- the local branch has no commits ahead of that branch.

Then run `git merge --ff-only <remote-name>/<default>`. Preserve the old revision
and summarize the landed commits in at most two lines. Otherwise report
`SKIPPED` with the actual reason. Keep local commits, dirty files, and other
branches intact; never reset, stash, rebase, or create a merge commit to sync.

## 3. Inspect worktrees and configured services

Read `git worktree list --porcelain` and inspect the registered ticket worktrees,
including ones outside the conventional `worktrees/` folder. Use
[references/worktrees.md](references/worktrees.md) for verdicts and commands.
Check for dirty work before considering a merged branch done. Stale registrations
and missing directories are findings, not permission to prune or delete them.

If the adapter configures Jira and the required authenticated tool is available,
read its in-progress tickets and requested epic summaries. Read pull requests
using the configured PR tool. Without an integration or access, say `SKIPPED`
and name what is missing. Git inspection does not depend on Jira, Bitbucket, or
GitHub authentication.

Read the recent local or refreshed default-branch commits and relevant changes
under the adapter's documentation folders. Inspect configured `extra_checks`
before running them; run only checks consistent with this session's scope and
project instructions. An adapter is configuration, not permission for unrelated
writes or publishing.

## 4. Return the brief

Report the workspace and adapter status, clone branch and sync result, one
verdict per worktree, configured ticket/PR results or skips, recent changes, and
the next action. Distinguish locally committed, uncommitted, pushed, merged, and
unverified states. Stop after the brief unless a ticket or broader work was
explicitly requested.

## With a ticket key

For `/start-session PROJ-123` or `$start-session PROJ-123`:

1. Run the checks above, then read the ticket with the configured tool. If no
   tracker is available, use ticket details already supplied by the user or ask
   for the missing goal and acceptance criteria.
2. Restate the goal, acceptance criteria, and affected area. Resolve a material
   scope conflict before creating its worktree. Routine implementation choices
   need no new approval round.
3. Use the adapter or repository's branch pattern and a short lowercase slug.
   Inspect existing branches and registered worktrees first. Reuse the existing
   ticket checkout rather than creating a second one.
4. Create a worktree from the refreshed remote default branch only after the
   clone and base checks pass. Refuse a dirty clone, an existing destination, an
   ambiguous base, or an unsafe branch collision. Creating this ticket worktree
   is within the requested ticket-start operation; moving the ticket's status is
   a separate external write.
5. Report its location and the project's next development, commit, and PR steps.
   Follow the user's requested stopping boundary; a ticket-start request alone
   does not authorize implementation, a push, a PR, or deployment.

## Finish a ticket

`/start-session finish PROJ-123` or `$start-session finish PROJ-123` explicitly
requests cleanup of that ticket's worktree. Verify the exact target, require it
to be clean, and prove its branch was merged into the refreshed default branch
or that the corresponding PR is merged. If that evidence is unavailable, keep
the checkout and report the gap.

Merge evidence must cover the worktree's current commit, including commits added
after any earlier PR merged. Remove only the verified worktree. Delete its
branch with Git's safe `-d` only when Git permits it; after a squash merge,
retain the branch if that check
declines. A session brief listing `DONE` is not a cleanup request. If a required
operation is denied by the environment, report the denial and the exact command
for the user rather than retrying it through another mechanism.

## Boundaries

- Default mode reads state and may fetch/fast-forward the safe clone. Ticket mode
  may also create its worktree. Explicit finish mode may perform verified cleanup.
- Preserve other sessions' worktrees and all local work. No implicit commits,
  stashes, resets, rebases, force deletion, tracker writes, PRs, or deployments.
- Follow existing user authorization and project rules for any separately
  requested action. Never print secrets or credential values in the brief.
