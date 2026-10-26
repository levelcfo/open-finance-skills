FROM node:22-alpine
WORKDIR /app
COPY package.json catalog.json SKILL.md README.md INSTALL.md ATTRIBUTION.md CITATION.cff LICENSE mcp-stdio.mjs ./
COPY src ./src
COPY skills ./skills
COPY examples ./examples
COPY test ./test
COPY scripts ./scripts
RUN node --test --test-force-exit test/*.test.mjs
ENTRYPOINT ["node", "mcp-stdio.mjs"]
