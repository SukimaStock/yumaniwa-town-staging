import {writeFileSync} from 'node:fs';
import {createOpening} from './opening.mjs';
import {simulate,POLICIES} from './simulate.mjs';
import {distill,fillCask,bottle,bottleQuote,setPrice,advanceMonth,upkeep,serialize,restore} from './model.mjs';
import {PARAMETERS as P} from './parameters.mjs';
export function openingPolicy(policy,seed,months=120){
 let s=createOpening(seed),batches=1,minCash=s.cash;const targets=new Map([[s.casks[0].id,policy.ages[0]]]);const startMonth=s.month;
 for(let step=0;step<months;step++){
  for(const c of [...s.casks])if(c.age>=targets.get(c.id)&&s.products.filter(p=>p.stock>0).length<P.maxProducts){const q=bottleQuote(s,c.id);if(s.cash>=q.cost){s=bottle(s,c.id);minCash=Math.min(minCash,s.cash);const p=s.products.at(-1),index=policy.ages.indexOf(targets.get(c.id));s=setPrice(s,p.id,policy.prices[index]);}}
  const type=batches%2?'refill':'bourbon',reserve=P.distillationCost+P.casks[type].cost+180+6*(P.baseUpkeep+(s.casks.length+1)*P.caskUpkeep);
  if(s.month%3===0&&!s.spirit&&s.casks.length<P.maxCasks&&s.cash>=reserve){s=fillCask(distill(s,.65),type);targets.set(s.casks.at(-1).id,policy.ages[batches%policy.ages.length]);batches++;minCash=Math.min(minCash,s.cash);}
  s=advanceMonth(s);minCash=Math.min(minCash,s.cash);if(step===47)s=restore(serialize(s));
 }
 return {startMonth,endMonth:s.month,months,cash:s.cash,minCash,revenue:s.totals.revenue,upkeep:s.totals.upkeep,costs:s.totals.costs,evaporatedLitres:s.totals.evaporated,batches,liveCasks:s.casks.length,stock:s.products.reduce((n,p)=>n+p.stock,0)};
}
export function compareOpening(){return {note:'Numerical model unchanged. Compare120 playable months from each opening.0.2 has one normally paid8-month cask and starts month8, cash3364; old starts month0,cash4000. Calendar endpoints/assets differ; this is viability, not an equal-assets profit ranking.',runs:Object.entries(POLICIES).flatMap(([key,p])=>[1,7,42,81,2026,20261014,123456789,987654321].map(seed=>({key,seed,before:(()=>{const r=simulate(p,seed);return {cash:r.cash,minCash:r.minCash,revenue:r.revenue,upkeep:r.upkeep,costs:r.productionCosts};})(),after:openingPolicy(p,seed)})))};}
if(import.meta.url===`file://${process.argv[1]}`){const r=compareOpening();if(process.argv.includes('--write'))writeFileSync(new URL('./opening-balance-results.json',import.meta.url),JSON.stringify(r,null,2)+'\n');for(const key of ['A','B','C']){const rs=r.runs.filter(x=>x.key===key);console.log(key,{beforeCash:Math.round(rs.reduce((n,r)=>n+r.before.cash,0)/rs.length),afterCash:Math.round(rs.reduce((n,r)=>n+r.after.cash,0)/rs.length),afterMinCash:Math.min(...rs.map(r=>r.after.minCash))});}}
