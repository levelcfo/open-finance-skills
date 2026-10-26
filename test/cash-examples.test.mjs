import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { examples, capabilities, manifest, runSynthetic } from "../src/catalog.mjs";
import { idleCashScenario, forecastScenario } from "../src/synthetic-checks.mjs";

test("average balance is conditional, missing coverage cannot establish eligible cash", () => {
  const fixture = examples["idle-cash-interest-review"];
  const result = idleCashScenario(fixture.input);
  assert.equal(fixture.input.lowestForecastUnrestrictedCash, null);
  assert.equal(fixture.input.observationWindowEnd, null);
  assert.equal(fixture.input.yieldSourceDate, null);
  assert.equal(result.conditionalScenarioBalance, 420000);
  assert.equal(result.eligibleBalanceUnderIllustrativePolicy, null);
  assert.equal(fixture.expected.confirmedEligibleBalance, null);
  assert.equal(fixture.expected.conditionalScenarioBalance, result.conditionalScenarioBalance);
  assert.equal(fixture.expected.illustrativeAnnualInterest, result.illustrativeAnnualInterest);
  assert.ok(!Object.hasOwn(fixture.expected, "illustrativeEligibleBalance"));
  assert.match(fixture.expected.interestBasis, /full-year.*not eligible/i);
  const counter = idleCashScenario(fixture.counterexample.input);
  assert.equal(counter.eligibleBalanceUnderIllustrativePolicy, 0);
  assert.equal(counter.bufferShortfall, 50000);
  assert.equal(counter.illustrativeAnnualInterest, 16800);
  assert.equal(counter.eligibleScenarioInterest, 0);
  assert.match(fixture.counterexample.expected.interestBasis, /full year.*interest are zero/);
  for (const [key, value] of Object.entries(fixture.counterexample.expected)) {
    if (typeof value === "number") assert.equal(value, counter[key], key);
  }
});

test("cash scenario respects trough, missing versus zero, and holding-period basis", () => {
  const base = examples["idle-cash-interest-review"].input;
  assert.equal(idleCashScenario({ ...base, lowestForecastUnrestrictedCash: 0 }).bufferShortfall, 200000);
  assert.equal(idleCashScenario({ ...base, lowestForecastUnrestrictedCash: 250000 }).eligibleBalanceUnderIllustrativePolicy, 50000);
  const period = idleCashScenario({ ...base, illustrativeHoldingDays: 91 });
  assert.equal(period.illustrativeAnnualInterest, 16800);
  assert.equal(period.illustrativeHoldingPeriodInterest, 16800 * 91 / 365);
  for (const key of ["observedCash", "buffer", "illustrativeYield", "illustrativeHoldingDays"]) assert.throws(() => idleCashScenario({ ...base, [key]: null }));
  assert.throws(() => idleCashScenario({ ...base, lowestForecastUnrestrictedCash: "150000" }));
});

test("all thirteen weeks reconcile and incomplete or broken forecasts fail", () => {
  const fixture = examples["cash-flow-forecast"];
  const result = forecastScenario(fixture.input);
  for (const [key, value] of Object.entries(fixture.expected)) if (key !== "status") assert.equal(value, result[key], key);
  assert.deepEqual(fixture.input.weeklyEndingCash, [193000, 178000, 173000, 156000, 83000, 101000, 108000, 133000, 129000, 145000, 134000, 142000, 154000]);
  assert.match(fixture.input.scenario, /Fictional.*forecast assumption/);
  const mutate = (fn) => { const input = structuredClone(fixture.input); fn(input); return input; };
  assert.throws(() => forecastScenario(mutate((input) => { input.weeks = input.weeks.slice(0, 6); })));
  assert.throws(() => forecastScenario(mutate((input) => { input.weeks[5].startingCash += 1; })));
  assert.throws(() => forecastScenario(mutate((input) => { input.weeks[12].endingCash += 1; })));
  assert.throws(() => forecastScenario(mutate((input) => { input.weeks[0].inflows = null; })));
  assert.throws(() => forecastScenario(mutate((input) => { input.weeklyEndingCash[1] = 168000; })));
  assert.throws(() => forecastScenario(mutate((input) => { input.weeks[1].week = 1; })));
});

test("all twenty MCP demonstrations disclose frozen scope and retain fixture outcomes", () => {
  for (const capability of capabilities) {
    const result = runSynthetic(capability.slug);
    for (const [key, value] of Object.entries(examples[capability.slug].expected)) assert.deepEqual(result[key], value);
    assert.equal(result.executionMode, "frozen-synthetic-demonstration");
    assert.equal(result.calculationExecuted, false);
    assert.equal(result.acceptsNewRecords, false);
    assert.equal(result.version, "0.2.1");
    assert.equal(result.capabilityStatus, capability.status);
    assert.match(result.scope, /No supplied records.*does not establish complete ledger/);
    assert.equal(result.license, "MIT");
    assert.equal(result.attribution, "Level Open Finance by Level");
  }
  assert.equal(manifest.version, JSON.parse(readFileSync(new URL("../package.json", import.meta.url))).version);
  assert.ok(JSON.parse(readFileSync(new URL("../package.json", import.meta.url))).files.includes("catalog.json"));
  assert.match(readFileSync(new URL("../CITATION.cff", import.meta.url), "utf8"), /version: 0.2.1/);
});

test("instruction and release contracts guard the original scope defects", () => {
  const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  assert.match(read("skills/idle-cash-interest-review/SKILL.md"), /Average cash minus a buffer is only a conditional scenario/);
  assert.match(read("skills/cash-flow-forecast/SKILL.md"), /all thirteen ordered weekly rows/);
  assert.match(read("README.md"), /Monthly variance here contains one account/);
  assert.match(read("README.md"), /does not recompute edited examples or accept new records/);
  const release = read("scripts/build-release.sh");
  assert.match(release, /npm test/);
  assert.ok(release.indexOf("npm test") < release.indexOf("zip -qr"));
  assert.doesNotMatch(release, /archive=.*v0\.2\.0/);
});
