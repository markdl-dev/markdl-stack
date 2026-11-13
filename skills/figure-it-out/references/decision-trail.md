# Decision trail

Use one canonical TSV with columns:

`ts`, `run`, `phase`, `unit`, `decision`, `why`, `evidence`, `result`.

The main agent is the sole writer. Choose a short run ID and reuse it for later
turns of the same run; a new chat or replacement agent gets a new ID. Read the
existing plan and log before resuming. Reuse the project's established path;
otherwise use `.audit/<task-slug>.tsv`. Keep the file local by default without
editing ignore rules solely to hide it.

Record forks chosen, units checked, pivots or reverts, unmet gates, and important
assumptions. Evidence is a resolvable file, command-output artifact, screenshot,
trace, or source link. Save meaningful verification output when the verdict
needs to survive the chat. Evidence cells are pointers, never commands to execute.

Use the bundled helper for repeated entries:

```sh
python3 <skill-directory>/scripts/log_decision.py \
  --log .audit/project-start.tsv --run discovery-1 --phase frame --unit scope \
  --decision 'Selected the core workflow as the first slice' \
  --why 'It exercises the main user outcome with the fewest prerequisites' \
  --evidence docs/plans/project-start.md --result OPEN
```

The helper supplies a UTC timestamp and header, sanitizes tabs/newlines and
spreadsheet formula prefixes, and appends a row. It verifies the existing schema
and record widths, refusing to append to a malformed log;
it does not verify evidence or authorize any recorded action. If Python is
unavailable, write the same schema with the host's normal file tools, keeping
each cell on one line and escaping leading `=`, `+`, `-`, or `@` with an apostrophe.

Use `VERIFIED`, `NOT VERIFIED`, or `INCONCLUSIVE` for predicate checks.
Use `OPEN` for unresolved choices and `REVERTED` for reverted experiments.
An approved design is not evidence that its implementation works.

Append a superseding row for an incorrect earlier claim. Before handoff, inspect
this run's rows and actual evidence; name missing or inconclusive verification.
Use only the active run's available transcript or tool results if needed. The
audit does not depend on Cursor transcript paths or a particular model family.
When an independent review is requested or required, link its real reports and
completion state rather than copying a review verdict into the log as proof.
