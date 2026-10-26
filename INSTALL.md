# Install Level Open Finance

The download contains one router skill, twenty focused finance skills, synthetic examples, and a local read-only MCP server.

## Codex

Copy the folders inside `skills/` into your Codex skills directory. Copy the root `SKILL.md` into a folder named `level-open-finance` if you also want the catalog router.

## Claude Code

Copy the folders inside `skills/` into `.claude/skills/` for one project or into your user-level Claude skills directory. Copy the root `SKILL.md` into `level-open-finance/SKILL.md` to install the router.

## Other agents

Each skill is plain Markdown with YAML frontmatter. Agents that support instruction packages can read an individual `SKILL.md` directly. `catalog.json` is the machine-readable index.

## MCP

Run `npm install`, then `npm run dev`. The local endpoint is `http://127.0.0.1:8788/mcp`. It exposes public, read-only catalog and synthetic-example tools. It does not connect to accounting systems or client data.

When you redistribute the package, preserve `LICENSE` and `ATTRIBUTION.md`. Citation and backlinks are appreciated using `CITATION.cff`, but they are not a condition on ordinary use.

The MCP accepts only a capability slug, not financial records. `run_synthetic_example` returns the checked-in expected result, with no calculation on supplied data. Available and preview describe installed instruction packages, not live accounting integrations.
