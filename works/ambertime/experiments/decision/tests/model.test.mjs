import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as L from '../model.mjs';
import * as D from '../../../partner-orders.mjs';
import * as M from '../../../model.mjs';
import * as E from '../../../economy.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('protected main and Contest sources remain exact baseline bytes',()=>{
 const files=['model.mjs','partner-orders.mjs','economy.mjs','parameters.mjs','index.html','shop-app.mjs','experiments/contest/model.mjs','experiments/contest/seasonal.mjs','experiments/contest/results.json','experiments/contest/results-v02.json','experiments/contest/REPORT.md','experiments/contest/REPORT-v02.md'];
 for(const file of files){const path='works/ambertime/'+file;assert.equal(hash(fs.readFileSync(new URL('../../../'+file,import.meta.url))),hash(execFileSync('git',['show',`6f6f0f35105c34b5aefffefdd0b73d678e60b401:${path}`])));}
});
test('same fixture assets and cash across all four conditions; seeded actual aroma-a generation',()=>{
 for(const fixture of ['mixed','full','lean']){
  const baseline=L.createSession({fixture});M.validateState(baseline.game.core);
  for(const condition of L.CONDITIONS){const s=L.createSession({fixture,condition:condition.id});assert.deepEqual(s.game,baseline.game);assert.deepEqual(s,L.createSession({fixture,condition:condition.id}));}
 }
 const initial=L.createSession(),c=initial.game.core.casks[1];let g=D.startDistillation(D.newStaffDistillery((L.DEFAULT_SEED+104729)>>>0));while(g.still.distillation.progress<66)g=D.distillStep(g);g=D.fillBarrel(D.stopDistillation(g),'refill');let actual=g.core.casks[0];for(let i=0;i<18;i++)actual=M.ageCask(actual);
 for(const k of ['roughness','character','wood','litres','variation','cut'])assert.deepEqual(c[k],actual[k]);assert.equal(initial.game.core.month,36);assert.equal(initial.elapsed,0);
});
test('baseline monthly core equals live economicMonthly and samples do not alter game or liquid',()=>{
 const s=L.createSession(),copy=structuredClone(s),direct=E.economicMonthly(s.game,s.game.core.month),advanced=L.advance(s);
 assert.deepEqual(advanced.game.core,direct.core);assert.equal(advanced.elapsed,1);assert.equal(advanced.history[0].month,1);assert.equal(advanced.history[0].calendarMonth,37);assert(advanced.game.decisions.length===0&&Object.values(advanced.game.notesById).every(n=>n.pending===null&&n.phase==='watching'));
 const sample=L.sample(s,2);assert.deepEqual(sample.game,s.game);assert.equal(sample.tasting.text,M.tasting(s.game.core.casks[0]));assert.deepEqual(s,copy);
});
test('partial bottling charges exact live quote plus finance delta, stores product, preserves taste and no revenue',()=>{
 for(const condition of ['baseline','finance']){
  const s=L.createSession({condition}),copy=structuredClone(s),q=L.quote(s,2,5),direct=M.bottle(s.game.core,2,5),b=L.bottle(s,2,5,{why:'資金',wait:'木が強くなるまで',next:'次はリフィル'}),p=b.game.core.products[0];
  assert.equal(q.cost,condition==='finance'?18.75:15);assert.equal(b.game.core.cash,s.game.core.cash-q.cost);assert.equal(b.game.core.totals.costs,q.cost);assert.equal(b.game.core.totals.revenue,0);assert.equal(p.stock,5);assert.equal(b.game.productsById[p.id].listed,false);assert.equal(L.view(b).freeSlots,1);
  for(const k of ['roughness','character','wood','age','stock','sourceId'])assert.equal(p[k],direct.products[0][k]);close(b.game.core.casks[0].litres,s.game.core.casks[0].litres-3.5);
  assert.equal(b.history[0].notes.why,'資金');assert.equal(b.history[0].before.litres,s.game.core.casks[0].litres);assert.equal(b.history[0].after.inventory[0].stock,5);assert.deepEqual(s,copy);
 }
});
test('baseline listed sales equal live engine, unlisted waits, liquid profile freezes after bottling',()=>{
 const s=L.bottle(L.createSession(),6),p=s.game.core.products[0],frozen=structuredClone(p);assert.equal(L.advance(s,3).game.core.products[0].stock,p.stock);
 const listed=L.setListed(s,p.id),direct=E.economicMonthly(listed.game,listed.game.core.month),next=L.advance(listed);assert.deepEqual(next.game.core,direct.core);assert(next.game.core.lastMonth.bottles>0);assert(next.game.core.cash>listed.game.core.cash);
 const later=L.advance(next,6).game.core.products.find(x=>x.id===p.id);for(const k of ['roughness','character','wood','age','price'])assert.equal(later[k],frozen[k]);
 const paused=L.setListed(next,p.id,false),laterPaused=L.advance(paused);assert.equal(laterPaused.game.core.products[0].stock,paused.game.core.products[0].stock);
});
test('strong production, bottling, upkeep ledger and selected cask reserve minimum are actual costs',()=>{
 const s=L.createSession({condition:'finance'}),fees=L.costs(s);assert.deepEqual(fees,{distill:150,casks:{bourbon:200,refill:125},bottle:3.75,upkeep:49});
 const q=L.canStart(s,{stop:50,type:'bourbon'});assert.equal(q.cost,350);assert.equal(q.minimum,350+57*3.75+L.view(s).reserve);const started=L.start(s,{stop:50,type:'bourbon'});assert.equal(started.game.core.cash,1250);assert.equal(started.game.core.totals.costs,350);assert.equal(L.view(started).freeSlots,0);assert.throws(()=>L.start(started));
 const advanced=L.advance(s);assert.equal(advanced.game.core.cash,1551);assert.equal(advanced.game.core.totals.upkeep,49);assert.equal(advanced.game.core.lastMonth.upkeep,49);assert.match(advanced.game.core.journal[0].message,/維持費49/);
 close(advanced.game.core.cash,1600+advanced.game.core.totals.revenue-advanced.game.core.totals.costs-advanced.game.core.totals.upkeep);
});
test('reserve stop rejects whole failed transaction, keeps completed months, listed sales can recover',()=>{
 const start=L.createSession({fixture:'lean',condition:'finance'}),copy=structuredClone(start),blocked=L.advance(start,36);assert(blocked.elapsed>0&&blocked.elapsed<36);assert(blocked.notice);assert(blocked.game.core.cash>=L.view(blocked).reserve);
 const unchanged=L.advance(blocked);assert.deepEqual(unchanged.game,blocked.game);assert.equal(unchanged.elapsed,blocked.elapsed);assert.deepEqual(start,copy);
 const bottled=L.bottle(blocked,6),stored=L.advance(bottled);assert.equal(stored.elapsed,bottled.elapsed);const listed=L.setListed(bottled,bottled.game.core.products.at(-1).id),recovered=L.advance(listed);assert.equal(recovered.elapsed,listed.elapsed+1);assert(recovered.game.core.lastMonth.bottles>0);assert(recovered.game.core.cash>=L.view(recovered).reserve);
});
test('4slots require full depletion; partials do not free slots, once per calendar month and product cap',()=>{
 let s=L.createSession({fixture:'full'});assert.equal(L.view(s).freeSlots,0);assert.equal(L.canStart(s).ok,false);s=L.bottle(s,2,1);assert.equal(L.view(s).freeSlots,0);s=L.bottle(s,2);assert.equal(L.view(s).freeSlots,1);s=L.start(s);assert.equal(L.view(s).freeSlots,0);assert.equal(s.game.core.casks.at(-1).age,0);assert.equal(s.serials[s.game.core.casks.at(-1).id],5);
 s=L.bottle(s,4);assert.equal(L.view(s).freeSlots,1);assert.equal(L.canStart(s).ok,false);assert.throws(()=>L.start(s));
 let shelf=L.createSession();for(let i=0;i<8;i++)shelf=L.bottle(shelf,2,1);assert.equal(L.quote(shelf,4,1).ok,false);assert.throws(()=>L.bottle(shelf,4,1));M.validateState(shelf.game.core);
});
test('season factors reuse original retail allocation with same24cap, upcoming month, frozen prices',()=>{
 let s=L.createSession({condition:'season'});for(let i=0;i<8;i++){s=L.bottle(s,6,3);s=L.setListed(s,s.game.core.products.at(-1).id);}const before=structuredClone(s);
 const projection={...s,game:{...s.game,core:{...s.game.core,month:s.game.core.month+1}}},factors=L.retailFactors(projection);for(const x of factors.values())assert(x>=.72&&x<=1.32);
 const direct=E.economicMonthly(s.game,s.game.core.month,factors),next=L.advance(s);assert.deepEqual(next.game.core,direct.core);assert(next.game.core.lastMonth.bottles<=24);assert.deepEqual(s,before);
 assert.equal(L.retailFactors(L.createSession()),null);assert.equal(L.season(s).name,'冬');const summer={...s,game:{...s.game,core:{...s.game.core,month:42}}};assert.equal(L.season(summer).name,'夏');assert.notDeepEqual([...L.retailFactors(s)], [...L.retailFactors(summer)]);
});
test('invalid and insufficient-cash actions are transactional; reset ignores modified session',()=>{
 const s=L.createSession(),copy=structuredClone(s);assert.throws(()=>L.start(s,{stop:100}));assert.throws(()=>L.advance(s,0));assert.throws(()=>L.bottle(s,2,0));assert.throws(()=>L.sample(s,999));assert.throws(()=>L.setListed(s,999));assert.deepEqual(s,copy);
 const poor=structuredClone(s);poor.game.core.cash=0;assert.equal(L.quote(poor,2,1).ok,false);assert.equal(L.canStart(poor).ok,false);assert.throws(()=>L.bottle(poor,2,1));assert.throws(()=>L.start(poor));assert.deepEqual(L.createSession(),s);
});

test('next-season announcement shares calendar schedule and counts boundary months',()=>{
 const s=L.createSession({condition:'season'});assert.equal(L.season(s).next.name,'春');assert.equal(L.season(s).next.months,2);assert.match(L.season(s).next.hint,/原酒/);
 const feb=L.advance(s);assert.equal(L.season(feb).next.months,1);const march=L.advance(feb);assert.equal(L.season(march).name,'春');assert.equal(L.season(march).next.name,'夏');assert.equal(L.season(march).next.months,3);
 const inactive=L.season(L.createSession());assert.equal(inactive.next.hint,'季節による売れ方の変化なし。');
});
