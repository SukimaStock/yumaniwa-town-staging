import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as D from '../../ambertime/partner-orders.mjs';import * as M from '../../ambertime/model.mjs';
import {cutProfile,streamProfile,colorForProfile,AXES,FIXED_LITRES} from '../projection.mjs';
const conditions=[['plain','short'],['plain','long'],['peat','short'],['peat','long']];
test('projection reproduces actual adopted main flavors across cuts, wood and ages without mutating native game',()=>{
 for(const [malt,ferment] of conditions)for(const [start,end] of [[0,12],[24,52],[0,99]]){
  let s=D.newMarketRulesDistillery(42);s=D.selectFlavorCards(s,{malt,ferment});s=D.startRangeDistillation(s);while(s.still.distillation.progress<start)s=D.distillStep(s);s=D.beginCollection(s);while(s.still.distillation.progress<end)s=D.distillStep(s);s=D.stopDistillation(s);
  const native=JSON.stringify(s);assert.deepEqual(cutProfile({malt,ferment,start,end}).raw,s.core.spirit.flavor.profile);
  for(const cask of ['refill','bourbon']){
   const filled=D.fillBarrel(s,cask);let c=filled.core.casks.at(-1);
   for(let months=0;months<=120;months++){
    if([0,12,60,120].includes(months)){const q=cutProfile({malt,ferment,start,end,cask,months});assert.deepEqual(q.profile,c.flavor.profile);assert.equal(q.label,c.flavor.label);for(const k of ['roughness','character','wood'])assert.equal(q.scalar[k],c[k]);
     const core=M.bottle({...filled.core,month:months,casks:[structuredClone(c)]},c.id),product=core.products.at(-1);assert.equal(q.price,D.salePrices({...filled,core},product.id).standard);
    }
    if(months<120)c=M.ageCask(c);
   }
  }
  assert.equal(JSON.stringify(s),native);
 }
});
test('quantity proposal is cut independent; no new official yield or saved state is claimed',()=>{for(const [start,end] of [[0,12],[0,99],[24,52],[87,99]])assert.equal(cutProfile({start,end}).litres,FIXED_LITRES);});
test('all 3916 legal pairs ×4 conditions use existing 48-midpoint taste average',()=>{
 for(const [malt,ferment] of conditions)for(let start=0;start<=87;start++)for(let end=start+12;end<=99;end++){
  const q=cutProfile({malt,ferment,start,end}),sum=Object.fromEntries(AXES.map(k=>[k,0]));
  for(let i=0;i<48;i++){const p=streamProfile(start+(end-start)*(i+.5)/48,{malt,ferment});for(const k of AXES)sum[k]+=p[k]/48;}
  for(const k of AXES)assert(Math.abs(q.raw[k]-Math.min(1,Math.max(0,sum[k])))<1e-10);
 }
});
test('whole audit dataset counts and price/age group coverage are complete',()=>{const d=JSON.parse(fs.readFileSync(new URL('./summary.json',import.meta.url)));assert.equal(d.totalRawProfiles,15664);assert.equal(d.totalDownstreamProfiles,125312);assert.equal(d.ageGroups.length,32);assert.equal(d.heatmaps.length,24);for(const g of d.ageGroups)assert.equal(g.count,3916);});
test('bounds, symbolic family colors and meaningful start/end differences',()=>{assert.throws(()=>cutProfile({start:1,end:12}));assert.throws(()=>cutProfile({start:-1,end:20}));assert.throws(()=>streamProfile(100));const a=cutProfile({start:12,end:60}),b=cutProfile({start:24,end:60}),c=cutProfile({start:12,end:80});assert.notDeepEqual(a.raw,b.raw);assert.notDeepEqual(a.raw,c.raw);assert.match(colorForProfile(a.raw),/^#[0-9a-f]{6}$/);});
test('symbolic gradient remains deterministic and visibly varied for all preparation conditions',()=>{
 for(const [malt,ferment] of conditions){const colors=Array.from({length:100},(_,p)=>colorForProfile(streamProfile(p,{malt,ferment})));assert.deepEqual(colors,Array.from({length:100},(_,p)=>colorForProfile(streamProfile(p,{malt,ferment}))));const reds=colors.map(c=>parseInt(c.slice(1,3),16));assert(Math.max(...reds)-Math.min(...reds)>=30);assert(new Set(colors).size>40);}
});
test('department projection is only native product condition, never an unlocked sales venue',()=>{assert(cutProfile({months:12}).departmentProductCondition);assert.equal(cutProfile({months:120}).departmentProductCondition,'');assert.equal(cutProfile({start:24,end:52}).shopPrices['town-liquor'],12.8);});
