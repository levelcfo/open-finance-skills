import { readFileSync } from "node:fs";

export const manifest = JSON.parse(readFileSync(new URL("../catalog.json", import.meta.url), "utf8"));
export const examples = JSON.parse(readFileSync(new URL("../examples/index.json", import.meta.url), "utf8"));

const names = {
  "reconcile-account":"Bank-to-ledger reconciliation", "duplicate-billing":"Duplicate billing check", "revenue-leakage-review":"Revenue leakage review", "spend-concentration-review":"Spend concentration review", "margin-trend-review":"Margin trend review", "cost-detail-footing":"Cost detail footing", "vendor-1099-readiness":"Vendor 1099 readiness", "monthly-value-summary":"Monthly CFO review", "monthly-variance-review":"Monthly variance review", "recurring-subscription-review":"Recurring subscription review", "idle-cash-interest-review":"Idle cash interest review", "cash-flow-forecast":"13-week cash-flow forecast", "ar-integrity-review":"AR integrity review", "cost-rationalization-review":"Cost rationalization review", "vendor-rule-audit":"Vendor rule audit", "remittance-matching-review":"Remittance matching review", "customer-margin-attribution":"Customer margin attribution", "month-end-close-preview":"Month-end close preview", "cfo-chart-pack":"CFO chart pack", "categorization-history-health":"Categorization history health"
};

export const capabilities = manifest.skills.map((slug) => ({
  slug, name:names[slug], version:manifest.version, status:manifest.preview.includes(slug)?"preview":"available",
  scope:"Synthetic examples only", limitation:"Requires human finance review", license:"MIT",
  attribution:"Level Open Finance by Level", citation:"https://levelcfo.com/finance-systems/",
  unit:"Declared by each result field", source:"https://levelcfo.com/finance-systems/",
  skill:`skills/${slug}/SKILL.md`, example:`examples/index.json#${slug}`
}));

export function runSynthetic(slug) {
  const example=examples[slug];
  if(!example) throw new Error("unknown capability");
  return { ...example.expected, slug, version: manifest.version, capabilityStatus: capabilities.find((capability) => capability.slug === slug).status, executionMode: "frozen-synthetic-demonstration", calculationExecuted: false, acceptsNewRecords: false, scope: "Returns the checked-in invented expected result. No supplied records are processed; this example does not establish complete ledger or source coverage.", unit: "Cash, cost and interest fields are fictional USD; ratios are fractions unless a field states percentage points or weeks.", source: "https://levelcfo.com/finance-systems/", license: "MIT", attribution: "Level Open Finance by Level" };
}
