import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {freshCold} from './run-world-network.mjs';
import {worldOpening,runNativeWorldPolicy,runWorldStrategyComparison,runPriceCounterfactual,candidatePremium,nativePriceContext,WORLD_POLICIES,WORLD_LAB_LIMITS} from './world-network.mjs';
import * as D from '../ambertime/partner-orders.mjs?world=world-network-v01';

test('five actual native policies share exact lawful opening, conserve finite stock and separate wholesale from retail',()=>{
 const initial=worldOpening(27),raw=D.serializeDistillery(initial),result=runWorldStrategyComparison({initial,seed:27,months:12});
 assert.equal(result.rows.length,5);assert.equal(new Set(result.rows.map(r=>r.initialFingerprint)).size,1);assert.deepEqual(new Set(result.rows.map(r=>r.policy)),new Set(WORLD_POLICIES.map(p=>p.id)));
 assert(initial.labConnection.town.events.some(e=>e.type==='inquiry'&&e.to==='overseas-craft'));
 for(const row of result.rows){assert(row.completed||row.stop);assert(row.peakCasks<=4);assert(row.final.operations<=12000);assert.equal(row.coldRestore.ok,true);assert.equal(row.final.inventory.hand+row.final.inventory.retail+row.final.inventory.assigned+row.final.inventory.held,row.final.inventory.stock);assert(row.final.delivered.every(d=>d.customerSales===null));assert.equal(Math.round((row.delta.revenue-row.delta.costs-row.delta.upkeep)*100),Math.round(row.delta.cash*100));}
 assert.equal(D.serializeDistillery(initial),raw);
 assert(result.rows.find(r=>r.policy==='distant').final.delivered.length>0);assert(result.rows.find(r=>r.policy==='local').final.delivered.length===0);
});

test('a native policy is deterministic and keeps handover/save limits without synthetic resources',()=>{
 const initial=worldOpening(27),a=runNativeWorldPolicy(initial,{policy:'continuous',months:6}),b=runNativeWorldPolicy(initial,{policy:'continuous',months:6});
 delete a.coldRestore.milliseconds;delete b.coldRestore.milliseconds;assert.deepEqual(a,b);assert.equal(a.start.cash,initial.core.cash);assert.equal(WORLD_LAB_LIMITS.releases,512);assert.equal(WORLD_LAB_LIMITS.nativeReceipts,2048);assert.throws(()=>runNativeWorldPolicy(initial,{policy:'unknown'}));
});

test('premium eligibility needs fit, established paid activity and actual demand; geography cannot add a premium',()=>{
 const evidence={fit:.9,quantity:24,tradeMonths:12,demand:6,available:6};assert(candidatePremium(evidence)>1);
 for(const patch of [{fit:.2},{quantity:0},{tradeMonths:0},{demand:0},{available:0}])assert.equal(candidatePremium({...evidence,...patch}),1);
 assert.equal(candidatePremium({...evidence,mapScale:'town'}),candidatePremium({...evidence,mapScale:'country'}));
 const report=runPriceCounterfactual();assert.equal(report.adoption,'hold');assert.equal(report.formalPricesChanged,false);
 assert(report.cases.some(c=>c.venue==='bar'&&c.premium>1));assert.equal(report.cases.find(c=>c.venue==='bar').offers[0].unitPrice,22);assert(report.cases.filter(c=>c.venue==='overseas-import-desk').every(c=>c.offers.every(o=>o.expectedCustomerSales===null)));assert.equal(report.cases.find(c=>c.venue==='overseas-import-desk').offers[0].unitPrice,19);assert(report.cases.some(c=>c.offers.find(o=>o.multiplier===2).expectedRevenue<c.offers[0].expectedRevenue));
 assert(report.cases.every(c=>c.offers.find(o=>o.multiplier===2).acceptance<=c.offers[0].acceptance));
});

test('existing Lab exposes factual native evidence separately from synthesized rules and formal price adoption',()=>{
 const app=readFileSync(new URL('./app.mjs',import.meta.url),'utf8'),html=readFileSync(new URL('./index.html',import.meta.url),'utf8');assert.match(html,/data-view="world-network"/);assert.match(app,/results-world-network\.json/);assert.match(app,/正式採用は保留/);assert.match(app,/反実仮想/);assert.doesNotMatch(app,/enableWorldNetwork|assignRegionalProduct/);
});

test('real pending inquiry and paid history are price evidence; a contract alone is not demand',()=>{
 const s=worldOpening(27),before=D.serializeDistillery(s),context=nativePriceContext(s).find(c=>c.partnerId==='overseas-import-desk');
 assert(context.pendingOfferIds.length>0);assert(context.pendingInquiryEventIds.length>0);assert.equal(context.confirmedQuantity,0);assert.equal(context.demand.units,1);assert.equal(context.candidateMultiplier,1);assert.equal(context.observedCustomerSales,null);assert.equal(D.serializeDistillery(s),before);
 const offer=D.regionalOffers(s).find(o=>o.partnerId==='overseas-import-desk'),accepted=D.acceptRegionalOffer(s,offer.partnerId,offer.id),after=nativePriceContext(accepted).find(c=>c.partnerId===offer.partnerId);
 assert.equal(after.contractIds.length,1);assert.equal(after.demand.units,0);assert.equal(after.candidateMultiplier,1);assert.equal(after.formalPriceChanged,false);
});

test('temporary production budget refusal waits and retries without declaring a game over',()=>{
 const run=runNativeWorldPolicy(worldOpening(27),{policy:'local',production:'balanced',months:48,intervalMonths:12,localFocus:'town-liquor',temporaryRefusal:'wait'});
 assert.equal(run.completedMonths,48);assert.equal(run.stop,null);assert(run.waiting.some(w=>w.count>0));assert.equal(run.coldRestore.ok,true);assert(run.peakCasks<=4);
});

test('CLI cold measurement restores a fresh native game in a new process with an absolute model URL',()=>{
 const raw=D.serializeDistillery(D.newWorldNetworkDistillery(7)),result=freshCold(raw);
 assert.equal(result.freshProcess,true);assert.equal(result.exact,true);assert.equal(result.sha256,createHash('sha256').update(raw).digest('hex'));assert(result.restoreMilliseconds>=0);
});
