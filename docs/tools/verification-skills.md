# Create and maintain app verification

These are Mark DL's shared adaptations of Lauren Tan's (poteto) pstack skills.
They let an agent learn how to launch an app, drive it as a user, and keep that
knowledge accurate as the product changes.

- [Create Verification Skill](../../skills/create-verification-skill/SKILL.md)
  builds a project-specific verification skill and proves one mapped feature.
- [Maintain Verification Skill](../../skills/maintain-verification-skill/SKILL.md)
  checks an existing map against source and exercises every mapped feature.

The original author, pinned upstream comparisons, licenses, and local changes
are recorded in each directory's PROVENANCE.md. These forks use shared skill
paths and both Claude and Codex invocation examples. They preserve the
checkout-selection guidance from the local setup without requiring a particular
workspace, ticket variable, account, or model.

## 1. Install the reusable skills

Follow [Adopt a skill](../adopting-skills.md#install-an-included-skill), once for
`create-verification-skill` and once for `maintain-verification-skill`.
They are independent skill directories, not plugins. You can use either without
Spec Kit or the rest of pstack.

## 2. Generate verification for an app

Open the app's repository in your agent and run:

```text
# Codex
$create-verification-skill Create and prove a verification skill for this app.

# Claude Code
/create-verification-skill Create and prove a verification skill for this app.
```

Choose the line for your harness. The agent inspects the repo's run commands,
user-facing surface, existing automation, isolation needs, and checkout
conventions. It asks about facts it cannot discover, such as access to a test
account. If the app cannot start, it should identify the blocker.

The result normally looks like this inside the app's repository:

```text
.agents/skills/verify-my-app/
  SKILL.md
  features/
    README.md
    <feature>.md
  scripts/                         When a helper is needed
.claude/skills/verify-my-app        Symlink to the shared directory
```

`verify-my-app` is an example name. The generated name, commands, selectors,
and feature files come from your actual app. A documented project convention
may use another shared path.

The generated skill explains launch, health checks, driving, evidence, and
cleanup. Creation is complete only after the agent runs those instructions,
proves one mapped feature, tears down its processes, and confirms the evidence
survives. The remaining feature map is a starting point, not a claim that every
feature was verified during generation.

## 3. Use the generated skill

Ask the agent to use the new skill when checking behavior:

```text
$verify-my-app Verify the create-item flow on this branch. Capture the action,
the resulting screen, and the saved data. Clean up the test instance.
```

In Claude, use `/verify-my-app`. Read the generated skill's prerequisites
before the first run. It should name the tested checkout and evidence location.
When the project supports worktrees or parallel sessions, it should explain
the actual override. A project without those conventions needs no ticket or
worktree setup just to use verification.

The included [Notes feature map](../../skills/create-verification-skill/references/feature-map-example/README.md)
illustrates the format. Notes, its port, and its `control-notes` commands are
fictional examples, not dependencies to install.

## 4. Maintain the map

After changing user-facing behavior or when the harness starts drifting:

```text
$maintain-verification-skill Audit this project's verification skill. Check all
mapped features against source and live behavior, repair map or harness drift,
and report product regressions separately. Leave changes ready for review.
```

Use `/maintain-verification-skill` in Claude. The skill locates and resolves the
project verification directory, checks the map index, reads each feature from
source, and then drives every feature. Source readers may run in parallel;
the coordinator alone drives the app. Hosts without delegation use serial reads.

Corrections stay inside the verification skill's directory. Broken product
behavior is reported instead of silently changing the map to match a regression.
Each harness fix is re-driven before it is considered proven. A PR is created
only when you've asked for one.

The outcome is `clean`, `changed`, or `blocked`, with feature coverage and
evidence. An unreachable feature needs its attempted route and concrete unmet
prerequisite; it is not a verified success.

## When setup is incomplete

If a command is missing from the skill list, check its installation target and
reload discovery. If multiple verification skills exist, select the intended one.
If the app will not start, follow its documented setup and report unresolved
dependencies. If a test account or external service is unavailable, record the
coverage gap. A failed drive needs a health check and a known state before retry.

Keep app-specific choices in the generated project skill. That is the part to
commit with the app so the next agent can repeat the same proof.
