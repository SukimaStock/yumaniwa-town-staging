import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from './model.mjs';
const seeds=[20261021,42,7,137,2026,314159,271828,65537];
const run=o=>M.advance(M.create(o),1200);
test('100 years, four ablations and eight fixed seeds reproduce full exports',()=>{
 for(const seed of seeds)for(const mode of M.MODES){const a=run({seed,mode:mode.id}),b=run({seed,mode:mode.id});assert.deepEqual(M.exportLog(a),M.exportLog(b));assert.equal(M.validate(a).ok,true);assert.equal(a.month,1200);assert.equal(a.generation,4);}
});
test('supply is conserved every month across product and delivery policies; occupancy <=4',()=>{
 for(const product of M.PRODUCT_OPTIONS)for(const policy of M.POLICIES){const s=M.create({product:product.id,policy:policy.id});for(let i=0;i<1200;i++){M.step(s);assert.equal(s.produced,s.inventory+s.delivered);assert.equal(s.releases.reduce((n,r)=>n+r.stock,0),s.inventory);assert.ok(s.barrels.length<=4);assert.ok(s.inventory>=0);}assert.equal(M.validate(s).ok,true);
 for(const shipment of s.shipments)for(const part of shipment.parts){const release=s.releases[part.releaseId-1];assert.ok(release.month<shipment.month);}
 for(let month=0;month<=1200;month++)assert.ok(s.barrelHistory.filter(b=>b.start<=month&&month<b.due).length<=4);
 }
});
test('receiving a rumor does not imply an agreement or a sale; inquiry and agreement are delayed',()=>{
 const s=run({seed:42});const events=new Map(s.events.map(e=>[e.id,e]));
 assert.ok(s.arrivals.length>s.trades.length*100);
 for(const e of s.trades){const inquiry=events.get(e.sourceId);assert.equal(inquiry.type,'inquiry');assert.ok(inquiry.month<e.month);const shipments=s.shipments.filter(x=>x.to===e.to);for(const p of shipments)assert.ok(p.month>e.month);}
 assert.ok(Object.values(s.nodes).some(n=>n.interest>0&&!n.trading));
 assert.ok(!s.events.some(e=>e.type==='sale'||e.type==='purchase'));
});
test('event DAG, frozen release ancestry and future queues remain referentially sound',()=>{
 const s=run({seed:137}),events=new Map();for(const e of s.events){if(e.sourceId){const parent=events.get(e.sourceId);assert.ok(parent);assert.ok(parent.month<=e.month);if(e.releaseId)assert.equal(e.releaseId,parent.releaseId);}events.set(e.id,e);}
 for(const p of [...s.pending,...s.packets])assert.ok(events.has(p.sourceId));
 for(const a of s.arrivals){let e=a;while(e.type!=='shipment'){e=events.get(e.sourceId);assert.ok(e);}assert.equal(e.releaseId,a.releaseId);}
});
test('one arrival may lead independently to several responses',()=>{
 const s=run(),children=new Map();for(const e of s.events.filter(e=>['memory','interest','share'].includes(e.type))){if(!children.has(e.sourceId))children.set(e.sourceId,[]);children.get(e.sourceId).push(e.type);}assert.ok(s.arrivals.some(a=>new Set(children.get(a.id)).size>=2));
});
test('long memory is bounded, causal, finite, and survives generations',()=>{
 const s=M.create();for(let i=0;i<1200;i++){M.step(s);assert.ok(s.memories.filter(m=>!m.retired).length<=48);}
 const returns=s.events.filter(e=>e.type==='resurface');assert.ok(returns.some(e=>e.age>=240));assert.ok(returns.some(e=>e.generation>1));
 for(const e of returns){const m=s.memories.find(m=>m.id===e.memoryId);assert.equal(m.sourceId,e.sourceId);assert.equal(m.releaseId,e.releaseId);assert.ok(e.age>=24&&e.age<=600);assert.equal(returns.filter(x=>x.memoryId===m.id).length,1);}
 assert.ok(s.events.some(e=>e.type==='inquiry'&&returns.some(r=>r.id===e.sourceId)));
});
test('foreign arrivals in first generation and later events are possible without timed unlocks',()=>{
 const runs=seeds.map(seed=>run({seed}));assert.ok(runs.some(s=>s.arrivals.some(e=>M.NODES.find(n=>n.id===e.to).level==='海外'&&e.month<360)));
 assert.ok(runs.every(s=>s.events.some(e=>['visit','inquiry','resurface'].includes(e.type)&&e.month>1080)));
 const s=M.create();assert.deepEqual(M.summarize(s).discovered,['town']);
});
test('normal and chance ablations have no response-driven trade; ordinary supply matches',()=>{
 const a=run({mode:'normal'}),b=run({mode:'chance'});const omitEvent=(key,value)=>key==='eventId'?undefined:value;assert.equal(JSON.stringify(a.shipments,omitEvent),JSON.stringify(b.shipments,omitEvent));assert.equal(JSON.stringify(a.releases,omitEvent),JSON.stringify(b.releases,omitEvent));assert.equal(a.trades.length,0);assert.equal(b.trades.length,0);assert.equal(a.events.filter(e=>e.type==='rumor').length,0);assert.ok(b.events.some(e=>e.type==='rumor'));assert.equal(b.memories.length,0);
 const c=run({mode:'responses'});assert.equal(c.memories.length,0);assert.ok(c.events.some(e=>e.type==='memory'));assert.ok(!c.events.some(e=>e.type==='resurface'));
});
test('midrun settings, same-month changes, and month-zero changes replay exactly from export',()=>{
 const s=M.create({seed:7});M.setPolicy(s,{product:'long'});M.advance(s,240);M.setPolicy(s,{policy:'local'});M.setPolicy(s,{product:'young'});M.advance(s,601);M.setPolicy(s,{policy:'distributed',product:'changing'});M.advance(s,1200);
 const log=M.exportLog(s);assert.deepEqual(M.exportLog(M.replay(log)),log);assert.equal(log.settingsHistory.length,4);
});
test('invalid inputs rejected, reset is fresh and 100-year cap is stable',()=>{
 for(const seed of [0,-1,1.5,4294967296,NaN])assert.throws(()=>M.create({seed}));assert.throws(()=>M.create({mode:'x'}));assert.throws(()=>M.advance(M.create(),1201));assert.throws(()=>M.advance(M.create(),1.5));assert.throws(()=>M.setPolicy(M.create(),{policy:'x'}));
 const s=run(),before=JSON.stringify(s);M.step(s);assert.equal(JSON.stringify(s),before);assert.deepEqual(M.create(),M.create());assert.throws(()=>M.replay({modelVersion:'unknown'}));
});
test('report and checksum derive from the same complete state; corrupt ancestry is detected',()=>{
 const s=run();const log=M.exportLog(s),checksum=log.checksum;delete log.checksum;assert.equal(M.checksum(JSON.stringify(log)),checksum);assert.match(M.report(s),/消費者への販売は未計算/);s.events[1].sourceId='missing';assert.equal(M.validate(s).ok,false);
});
