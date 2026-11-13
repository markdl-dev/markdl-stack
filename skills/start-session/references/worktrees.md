# Worktree checks and verdicts

Read registered entries from `git worktree list --porcelain`. A conventional
folder name does not establish ownership or merged status. Check each existing
worktree's actual state, and report missing or prunable registrations separately.

| Fact | Read command |
| --- | --- |
| Registered worktrees | `git -C REPO worktree list --porcelain` |
| Branch | `git -C WORKTREE rev-parse --abbrev-ref HEAD` |
| Local changes | `git -C WORKTREE status --porcelain` |
| Behind/ahead | `git -C WORKTREE rev-list --left-right --count REMOTE/DEFAULT...HEAD` |
| Upstream | `git -C WORKTREE rev-parse --abbrev-ref @{upstream}` |
| Unpushed commits | `git -C WORKTREE rev-list --count @{upstream}..HEAD` |
| Branch included in base | `git -C REPO merge-base --is-ancestor BRANCH REMOTE/DEFAULT` |

Replace the uppercase argument labels with resolved paths, branch names, and the
configured remote/default branch. Quote paths as shell arguments. Skip remote or
upstream comparisons when that reference is unavailable; state the gap instead
of interpreting an error as zero commits.

Classify in this order:

1. **IN PROGRESS:** dirty worktree, even if earlier commits merged. Report local
   changes and whether work is committed or pushed.
2. **DONE:** clean and its current commit is covered by a merged PR, or its branch
   is contained in the refreshed default branch and has been published. A squash
   merge can be proved by the corresponding PR's merged head even when ancestry
   differs. An older merged PR does not account for later commits on the branch.
3. **IN REVIEW:** clean with an open PR. Mention any additional unpushed commits.
4. **UNPUSHED:** clean with commits ahead and no upstream, or commits not yet
   included in its upstream.
5. **PUSHED, no PR:** clean, published commits ahead of the base, upstream current,
   and no PR.
6. **EMPTY:** clean, no unique commits ahead of the base, and no PR.

When evidence is incomplete, use **UNVERIFIED** with the missing reference or
service. A failed lookup does not prove there is no PR or no work to preserve.

A `DONE` verdict is information. Cleanup requires explicit finish mode, a clean
target, and merge evidence. Preserve every other session's files and branch.
