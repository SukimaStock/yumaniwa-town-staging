import fs from 'node:fs';
import assert from 'node:assert/strict';
import {runComparison} from './model.mjs';
const compact=r=>({config:r.config,strategies:r.strategies.map(s=>({id:s.id,sold:s.sold,revenue:s.revenue,targetMonth:s.targetMonth,targetSnapshot:s.targetSnapshot,hand:s.hand,shelves:s.shelves,regions:s.regions,shops:Object.fromEntries(Object.entries(s.shops).map(([id,x])=>[id,{paid:x.paidBottles,months:x.activeMonths,score:x.relation.score,current:x.current,region:x.region}]))})),goal:r.goal.map(s=>({id:s.id,sold:s.sold,revenue:s.revenue,targetMonth:s.targetMonth,targetSnapshot:s.targetSnapshot,score:s.shops[r.config.focus].relation.score,months:s.shops[r.config.focus].activeMonths})),split:r.split.map(({events,monthlySales,...s})=>s),splitDiagnostic:r.splitDiagnostic});
const cases=[];
for(const seed of [1,42,20261021])for(const focus of ['bar','town-liquor','supermarket'])for(const smoke of [.25,.75])for(const months of [12,60]){
 const r=runComparison({seed,focus,smoke,months});
 for(const s of [...r.strategies,...r.goal]){
  assert.equal(s.sold+s.hand+Object.values(s.shelves).reduce((a,b)=>a+b,0),r.config.total);
  for(const e of s.events.filter(e=>e.type==='sale'))assert.ok(e.conditions.count<=r.shopDefinitions.find(x=>x.id===e.shopId).opportunities);
 }
 cases.push({config:r.config,strategies:r.strategies.map(s=>({id:s.id,sold:s.sold,revenue:s.revenue,score:s.shops[focus].relation.score,targetMonth:s.targetMonth,regions:s.regions})),goal:r.goal.map(s=>({id:s.id,targetMonth:s.targetMonth,sold:s.sold,score:s.shops[focus].relation.score}))});
}
const report={schema:'ambertime-strategy-lab-evidence/1',baseline:'036df63c7fcb47373bc66f44f8fda6a4d0c9872e',scope:'合成比較。現行本編の100年経営・実機検証ではない。',default:compact(runComparison()),matrix:cases};
fs.writeFileSync(new URL('./results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(`Wrote results.json: ${cases.length} matrix conditions, conservation/capacity PASS.`);
