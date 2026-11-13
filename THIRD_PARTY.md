# Third-party tools

This index distinguishes included adaptations from external catalog entries.
Adaptations preserve their authors' licenses and explain the changes in a
tool-local PROVENANCE.md. They are maintained by Mark DL; original authorship
stays with the credited source.

## Included adaptations

| Tool | Original author | Source revision and changes | Included license |
| --- | --- | --- | --- |
| [Create Verification Skill](skills/create-verification-skill/SKILL.md) | Lauren Tan (poteto), pstack | [Provenance](skills/create-verification-skill/PROVENANCE.md). Local adaptation; original import revision unrecorded. Compared against `519d36aa98955bf680db01bcde5fdfba686dc901` in cursor/plugins. | [MIT](skills/create-verification-skill/LICENSE) |
| [Figure It Out](skills/figure-it-out/SKILL.md) | Lauren Tan (poteto), pstack | [Provenance](skills/figure-it-out/PROVENANCE.md). Adapted from cursor/plugins at `c86f349b102feb91f1966f8a6a60882a4e601b50`. Under evaluation. | [MIT](skills/figure-it-out/LICENSE) |
| [Maintain Verification Skill](skills/maintain-verification-skill/SKILL.md) | Lauren Tan (poteto), pstack | [Provenance](skills/maintain-verification-skill/PROVENANCE.md). Local adaptation; original import revision unrecorded. Compared against `519d36aa98955bf680db01bcde5fdfba686dc901`. | [MIT](skills/maintain-verification-skill/LICENSE) |
| [UI](skills/ui/SKILL.md) | tw93 (Tw93), Waza | [Provenance](skills/ui/PROVENANCE.md). Adapted from tw93/Waza at `2585ee0f46bcefd9adb1b8f5d4ce19184a4d2929`. Under evaluation. | [MIT](skills/ui/LICENSE), plus inherited notices below |

UI's design reference retains credits for Paul Bakaus's
[Impeccable](https://github.com/pbakaus/impeccable),
VoltAgent's [getdesign.md](https://github.com/VoltAgent/awesome-design-md),
Google Stitch's DESIGN.md concept, and Leonxlnx's
[taste-skill](https://github.com/Leonxlnx/taste-skill). The full
[Apache-2.0](skills/ui/licenses/impeccable-Apache-2.0.txt),
[getdesign MIT](skills/ui/licenses/getdesign-MIT.txt), and
[taste-skill MIT](skills/ui/licenses/taste-skill-MIT.txt) notices are included.
The exact Waza imports of those sources were not recorded upstream; UI's
provenance distinguishes source revisions from license-check revisions.

## External tools in the catalog

These are references, not vendored copies. Follow each author's installation
instructions and license. No upstream version is pinned for installation here.

| Tool | Author | Source / installation |
| --- | --- | --- |
| Craft Anything | storytold | [Upstream skill](https://github.com/storytold/craft-anything/blob/main/crates/setup/src/skill.md), [CLI/MCP setup](docs/tools/craft-anything.md); under evaluation for prototypes and POCs |
| Grill Me | Matt Pocock | [Upstream skill](https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md) |
| Prototype | Matt Pocock | [Upstream skill](https://github.com/mattpocock/skills/blob/main/skills/engineering/prototype/SKILL.md) |
| REA: Reverse Engineer Anything | morluto | [Upstream skill](https://github.com/morluto/rea/blob/main/.agents/skills/reverse-engineer-anything/SKILL.md), [REA and Ghidra setup](docs/tools/rea.md); under evaluation for prototypes and POCs |
| Retro | Matt Pocock | [Upstream skill](https://github.com/mattpocock/skills/blob/main/skills/engineering/retro/SKILL.md) |
| Simplify | Anthropic | [Claude Code commands](https://code.claude.com/docs/en/commands), built into Claude Code |
| Spec Kit | GitHub | [Spec Kit repository](https://github.com/github/spec-kit#readme) |
| Think | tw93, Waza | [Upstream skill](https://github.com/tw93/Waza/blob/main/skills/think/SKILL.md), under evaluation |
| Unslop | poteto | [Upstream skill](https://github.com/poteto/noodle/blob/main/.agents/skills/unslop/SKILL.md) |

The [adaptation audit](docs/adaptation-audit.md) records which installed catalog
entries differ from upstream and why they are included or remain external.

## Adding or updating an adaptation

Read the author's actual source and license. Record the original author,
upstream URL, imported full commit SHA or tag, license, local changes, and update
method in PROVENANCE.md. If the original import revision cannot be recovered,
say so and record a pinned comparison baseline without calling it the original
source revision. Preserve required notices, including inherited credits.

Update this alphabetical index and the catalog together. Review upstream
changes deliberately; the adaptation's local behavior and private configuration
must not be overwritten by a generic installer update.
