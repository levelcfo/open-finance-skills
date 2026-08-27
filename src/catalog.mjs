export const capabilities = [
  ["reconcile-account","Bank-to-ledger reconciliation"], ["duplicate-billing","Duplicate billing check"],
  ["revenue-leakage-review","Revenue leakage review"], ["spend-concentration-review","Spend concentration review"],
  ["margin-trend-review","Margin trend review"], ["cost-detail-footing","Cost detail footing"],
  ["vendor-1099-readiness","Vendor 1099 readiness"], ["monthly-value-summary","Monthly CFO review"]
].map(([slug,name]) => ({slug,name,version:"0.1.0-dev",scope:"Synthetic examples only",limitation:"Requires human finance review",attribution:"Level",unit:"Varies by capability",source:"https://levelcfo.com/finance-systems/"}));

export const examples = {
  "reconcile-account": { bank:[{id:"B-101",date:"2026-07-02",amount:1250}], ledger:[{id:"L-88",date:"2026-07-02",amount:1250}] },
  "duplicate-billing": { invoices:[{id:"I-1",vendor:"Example Supply",number:"EX-44",amount:825},{id:"I-2",vendor:"Example Supply",number:"EX-44",amount:825}] },
  "revenue-leakage-review": { completedWork:[{job:"JOB-12",amount:2400}], invoices:[] },
  "spend-concentration-review": { transactions:[{vendor:"Example Fleet",amount:6000},{vendor:"Example Supply",amount:4000}] },
  "margin-trend-review": { periods:[{period:"June",revenue:100000,directCosts:60000},{period:"July",revenue:100000,directCosts:65000}] },
  "cost-detail-footing": { rows:[{amount:3000},{amount:2000}], controlTotal:5100 },
  "vendor-1099-readiness": { vendors:[{name:"Example Repairs",taxId:null,address:"100 Sample Street",payments:1200}] },
  "monthly-value-summary": { current:{revenue:110000,grossProfit:44000,cash:70000}, prior:{revenue:100000,grossProfit:45000,cash:80000} }
};

export function runSynthetic(slug) {
  const x=examples[slug]; if(!x) throw new Error("unknown capability");
  if(slug==="reconcile-account") return {matched:[["B-101","L-88"]],review:[]};
  if(slug==="duplicate-billing") return {review:[{ids:["I-1","I-2"],reason:"repeated invoice number"}]};
  if(slug==="revenue-leakage-review") return {review:[{job:"JOB-12",reason:"completed job without invoice"}]};
  if(slug==="spend-concentration-review") return {topVendor:{vendor:"Example Fleet",share:0.6}};
  if(slug==="margin-trend-review") return {margins:x.periods.map(p=>(p.revenue-p.directCosts)/p.revenue),changePercentagePoints:-5};
  if(slug==="cost-detail-footing") { const detailSum=x.rows.reduce((n,r)=>n+r.amount,0); return {detailSum,variance:detailSum-x.controlTotal,status:"review"}; }
  if(slug==="vendor-1099-readiness") return {review:[{vendor:"Example Repairs",reason:"missing tax identifier"}]};
  return {questions:["Why did gross margin decline while revenue grew?","What caused the cash balance to fall?"]};
}
