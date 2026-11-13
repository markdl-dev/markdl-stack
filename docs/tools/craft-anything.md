# Craft Anything

[Craft Anything](https://github.com/storytold/craft-anything) provides inspection
tools for shipped software, apps, and websites. Its
[upstream skill](https://github.com/storytold/craft-anything/blob/main/crates/setup/src/skill.md)
guides evidence-based investigations. I'm trying it to study references before
building prototypes and proofs of concept.

## Setup and use

Follow the project's [installation instructions](https://github.com/storytold/craft-anything#get-started)
for the CLI and its [agent setup](https://github.com/storytold/craft-anything#built-for-agents).
The skill needs the Craft Anything MCP tools; copying the prompt alone does not
provide them. Upstream setup installs the skill and its supporting reference.

Use `/craft-anything` in a compatible slash-command client, or `$craft-anything`
for the standalone skill in Codex, after connecting the MCP server. Ask it to
investigate a named target and explain its findings with evidence. For questions
about source code already available in your project, read that source directly.

This collection links upstream and includes no copy or adaptation. The tool is
still under evaluation here. Follow upstream's current instructions, requirements,
and license terms ([MIT](https://github.com/storytold/craft-anything/blob/main/LICENSE-MIT),
[Apache-2.0](https://github.com/storytold/craft-anything/blob/main/LICENSE-APACHE)).
