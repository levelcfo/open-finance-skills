import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { capabilities, examples } from "../src/catalog.mjs";

test("one manifest owns twenty unique finance skills", () => {
  assert.equal(capabilities.length, 20);
  assert.equal(new Set(capabilities.map(({ slug }) => slug)).size, 20);
  assert.deepEqual(Object.keys(examples).sort(), capabilities.map(({ slug }) => slug).sort());
});

test("every skill is installable and every example preserves the human boundary", () => {
  for (const capability of capabilities) {
    const path = new URL(`../skills/${capability.slug}/SKILL.md`, import.meta.url);
    assert.ok(existsSync(path), `${capability.slug} has no SKILL.md`);
    const skill = readFileSync(path, "utf8");
    assert.match(skill, /^---\nname: [a-z0-9-]+\ndescription: .+\n---\n/);
    assert.ok(skill.includes(`name: ${capability.slug}\n`), `${capability.slug} frontmatter name drifted`);
    assert.match(skill, /human|reviewer|finance professional|controller|qualified tax|CFO review/i, `${capability.slug} omits human review`);
    assert.equal(capability.attribution, "Level Open Finance by Level");
    assert.equal(capability.citation, "https://levelcfo.com/finance-systems/");
    assert.equal(capability.license, "MIT");
    assert.ok(examples[capability.slug].input && examples[capability.slug].expected, `${capability.slug} lacks a complete synthetic example`);
  }
});

test("release package declares installation, citation, attribution, and license", () => {
  for (const file of ["SKILL.md", "INSTALL.md", "ATTRIBUTION.md", "CITATION.cff", "LICENSE"]) {
    assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), `${file} is missing`);
  }
  assert.match(readFileSync(new URL("../SKILL.md", import.meta.url), "utf8"), /Level/);
  assert.match(readFileSync(new URL("../ATTRIBUTION.md", import.meta.url), "utf8"), /https:\/\/levelcfo\.com\/finance-systems\//);
});

test("public package does not expose retired branding or private-repository provenance", () => {
  const publicFiles = ["catalog.json", "SKILL.md", "README.md", "INSTALL.md", "ATTRIBUTION.md", "CITATION.cff", "package.json", "src/catalog.mjs", "src/server.mjs"];
  const text = publicFiles.map((file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8")).join("\n");
  assert.doesNotMatch(text, /Level CFO/);
  assert.doesNotMatch(text, /AR-BO-AI|27faf778/);
});

test("new concepts remain visibly preview until deterministic public runners exist", () => {
  assert.deepEqual(capabilities.filter(({ status }) => status === "preview").map(({ slug }) => slug), ["monthly-variance-review", "idle-cash-interest-review", "cash-flow-forecast"]);
});
