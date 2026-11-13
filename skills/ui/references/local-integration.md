# Local integration: UI v1

Read this before the upstream workflow. This file owns the local exceptions for
the installed Waza UI skill and overrides conflicting text in every upstream
mode and reference. Upstream remains the source for the visual workflow.

## UI-LOCAL-001: Scope and precedence

Apply to UI work across supported web and native stacks, using APIs available in
the project's actual versions. Explicit user instructions, repository governance,
accessibility requirements, adopted engineering standards, and specialist tool
contracts take precedence over this skill. Preserve viable frameworks, styling
systems (including plain CSS), tokens, dependency boundaries, and product behavior.
For React projects, the project's adopted React standards retain ownership of
engineering and accessibility rules; this skill supplies visual review procedure only.

Existing authorization remains sufficient for work already requested. Infer
routine choices from current evidence; ask only for material missing decisions.
An unanswered permission question never grants approval. Upstream requirements
to get a nod, pause after a component count, or stop after handoff do not interrupt
authorized work, required verification, or the user's broader task.

## UI-LOCAL-002: Contextual design choices

Treat font blocklists, theme tables, exact color/spacing recipes, style bans,
chart prescriptions, truncation rules, and CSS-stack incompatibility claims as
design heuristics to evaluate against the actual product, not universal technical
facts. Keep established readable fonts and valid styling combinations. Verify
version-specific API advice in official documentation before changing tooling;
in particular, the Tailwind v4 table is not migration guidance.

Use perceptible pressed, selected, focused, and pending states appropriate to the
control. Movement is optional; respect reduced motion and high-frequency use.
Avoid mandatory press scaling, font replacement, ornamental motion, and new font
downloads or purchases solely to satisfy the upstream aesthetic checklist.

For dynamically opened user documents, preserve the source text and code, and
fix the viewer's presentation. Runtime syntax highlighting is valid when content
is unavailable at build time. Preserve full labels through wrapping or deliberate
disclosure when possible; don't hard-trim meaningful content to fit a screenshot.
Use clearly labeled sample data rather than presenting invented metrics as fact.

Follow the user's communication style; ninja prefixes and prescribed report
templates are optional. Keep measurements and checked states as evidence, but
report only what materially helps the user assess the result.

## UI-LOCAL-003: Workflow and tools

Keep the upstream quick-fix and screenshot workflows: locate the responsible code,
name the defect, define the change boundary, reuse tokens, and verify the rendered
surface across relevant widths, content, states, and affected siblings. Include
geometry measurements when alignment is the actual defect. Existing application
evidence can resolve direction without another interview or a new DESIGN.md.

Use prototype for throwaway comparisons when requested, and ui for production
visual work. Use the installed image, diagram, document, or video skill for those
deliverables, respecting its tool contract. Generated-asset advice here is context,
not a replacement for those workflows. Prefer available browser inspection over
asking the user for a screenshot that the tools can obtain.

An upstream /hunt reference is optional: if that skill is absent, diagnose the
runtime regression with the current debugging tools and preserve the screenshot
evidence. Missing companion skills do not block an otherwise supported repair.
Never run external preset/install commands just because this skill mentions them.
