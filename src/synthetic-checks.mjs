// Arithmetic checks for two invented fixtures, not account or treasury execution.
const finite = (value) => typeof value === "number" && Number.isFinite(value);

export function idleCashScenario(input) {
  for (const key of ["observedCash", "buffer", "illustrativeYield", "illustrativeHoldingDays"]) {
    if (!finite(input[key]) || input[key] < 0) throw new Error(`invalid ${key}`);
  }
  const conditionalScenarioBalance = Math.max(0, input.observedCash - input.buffer);
  const trough = input.lowestForecastUnrestrictedCash;
  if (trough != null && !finite(trough)) throw new Error("invalid forecast trough");
  // The fixture assumes forecast cash already includes obligations and restrictions.
  // A real eligibility decision also requires dated coverage, bank risk and approval.
  const eligibleBalanceUnderIllustrativePolicy = trough == null ? null : Math.min(conditionalScenarioBalance, Math.max(0, trough - input.buffer));
  return {
    conditionalScenarioBalance,
    eligibleBalanceUnderIllustrativePolicy,
    bufferShortfall: trough == null ? null : Math.max(0, input.buffer - trough),
    illustrativeAnnualInterest: conditionalScenarioBalance * input.illustrativeYield,
    illustrativeHoldingPeriodInterest: conditionalScenarioBalance * input.illustrativeYield * input.illustrativeHoldingDays / 365,
    eligibleScenarioInterest: eligibleBalanceUnderIllustrativePolicy == null ? null : eligibleBalanceUnderIllustrativePolicy * input.illustrativeYield * input.illustrativeHoldingDays / 365,
  };
}

export function forecastScenario(input) {
  if (!finite(input.managementBuffer) || input.managementBuffer < 0 || !Array.isArray(input.weeks) || input.weeks.length !== 13) throw new Error("thirteen complete weeks and buffer required");
  input.weeks.forEach((row, index) => {
    if (row.week !== index + 1 || ![row.startingCash, row.inflows, row.outflows, row.endingCash].every(finite)) throw new Error("missing or unordered week");
    if (Math.abs(row.startingCash + row.inflows - row.outflows - row.endingCash) > 0.005) throw new Error("weekly roll-forward mismatch");
    if (index && row.startingCash !== input.weeks[index - 1].endingCash) throw new Error("cash continuity mismatch");
  });
  const ends = input.weeks.map((row) => row.endingCash);
  if (input.weeklyEndingCash && JSON.stringify(input.weeklyEndingCash) !== JSON.stringify(ends)) throw new Error("ending cash summary mismatch");
  const lowestCash = Math.min(...ends);
  return { horizonWeeks: 13, lowestCash, lowestWeek: ends.indexOf(lowestCash) + 1, belowBuffer: Math.max(0, input.managementBuffer - lowestCash) };
}
