import test from "node:test"; import assert from "node:assert/strict"; import http from "node:http"; import {createServer} from "../src/server.mjs";
let server,port; test.before(async()=>{const allowedHosts=new Set();server=createServer({allowedHosts});await new Promise(r=>server.listen(0,"127.0.0.1",r));port=server.address().port;allowedHosts.add(`localhost:${port}`);allowedHosts.add(`127.0.0.1:${port}`);}); test.after(()=>server.close());
async function call(body,headers={}){return fetch(`http://127.0.0.1:${port}/mcp`,{method:"POST",headers:{"content-type":"application/json",host:`localhost:${port}`,origin:"http://localhost:3000",...headers},body:JSON.stringify(body)});}
test("lists only read-only tools with strict argument schemas",async()=>{const r=await call({jsonrpc:"2.0",id:1,method:"tools/list"});const j=await r.json();assert.equal(r.status,200);assert.deepEqual(j.result.tools.map(x=>x.name),["list_capabilities","get_capability","get_schema","get_synthetic_example","run_synthetic_example","get_release_notes"]);assert.ok(!JSON.stringify(j).match(/write|delete|send|shell/i));const run=j.result.tools.find(x=>x.name==="run_synthetic_example");assert.deepEqual(run.inputSchema.required,["slug"]);assert.equal(run.inputSchema.additionalProperties,false);const list=j.result.tools.find(x=>x.name==="list_capabilities");assert.equal(list.inputSchema.required,undefined);});
test("rejects hostile origin and host",async()=>{assert.equal((await call({}, {origin:"https://evil.example"})).status,403);const status=await new Promise((resolve,reject)=>{const req=http.request({host:"127.0.0.1",port,path:"/mcp",method:"POST",headers:{host:"evil.example","content-type":"application/json"}},res=>{res.resume();resolve(res.statusCode);});req.on("error",reject);req.end("{}");});assert.equal(status,403);});
test("rejects unknown methods, tools, missing slugs, and extra arguments",async()=>{assert.equal((await call({jsonrpc:"2.0",id:1,method:"bad"})).status,400);assert.equal((await call({jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"write_file",arguments:{}}})).status,400);assert.equal((await call({jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"get_schema",arguments:{}}})).status,400);assert.equal((await call({jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"get_schema",arguments:{slug:"reconcile-account",extra:true}}})).status,400);assert.equal((await call({jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"list_capabilities",arguments:{slug:"reconcile-account"}}})).status,400);});
test("preserves missing values",async()=>{const r=await call({jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"get_synthetic_example",arguments:{slug:"vendor-1099-readiness"}}});const text=(await r.json()).result.content[0].text;assert.match(text,/"taxId":null/);});
test("returns matching text and structured content with Level attribution",async()=>{const r=await call({jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"get_capability",arguments:{slug:"reconcile-account"}}});const result=(await r.json()).result;assert.deepEqual(JSON.parse(result.content[0].text),result.structuredContent);assert.equal(result.structuredContent.attribution,"Level Open Finance by Level");assert.equal(result.structuredContent.citation,"https://levelcfo.com/finance-systems/");assert.equal(result.structuredContent.license,"MIT");});

test("actual local MCP reports version and frozen preview, never accepts financial records", async () => {
  const init = await (await call({jsonrpc:"2.0",id:2,method:"initialize"})).json();
  assert.equal(init.result.serverInfo.version, "0.2.1");
  const request = (name, args) => call({jsonrpc:"2.0",id:3,method:"tools/call",params:{name,arguments:args}});
  const schema = (await (await request("get_schema", {slug:"cash-flow-forecast"})).json()).result.structuredContent;
  assert.equal(schema.acceptsNewRecords, false);
  assert.match(schema.input, /only slug/);
  for (const slug of ["idle-cash-interest-review", "cash-flow-forecast", "cost-detail-footing"]) {
    const response = await request("run_synthetic_example", {slug});
    assert.equal(response.status, 200);
    const result = (await response.json()).result;
    assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
    assert.equal(result.structuredContent.calculationExecuted, false);
    assert.equal(result.structuredContent.acceptsNewRecords, false);
    assert.equal(result.structuredContent.capabilityStatus, slug === "cost-detail-footing" ? "available" : "preview");
    if (slug === "idle-cash-interest-review") assert.equal(result.structuredContent.confirmedEligibleBalance, null);
    if (slug === "cash-flow-forecast") assert.equal(result.structuredContent.horizonWeeks, 13);
  }
  assert.equal((await request("run_synthetic_example", {slug:"idle-cash-interest-review", records:{cash:999999}})).status, 400);
});

test("local initialization notification succeeds with empty202 and ping preserves request identity", async () => {
  const init = await call({jsonrpc:"2.0",id:"setup",method:"initialize",params:{protocolVersion:"2025-06-18",capabilities:{},clientInfo:{name:"local-fixture-test",version:"1"}}});
  assert.equal(init.status, 200);
  const ready = await call({jsonrpc:"2.0",method:"notifications/initialized"});
  assert.equal(ready.status, 202);
  assert.equal(await ready.text(), "");
  const ping = await call({jsonrpc:"2.0",id:"health",method:"ping"});
  assert.equal(ping.status, 200);
  assert.deepEqual(await ping.json(), {jsonrpc:"2.0",id:"health",result:{}});
  assert.equal((await call({jsonrpc:"2.0",method:"notifications/initialized"},{origin:"https://evil.example"})).status,403);
});
