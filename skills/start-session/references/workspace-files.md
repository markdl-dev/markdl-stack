# Optional workspace conversion

A standalone checkout can be inspected without conversion. Convert it only after
the user explicitly chooses the nested workspace layout.

Before moving files, verify a clean checkout, inspect linked worktrees, show the
exact intended source/destination paths, and confirm that every destination is
free. Preserve repository metadata and existing local configuration. Stop if the
layout cannot be relocated safely; do not apply a generic destructive shell line.

After an authorized conversion, the workspace contains the clone in its named
subdirectory, `worktrees/`, and `.agents/start-session.md`. Use
[adapter.md](adapter.md) for the adapter. Populate known facts from Git and the
user's established context; leave missing service integrations disabled.

Add or update the workspace's applicable `AGENTS.md` or `CLAUDE.md` only within
the authorized setup. Describe the clone/worktree layout, point to the adapter,
and preserve the project's commit, PR, and external-write rules. Do not copy
another project's organization names, accounts, deployment commands, or policies.

Workspace files may live outside the clone, but check whether a parent Git
repository tracks them before calling them private or untracked.
