# Contributing

## Repository layout

```text
skills/<name>/          Harness-neutral skills
skills/codex/<name>/    Standalone Codex-specific skills
plugins/claude/<name>/  Claude plugin packages
plugins/codex/<name>/   Codex plugin packages
docs/                  Adoption, workflow, and source notes
```

Keep each skill or plugin self-contained. Shared instructions belong in the
skill itself; platform wrappers and manifests belong in the matching plugin
directory. Resolve local paths and preserve existing installations as described
in [AGENTS.md](AGENTS.md).

## Before adding a tool

- Confirm it works in every harness claimed by its documentation.
- Remove credentials, personal data, absolute machine paths, and private URLs.
- Include concise setup and usage instructions.
- Keep generated output, caches, and local configuration out of Git.
- Check that any bundled examples or assets may be redistributed.
- Record third-party material in both the tool's `PROVENANCE.md` and the root
  `THIRD_PARTY.md`; preserve its license and required notices.

## Adding a skill

Create `skills/<skill-name>/SKILL.md` and keep all required scripts, references,
and assets within that skill directory. Document supported harnesses and any
external dependencies in the skill's README or `SKILL.md`.

## Adding a plugin

Create the plugin under the matching platform directory. Include the platform's
manifest, documentation, and all files required to install the plugin. Do not
mix Claude and Codex manifests in one package unless that package is deliberately
designed and tested for both platforms.

## Using another author's work

Prefer linking to or depending on the author's maintained package. Vendor a
snapshot only when the license permits redistribution and there is a concrete
reason to maintain a local copy. Pin the imported version, preserve attribution,
document every material modification, and define how upstream updates will be
reviewed.

Do not copy material with no license into this repository. An independently
written replacement must be based on requirements and behavior rather than a
line-by-line or instruction-by-instruction rewrite.

## Local plugin development

The repository includes a Claude marketplace manifest at
`.claude-plugin/marketplace.json`. After publication, users can add the
repository as a marketplace and install its listed plugins. Each package's
README owns installation and removal instructions.

During local development, validate the marketplace with
`claude plugin validate .` and load an individual package with
`claude --plugin-dir ./plugins/claude/<plugin-name>`.

## Promotion and publishing

Develop and test unfinished tools outside this repository. Promote working,
documented tools that are safe to share. An explicitly promoted adaptation still
under evaluation keeps that label and its validation limits in the catalog and
provenance. Preserve third-party licenses and notices.

Follow [AGENTS.md's publishing rules](AGENTS.md#git-and-publishing) before any
external release or push. Select a license for the collection's original
material and review privacy, secrets, redistribution rights, and the complete
history before the first public push. Publish only when authorized.

Original repository content uses the root MIT license. Preserve all bundled
third-party licenses and notices recorded in THIRD_PARTY.md.

## Release check

Before committing, review the complete staged diff and run the tool's own tests
or validation commands. Add those commands to the tool's documentation so the
same checks can be repeated later.

## Versioning and changelog

[VERSION](VERSION) is the single source for the collection's semantic version.
Shared and standalone skills use the collection version and Git commit; keep
skill frontmatter focused on supported harness fields. Plugins keep their own
manifest versions and can change independently of the collection.

Record each user-visible change under Unreleased in [CHANGELOG.md](CHANGELOG.md).
Use Added, Changed, Fixed, or Removed as needed, describing behavior rather than
individual file edits. Update provenance too when an adaptation changes.

- Patch: compatible corrections to instructions, scripts, metadata, or setup.
- Minor: new skills or compatible capabilities.
- Major: incompatible installation, invocation, or workflow changes after 1.0.
  Before 1.0, use a minor bump for breaking changes and describe migration steps.

When preparing a collection release, choose the next version, update VERSION,
update the displayed README version, and move Unreleased entries into a dated
version section. Start a fresh
Unreleased section. Update a plugin's manifest version only when that package
changes; use the same compatibility rules. Include component versions in the
collection changelog when relevant.

Validate affected tools, check links and version consistency, and review the
diff before committing. Release tags use `v<collection-version>`; create tags
or publish releases only when requested. Writing a changelog entry does not
publish a release.

## Helping someone adopt a tool

Follow the catalog-selection procedure in AGENTS.md. Check for our adaptation
and its provenance first. If the user has not chosen a version, explain what
differs and ask whether to use ours or adapt the actual upstream source for
their setup. Preserve an explicit choice and existing installations. The
[adoption guide](docs/adopting-skills.md) supplies setup and smoke-check examples.
