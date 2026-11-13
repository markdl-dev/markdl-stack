# REA: Reverse Engineer Anything

[REA](https://github.com/morluto/rea) connects coding agents to tools for
investigating shipped software. Its
[upstream skill](https://github.com/morluto/rea/blob/main/.agents/skills/reverse-engineer-anything/SKILL.md)
uses binary, package, and runtime evidence to explain behavior and guide a
reconstruction. I'm trying it to study references before building prototypes.

## Setup and use

Follow REA's [installation guide](https://github.com/morluto/rea/blob/main/docs/getting-started/installation.md).
Its setup command, `npx rea-agents setup`, registers the MCP server and installs
the matching skill and references. Installing only the skill provides instructions;
it does not install the server or analysis engines.

For native binary decompilation, configure an engine such as
[Ghidra](https://github.com/NationalSecurityAgency/ghidra). REA can use an existing
Ghidra installation and a compatible full JDK. Follow its
[Ghidra setup](https://github.com/morluto/rea/blob/main/docs/getting-started/installation.md#ghidra)
for supported versions, `GHIDRA_INSTALL_DIR`, and `JAVA_HOME`. Hopper, IDA, and
Kuna are other supported providers. Static JavaScript analysis does not need a
native engine.

After setup, use `/reverse-engineer-anything` in a compatible slash-command
client or `$reverse-engineer-anything` for the standalone skill in Codex. Name
the target and the question you want investigated. For ordinary questions about
source code already available in the project, use the usual repository tools.

This catalog links upstream and includes no copy or adaptation. REA remains
under evaluation here. Follow its current instructions and
[MIT license](https://github.com/morluto/rea/blob/main/LICENSE); Ghidra and other
providers retain their own licenses.
