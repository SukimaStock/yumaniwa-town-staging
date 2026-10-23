import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as M from '../model.mjs';
import * as T from '../../../town-simulation/v01/model.mjs';
import * as D from '../../../../partner-orders.mjs';
import {ageFlavor} from '../../../../lab-flavor.mjs';

test('seven flavor specimens reproduce native main public cuts and unchanged maturation',()=>{
 for(const f of M.FLAVORS){
  let s=D.selectFlavorCards(D.newConnectedDistillery(42),{malt:f.recipe.malt,ferment:f.recipe.ferment});s=D.startRangeDistillation(s);
  const start=Math.round(f.recipe.start*99),end=Math.round(f.recipe.end*99);
  while(s.still.distillation.progress<start)s=D.distillStep(s);s=D.beginCollection(s);
  while(s.still.distillation.progress<end)s=D.distillStep(s);s=D.fillBarrel(D.stopDistillation(s),f.recipe.cask==='first'?'bourbon':'refill');
  let c=s.core.casks[0];for(let m=1;m<=f.ageMonths;m++)c=ageFlavor({...c,age:m});
  for(const [key,v]of Object.entries(f.profile))assert(Math.abs(c.flavor.profile[key]-v)<2e-12,`${f.id}:${key}`);
  assert.equal(c.flavor.primary,f.product.aromaFamily);assert.equal(c.flavor.label,f.label);
 }
});
test('same flavor has distinct existing shop preferences, different cuts find another recipient',()=>{
 const fruit=M.FLAVORS.find(f=>f.id==='fruit'),smoke=M.FLAVORS.find(f=>f.id==='smoke');
 assert(M.fitDetails('diner',fruit).liked);assert(!M.fitDetails('bar',fruit).liked);
 assert(M.fitDetails('bar',smoke).liked);assert(M.fitDetails('specialist',smoke).liked);
 const matrix=M.FLAVORS.map(f=>M.SHOPS.map(n=>M.fitDetails(n.id,f).fit));
 assert(new Set(matrix[0]).size>3);assert(new Set(M.SHOPS.map((n,i)=>matrix.reduce((best,row,j)=>row[i]>matrix[best][i]?j:best,0))).size>1);
 for(const f of M.FLAVORS)for(const n of M.SHOPS)assert.deepEqual(M.fitDetails(n.id,f).fit,T.affinity(n,f.product,true).fit);
});
test('matched rotation A-E preserves quantity, months, release IDs and receipt IDs',()=>{
 const runs=M.GROUPS.map(g=>M.advance(M.create({seed:42,group:g.id}),360));
 const schedule=s=>s.shipments.map(d=>[d.id,d.month,d.count,d.releaseId,d.flavorId]);
 for(const s of runs){assert.deepEqual(schedule(s),schedule(runs[0]));assert.deepEqual(s.lots,runs[0].lots);assert(M.validate(s).ok);assert.equal(M.summary(s).delivered,720);}
});
test('splitting and frequency are explicit diagnostic conditions with same prepared supply and total',()=>{
 const runs=M.TIMINGS.map(t=>M.advance(M.create({timing:t.id}),120)),sums=runs.map(M.summary);
 assert.equal(sums[0].delivered,240);for(const x of sums)assert.equal(x.delivered,240);
 assert(sums[1].receiptCount>sums[0].receiptCount);assert(sums[2].receiptCount>sums[0].receiptCount);
 assert.equal(new Set(runs[1].shipments.map(d=>d.month)).size,40);assert.equal(new Set(runs[2].shipments.map(d=>d.month)).size,120);
 const strength=s=>s.shipments.reduce((n,d)=>n+1-Math.exp(-d.count/4),0);assert(strength(runs[1])>strength(runs[0]));
});
test('discovery uses an actual inquiry then later consent then strictly later shipment',()=>{
 const s=M.advance(M.create({access:'discovery'}),360);assert(M.validate(s).ok);
 assert(s.events.some(e=>e.type==='offer'));
 for(const id of ['diner','bar','specialist']){const h=s.handling[id];if(h.availableMonth!==null){assert(h.sourceId);const offer=s.events.find(e=>e.id===h.sourceId);assert(offer.month<h.availableMonth);assert(s.town.events.some(e=>e.id===offer.sourceId&&e.type==='inquiry'&&e.to===id));}else assert.equal(M.shopView(s,id).received,0);}
 const quiet=M.advance(M.create({access:'discovery',flavor:'wood'}),1);for(const id of ['diner','bar','specialist'])assert.equal(quiet.handling[id].availableMonth,null);
});
test('handler comments are reproducible, affinity-compatible and tied to real Lab receipts',()=>{
 const s=M.advance(M.create({timing:'split'}),120),copy=structuredClone(s);
 for(const r of s.shipments){const f=M.FLAVORS.find(f=>f.id===r.flavorId),c=M.comment(s,r.to,f,r.id);assert.equal(c.text,r.comment);assert.equal(c.liked,M.fitDetails(r.to,f).liked);assert.equal(c.text,M.comment(copy,r.to,f,r.id).text);assert(!/飲んだ|売れ|お客さん|人気|最高/.test(c.text));if(!c.liked)assert(!/好みに合います|紹介してみたい/.test(c.text));}
 assert(M.SHOPS.every(n=>new Set(s.shipments.filter(r=>r.to===n.id).map(r=>r.comment)).size>=1));
});
test('downloaded log replays exactly; corrupt/foreign logs and invalid input rejected',()=>{
 for(const access of ['open','discovery']){const s=M.advance(M.create({access,change:'switch'}),240),log=M.exportLog(s);assert.deepEqual(M.exportLog(M.replay(JSON.parse(JSON.stringify(log)))),log);assert.equal(log.validation.ok,true);assert.throws(()=>M.replay({...log,checksum:'bad'}));}
 for(const v of [{seed:0},{seed:NaN},{group:'Z'},{timing:'other'},{flavor:'unknown'}])assert.throws(()=>M.create(v));
 const changed=M.exportLog(M.advance(M.create(),12));changed.shipments[0].count++;assert.throws(()=>M.replay(changed),/変わっています/);
 const text=M.exportLog(M.advance(M.create(),12));text.shipments[0].comment='最高';assert.throws(()=>M.replay(text),/変わっています/);
 assert.throws(()=>M.replay({schema:'other'}));assert.throws(()=>M.advance(M.create(),361));
});
test('main, existing Labs, models and save code are byte-identical to fixed base',()=>{
 const files=execFileSync('git',['ls-tree','-r','--format=%(objectname) %(path)',M.BASE,'works/ambertime','works/ambertime-flavor-lab-v02'],{encoding:'utf8'}).trim().split('\n');
 for(const row of files){const [sha,...parts]=row.split(' '),f=parts.join(' '),b=fs.readFileSync(f);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),sha,f);}
 for(const f of ['model.mjs','app.mjs']){const src=fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');assert(!/localStorage|sessionStorage|indexedDB|requestAnimationFrame|setInterval/.test(src));}
});
