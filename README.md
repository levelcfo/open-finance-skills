# Level Open Finance

An installable package of Level's public finance checks. It contains synthetic examples only and is licensed under MIT for reuse and redistribution with the included copyright notice.

The repository contains one unified catalog of 20 installable finance skills. Each `skills/<name>/SKILL.md` teaches an AI agent when to use the capability, the evidence it must require, and where final human finance judgment remains mandatory. `examples/index.json` contains invented inputs and expected results for every skill.

## What belongs here

- Reusable finance check definitions and schemas
- Invented examples with expected results
- Checked-in expected results and tested arithmetic for the two cash-planning fixtures
- A read-only MCP discovery surface

Open source does not mean open client data. Client records, workpapers, credentials, communications, and private configurations do not belong in this repository.

Read `INSTALL.md` for Codex, Claude Code, other agents, and MCP setup. Run `npm test`, then `npm run release` to create the complete ZIP bundle. The local MCP endpoint is `http://127.0.0.1:8788/mcp`.

Level Open Finance was developed by [Level](https://levelcfo.com/finance-systems/). Preserve `LICENSE` and `ATTRIBUTION.md` when redistributing the package. Public citation and a source backlink are appreciated, not required for ordinary use.

## How to use a capability

1. Open the matching guided example on `https://levelcfo.com/finance-systems/`.
2. Read the source records, deterministic rule, flagged result, and human-review questions.
3. Inspect the synthetic JSON. The MCP returns its frozen expected result and does not recompute edited examples or accept new records. To experiment with values, use a separate reviewed implementation; the two cash-planning helpers are illustrative local arithmetic only.
4. Treat the output as a review queue, not a final accounting or operating decision.

To discover the MCP tools locally:

```bash
curl -H 'Origin: http://localhost:3000' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  http://127.0.0.1:8788/mcp
```

To retrieve the cost-detail frozen expected result:

```bash
curl -H 'Origin: http://localhost:3000' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"run_synthetic_example","arguments":{"slug":"cost-detail-footing"}}}' \
  http://127.0.0.1:8788/mcp
```

## Example scope and cash assumptions

Each skill uses an independent invented scenario. These fixtures are smaller than some website walkthroughs; shared month labels do not join them into one company or period. Version 0.2.1 aligns the idle-cash scenario and all thirteen cash-forecast rows with the Level website walkthrough source reviewed on October 7, 2026. Parity is scoped to those two source examples; deployed parity remains unverified. The other eighteen fixtures have independent smaller populations. Monthly variance here contains one account, not the website three-account net variance.

Average cash of $620,000 less a $200,000 policy buffer produces a conditional $420,000 scenario. A missing forecast trough or dated coverage leaves confirmed eligibility unknown. The separate $150,000 trough counterexample falls $50,000 below that buffer and has zero surplus under the illustrative policy. $16,800 is $420,000 times an assumed 4% for a full year, not eligible interest, a current quoted yield or a thirteen-week return. Actual funds require complete obligations, restrictions, dated forecasts, risk review and authorized approval.

The forecast has thirteen ordered weekly roll-forwards. Week five reaches $83,000, $17,000 below its separate $100,000 planning buffer. All rows are fictional forecast assumptions. They are not the idle-cash company's cash history.

`run_synthetic_example` remains a read-only frozen demonstration for all twenty skills. Its `calculationExecuted: false` and `acceptsNewRecords: false` fields apply even when the capability is labeled available; available means the instruction package is present. The three preview labels remain unchanged. Tests calculate cash-fixture arithmetic independently; this is not certification of accounting accuracy or a general finance execution engine.

## Local package revision

Version 0.2.1 is a prepared local revision dated October 7, 2026. Building the ZIP does not publish a remote release. The v0.2.0 ZIP is retained separately.
