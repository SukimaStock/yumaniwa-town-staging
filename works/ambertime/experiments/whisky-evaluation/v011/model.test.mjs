import test from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../v01/model.mjs';
import * as N from './model.mjs';
test('original evaluation adapter preserves all original scores/counts/reactions',()=>{
 for(const shop of B.SHOPS)for(const sample of B.SAMPLES)for(const years of B.AGES){const c={shop:shop.id,sample:sample.id,years},old=B.evaluate(c),r=N.baseline(c);for(const k of ['support','strong','peak','medianGuest','counts','reaction','fan'])assert.deepEqual(r[k],old[k]);assert.deepEqual(r.people.map(p=>p.score),old.people.map(p=>p.score));}
});
test('same seed same original people; no cohort or flavor changes',()=>{
 const c={sample:'smoke',shop:'bar',years:15},g=B.cohort('bar',B.SEED),original=structuredClone(g),b=B.bottle(c),copy=structuredClone(b);
 for(const variant of Object.keys(N.VARIANTS)){const r=N.evaluate(c,variant,b,g);assert.deepEqual(r.bottle,b);assert.deepEqual(r.people.map(p=>[p.id,p.type,p.ageInterest]),g.map(p=>[p.id,p.type,p.ageInterest]));}assert.deepEqual(g,original);assert.deepEqual(b,copy);assert.deepEqual(N.matched(c),N.matched(c));
});
test('soft ceiling preserves order, thresholds, and derivative at join in attainable raw domain',()=>{
 let previous=-1;for(let i=0;i<=1360;i++){const raw=i/1000,s=N.softCeiling(raw);assert.ok(s>=previous&&s<1);previous=s;for(const t of [.48,.62,.8])assert.equal(s>=t,raw>=t);}
 assert.ok(N.softCeiling(1.1)<N.softCeiling(1.11));const eps=1e-6;assert.ok(Math.abs((N.softCeiling(.8+eps)-N.softCeiling(.8))/eps-1)<1e-5);
});
test('chosen continuous ceiling changes no support decision or raw fit from retained-axis proposal',()=>{
 for(const sample of B.SAMPLES)for(const years of B.AGES)for(const shop of B.SHOPS){const c={sample:sample.id,shop:shop.id,years},a=N.evaluate(c,'salience'),p=N.evaluate(c,'guarded');a.people.forEach((x,i)=>{const y=p.people[i];assert.equal(y.fit,x.fit);assert.equal(y.rawScore,x.rawScore);assert.equal(y.verdict,x.verdict);assert.ok(y.score<1);});}
});
test('positive/negative/neutral impression partitions and never converts negative impression into support',()=>{
 const r=N.evaluate({sample:'deep',years:1,shop:'diner'});assert.ok(r.counts.miss>0);for(const p of r.people){assert.equal(p.positiveImpression+p.negativeImpression+p.neutralImpression,p.impression);if(p.verdict==='miss'){assert.equal(p.positiveImpression,0);assert.ok(p.signedImpression<0);}if(['strong','like'].includes(p.verdict))assert.ok(p.signedImpression>0);}
 assert.equal(r.histogram.reduce((a,b)=>a+b),120);assert.ok(r.rawPeak>=r.peak);assert.equal(r.ceilingRate,0);
});
test('fixed flavor, real aging, and exactly one changed comparison condition',()=>{
 for(const dimension of ['years','sample','shop','model']){const rows=N.compare({...B.DEFAULT,aging:'fixed'},dimension);for(const pair of rows){assert.deepEqual(pair.before.conditions,pair.after.conditions);assert.deepEqual(pair.before.bottle,pair.after.bottle);for(const k of Object.keys(B.DEFAULT))if(k!==dimension&&k!=='aging')assert.equal(pair.after.conditions[k],B.DEFAULT[k]);if(dimension==='years')assert.deepEqual(pair.after.bottle.profile,rows[0].after.bottle.profile);}}
 assert.notDeepEqual(N.evaluate({years:1}).bottle.profile,N.evaluate({years:20}).bottle.profile);
});
test('long age deepens some and loses some even with fixed flavor; short and long both have supporters',()=>{
 for(const model of ['A','B','C']){const a=N.evaluate({aging:'fixed',years:1,model}),b=N.evaluate({aging:'fixed',years:20,model}),d=N.differences(a,b);assert.ok(d.up>0&&d.down>0);assert.ok(d.support<0);const tradeoffs=B.SAMPLES.flatMap(s=>B.SHOPS.map(shop=>{const c={sample:s.id,shop:shop.id,aging:'fixed',model};return N.differences(N.evaluate({...c,years:1}),N.evaluate({...c,years:20}));}));assert.ok(tradeoffs.some(x=>x.strong>0&&x.support<0));}
 assert.ok(N.evaluate({sample:'balanced',years:1,shop:'specialist'}).strong>0);assert.ok(N.evaluate({sample:'smoke',years:20,shop:'diner'}).strong>0);assert.ok(N.evaluate({sample:'deep',years:20,shop:'specialist'}).strong>0);
});
test('reactions point to computed intensity, signed mismatch and maturity, and fans remain identifiable',()=>{
 for(const sample of B.SAMPLES)for(const shop of B.SHOPS)for(const years of B.AGES){const r=N.evaluate({sample:sample.id,shop:shop.id,years});for(const p of r.people){const t=N.reaction(p,r.bottle),worst=p.axisFacts.find(x=>x.axis===p.unmatched.at(-1));if(p.verdict==='miss')assert.ok(t.text.includes(worst.delta>0?'強すぎ':'もう少し'));if(p.maturity>=.08&&['strong','like'].includes(p.verdict))assert.match(t.text,/熟成を待った価値/);if(p.verdict==='strong')assert.match(t.text,/好きです/);}assert.ok(r.people.some(p=>p.id===r.fan.guest));}
});
test('IDs remain correct under reordering and comparisons reject different people/tastes',()=>{
 const c=B.DEFAULT,g=B.cohort(c.shop,c.seed).map((p,i)=>({...p,id:i+1000})),a=N.evaluate(c,N.ADOPTED,null,g),b=N.evaluate(c,N.ADOPTED,null,[...g].reverse());assert.equal(a.reaction.text,b.reaction.text);const delta=N.differences(a,b);assert.deepEqual([delta.up,delta.down,delta.same,delta.support,delta.strong],[0,0,120,0,0]);assert.ok(Math.abs(delta.positiveImpression)<1e-12&&Math.abs(delta.negativeImpression)<1e-12);
 const wrong=structuredClone(b);wrong.people[0].id=99999;assert.throws(()=>N.differences(a,wrong));const wrongTaste=structuredClone(b);wrongTaste.people[0].axisFacts[0].target=.999;assert.throws(()=>N.differences(a,wrongTaste));
 assert.throws(()=>N.evaluate(c,N.ADOPTED,null,[g[0],g[0]]));
});
test('malformed supplied bottles, variants and log versions fail; exports replay exactly',()=>{
 for(const axis of B.AXES){const b=B.bottle({});b.profile[axis]=NaN;assert.throws(()=>N.evaluate({},N.ADOPTED,b));}const b=B.bottle({});b.years=3;assert.throws(()=>N.evaluate({},N.ADOPTED,b));assert.throws(()=>N.evaluate({},'unknown'));assert.throws(()=>N.replay({version:'0'}));
 const log=N.exportLog(B.DEFAULT,'shop');assert.deepEqual(N.replay(JSON.parse(JSON.stringify(log))),log);assert.equal(N.csv(log).split('\r\n').length,7);
});
