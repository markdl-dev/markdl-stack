# Catalog adaptation audit

Reviewed on 2026-10-27. Scope: third-party skills already listed in this
repository's catalog. This is a source and packaging audit, not a new live
application acceptance run.

| Skill | Finding | Repository decision |
| --- | --- | --- |
| Create Verification Skill | Shared output paths, Claude discovery link, Codex metadata, checkout and worktree proof differ from pstack. One private workspace example was present. | Include the locally used adaptation, replace the private example, preserve upstream license, and document the fork's limits. |
| Figure It Out | Recorded standalone adaptation of pstack, with its own logging helper and optional integrations. | Include it under evaluation. Generalize personal standards wording, use the promoted Review Loop name, and exclude private intake and duplicate upstream material. |
| Grill Me | The installed short interview differs from current upstream's wrapper around its grilling skill. No reliable local change record establishes a material local workflow adaptation. | Keep external. Do not label an older standalone snapshot a new adaptation or silently replace the installed skill. |
| Maintain Verification Skill | Shared discovery, link resolution, Codex metadata, and worktree drift handling differ from pstack. No private workspace defaults were found. | Include the adaptation. Add a serial source-reading fallback and respect user authorization for PR creation. |
| Prototype | Installed terminal-prototype instructions differ from the newer upstream HTML prototype branch. This appears to be an older upstream snapshot, not a documented local adaptation. | Keep external and point to the author's maintained version. |
| Retro | Entrypoint matches current upstream apart from trailing whitespace. Codex UI metadata is local packaging. | Keep external. Its upstream instructions reference writing-for-agents; follow the author's dependency guidance. |
| Think | Entrypoint matches current upstream apart from trailing whitespace, including its Waza dispatch metadata. | Keep external. No material local adaptation was identified. |
| UI | Documented Waza adaptation with scoped integration overrides and portable frontmatter. Private intake files are present only in the local installation. | Include runtime instructions and references under evaluation; exclude intake, preserve Waza and inherited credits and licenses. |
| Unslop | Entrypoint matches upstream after trimming surrounding whitespace. | Keep external. |

## Source baselines

- pstack comparison: cursor/plugins at
  `519d36aa98955bf680db01bcde5fdfba686dc901`.
  Figure It Out also has its recorded original revision,
  `c86f349b102feb91f1966f8a6a60882a4e601b50`.
- Waza comparison: tw93/Waza at
  `9ac7a67f094bcf3db36c6d1c358ecb3a1efddb9b`.
  UI's recorded imported revision is
  `2585ee0f46bcefd9adb1b8f5d4ce19184a4d2929`.
- Matt Pocock comparison: mattpocock/skills at
  `59db609eb1e18aaf59b63284d0e52255aff0c63c`.
- Unslop comparison: the upstream main file retrieved during this audit.
  It is linked externally; no installation pin is claimed.

Recorded original revisions and current comparison revisions have different
purposes. A newer upstream change is not proof that a local copy was adapted.
The verification pair's original import commits were not recorded, so their
provenance states that limitation explicitly.

## Checks and limits

Package checks cover frontmatter and invocation metadata, local references,
license retention, source comparisons, private strings, and the Figure It Out
logging helper. Reproduce the behavioral checks using each skill's documented
proof and the examples in [Adopt a skill](adopting-skills.md).

The user's local verification workflow has already been used. This promotion
does not rerun a live application or certify every harness, renderer, optional
standards package, or Spec Kit handoff. Figure It Out and UI retain their
evaluation status. Global installed skills and personal configuration are not
changed by this import.
