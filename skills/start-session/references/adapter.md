# Workspace adapter

Read `.agents/start-session.md` relative to the workspace root. This file holds
project facts; `AGENTS.md` or `CLAUDE.md` holds project rules. Missing optional
fields cause those checks to be skipped.

```yaml
repo: example-app
default_branch: main
remote_name: origin
remote: git@github.com:example/example-app.git
pr_tool: gh
branch_pattern: PROJ-123-short-description
docs: [docs/product, docs/research]
notes: |
  Use the project's existing branch, commit, and review conventions.
```

`remote_name` is the Git remote's configured name; `remote` is its expected URL
for sanity checks. Compare them with the repository instead of adding or changing
a remote automatically. Without `remote_name`, prefer configured `origin` or the
sole configured remote. With no usable remote, perform local inspection only.

For Jira, add `jira_site`, `jira_project`, and optional `jira_epics` only after
configuring the corresponding authenticated tool. A Jira/TWG adapter can use the
installed CLI's read commands. For Bitbucket PRs, `pr_tool` may identify an
available `twg bb` integration; GitHub may use `gh`. `none` disables PR lookup.
Read the installed tool's instructions and current command syntax rather than
assuming every developer has the same CLI or account.

`extra_checks` is an optional list of project check commands. Inspect each before
execution and apply the current task's permissions. Never store credentials in
the adapter or treat an example URL, ticket prefix, or command as real project
configuration.
