# UI provenance

- Original author: tw93 (Tw93), Waza.
- Upstream: [tw93/Waza](https://github.com/tw93/Waza).
- Imported revision: `2585ee0f46bcefd9adb1b8f5d4ce19184a4d2929`.
- Source: [pinned UI skill directory](https://github.com/tw93/Waza/tree/2585ee0f46bcefd9adb1b8f5d4ce19184a4d2929/skills/ui).
- Local adaptation reviewed on 2026-10-16; promoted on 2026-10-27.
- License: Waza MIT, preserved in [LICENSE](LICENSE), with the inherited
  credits and licenses below.
- Adaptation maintained by: Mark DL.
- Status: under evaluation.

## Changes

Keep the upstream visual workflow and seven supporting references. Add a
read-first integration reference that makes product constraints, accessibility,
adopted standards, existing authorization, and the available tools govern the
workflow. Treat aesthetic recipes as contextual heuristics, preserve existing
frameworks and content, and make absent companion skills optional.

Remove Waza-specific `when_to_use` and `dispatch_intent` metadata for shared
frontmatter compatibility. For sharing, generalize the React standards reference
and exclude private intake records. This record replaces local SOURCE.json.

## Inherited credits

The attribution at the end of references/design-reference.md is retained:

- Paul Bakaus, [Impeccable](https://github.com/pbakaus/impeccable), Apache-2.0.
  Waza credits adapted typography, color, motion, style, and AI slop rules.
  Full license and copyright notice: [licenses/impeccable-Apache-2.0.txt](licenses/impeccable-Apache-2.0.txt).
  License checked at `d34c87e1a00989ae8dbdd7f6b30b70f23319e860`.
- VoltAgent, [getdesign.md / awesome-design-md](https://github.com/VoltAgent/awesome-design-md),
  MIT. Waza credits the DESIGN.md scaffold; the concept is credited to Google
  Stitch. Notice: [licenses/getdesign-MIT.txt](licenses/getdesign-MIT.txt).
  License checked at `3b605329240ce735b510037cca322f1831fdd7f8`.
- Leonxlnx, [taste-skill](https://github.com/Leonxlnx/taste-skill), MIT.
  Waza credits inspiration for content authenticity, multi-card alignment, and
  strategic omissions. Notice: [licenses/taste-skill-MIT.txt](licenses/taste-skill-MIT.txt).
  License checked at `12af471f627f866411b4bd785b19646d3672784c`.

These license-check revisions identify the notices retrieved for redistribution,
not the exact original commits Waza adapted. Waza does not record those commits.
No additional source from those projects is imported directly here.

## Updating and validation

Compare upstream against the pinned Waza directory, including inherited notices.
Review changes to both the visual workflow and local overrides before updating
the pin. Preserve the original credits and the full licenses. If a supporting
reference changes locally, record that change here as well.

Validate the selected mode on the target product's rendered surface at relevant
widths, states, and input methods. Use source and screenshot evidence, check
accessibility and reduced motion, and report render limitations honestly.
Packaging and reference checks do not establish compatibility with every
framework or replace that visual acceptance pass.
