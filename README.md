# Level Open Finance

Local development companion for Level's public finance checks. This preview contains synthetic examples only and is not published or licensed for redistribution yet.

The repository contains one unified catalog of 20 installable finance skills. Each `skills/<name>/SKILL.md` teaches an AI agent when to use the capability, the evidence it must require, and where final human finance judgment remains mandatory. `examples/index.json` contains invented inputs and expected results for every skill.

## What belongs here

- Reusable finance check definitions and schemas
- Invented examples with expected results
- Deterministic runners for public examples
- A read-only MCP discovery surface

Open source does not mean open client data. Client records, workpapers, credentials, communications, and private configurations do not belong in this repository.

Run `npm test`, then `npm run dev`. The local MCP endpoint is `http://127.0.0.1:8788/mcp`.

## How to use a capability

1. Open the matching guided example on `http://localhost:3000/finance-systems/`.
2. Read the source records, deterministic rule, flagged result, and human-review questions.
3. Inspect the synthetic JSON before substituting any safe test values.
4. Treat the output as a review queue, not a final accounting or operating decision.

To discover the MCP tools locally:

```bash
curl -H 'Origin: http://localhost:3000' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  http://127.0.0.1:8788/mcp
```

To run the cost-detail synthetic example:

```bash
curl -H 'Origin: http://localhost:3000' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"run_synthetic_example","arguments":{"slug":"cost-detail-footing"}}}' \
  http://127.0.0.1:8788/mcp
```
