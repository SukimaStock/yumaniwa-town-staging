import {writeFileSync} from 'node:fs';
import {newGame,distill,fillCask,bottle,bottleQuote,setPrice,advanceMonth,marketValue,serialize,restore} from './model.mjs';
import {PARAMETERS as P} from './parameters.mjs';
export const POLICIES={
 A:{name:'早期販売型',ages:[6],cut:0.65,prices:[21]},
 B:{name:'長期熟成型',ages:[36],cut:0.65,prices:[48]},
 C:{name:'バランス型',ages:[6,36],cut:0.65,prices:[21,48]}
};
export function simulate(policy,seed,months=120,{cut=policy.cut,type='alternate'}={}) {
 let s=newGame(seed),batches=0,bottledLitres=0; let minCash=s.cash; const cash=[{month:0,cash:s.cash}],harvest=[],caskTargets=new Map();
 // Same rule for all: attempt one batch every 3 months while cash covers
 // distillation+cask+bottling reserve+6 months of current upkeep. Four slots.
 for(let m=0;m<months;m++) {
  for(const c of [...s.casks]) if(c.age>=caskTargets.get(c.id)&&s.products.filter(p=>p.stock>0).length<P.maxProducts){
   const q=bottleQuote(s,c.id); if(s.cash>=q.cost) {
    const target=caskTargets.get(c.id),index=policy.ages.indexOf(target);
    s=bottle(s,c.id);minCash=Math.min(minCash,s.cash);const product=s.products.at(-1);s=setPrice(s,product.id,policy.prices[index]??policy.prices[0]);
    harvest.push({month:s.month,age:c.age,type:c.type,remainingLitres:c.litres,value:marketValue(c),bottles:q.count,price:product.price});bottledLitres+=q.count*P.bottleLitres;
   }
  }
  const caskType=type==='alternate'?(batches%2?'refill':'bourbon'):type;
  const reserve=P.distillationCost+P.casks[caskType].cost+180+6*(P.baseUpkeep+(s.casks.length+1)*P.caskUpkeep);
  if(s.month%3===0&&!s.spirit&&s.casks.length<P.maxCasks&&s.cash>=reserve) {
   s=distill(s,cut);s=fillCask(s,caskType);minCash=Math.min(minCash,s.cash);caskTargets.set(s.casks.at(-1).id,policy.ages[batches%policy.ages.length]);batches++;
  }
  s=advanceMonth(s);minCash=Math.min(minCash,s.cash);if(s.month%12===0)cash.push({month:s.month,cash:s.cash});
  if(s.month===47)s=restore(serialize(s));
 }
 const inventoryValue=s.products.reduce((sum,p)=>sum+p.stock*p.price,0);
 const caskValue=s.casks.reduce((sum,c)=>sum+Math.floor(c.litres/P.bottleLitres)*(marketValue(c)-P.bottlingCost),0);
 return {policy:policy.name,seed,months,cut,type,cash:s.cash,minCash,cashByYear:cash,revenue:s.totals.revenue,upkeep:s.totals.upkeep,productionCosts:s.totals.costs,batches,bottlesSold:s.totals.bottlesSold,evaporatedLitres:s.totals.evaporated,remainingLitres:s.casks.reduce((sum,c)=>sum+c.litres,0),unsoldBottles:s.products.reduce((sum,p)=>sum+p.stock,0),estimatedUnsoldValue:Math.round(inventoryValue+caskValue),harvest};
}
export function comparison(){
 const seeds=[1,7,42,81,2026,20261014,123456789,987654321];
 const scenarios=[{label:'標準',cut:0.65,type:'alternate'},{label:'広い抽出・バーボン樽',cut:0.95,type:'bourbon'},{label:'狭い抽出・リフィル樽',cut:0.15,type:'refill'}];
 return {modelVersion:P.modelVersion,months:120,startingCash:P.startingCash,method:'All policies use the same seed, attempted 3-month production cadence, four slots, cost+180 bottling+6-month upkeep reserve. Prices fixed by policy; no oracle peak/price optimizer. Estimated inventory is analytical only, not realized profit or a UI forecast.',runs:scenarios.flatMap(sc=>Object.entries(POLICIES).flatMap(([key,p])=>seeds.map(seed=>({...simulate(p,seed,120,sc),key,scenario:sc.label}))))};
}
if(import.meta.url===`file://${process.argv[1]}`){const result=comparison();
 if(process.argv.includes('--write'))writeFileSync(new URL('./simulation-results.json',import.meta.url),JSON.stringify({...result,runs:result.runs.map(({harvest,...r})=>({...r,harvestSummary:{count:harvest.length,averageValue:harvest.reduce((v,h)=>v+h.value,0)/Math.max(1,harvest.length),averageRemainingLitres:harvest.reduce((v,h)=>v+h.remainingLitres,0)/Math.max(1,harvest.length),first:harvest[0],last:harvest.at(-1)}}))},null,2)+'\n');
 const groups=new Map();for(const r of result.runs){const key=r.scenario+' / '+r.key; if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 if(process.argv.includes('--audit')) {
 const rows=['policy,seed,cut,cask,cash,min_cash,revenue,upkeep,evaporated_litres,unsold_bottles,batches'];
 for(const [key,p] of Object.entries(POLICIES)) for(const seed of [1,7,42,20261014])for(const type of ['bourbon','refill'])for(const cut of [0,.15,.35,.65,.95,1]) {
  const r=simulate(p,seed,120,{cut,type});rows.push([key,seed,cut,type,r.cash,r.minCash,r.revenue,r.upkeep,r.evaporatedLitres.toFixed(3),r.unsoldBottles,r.batches].join(','));
 }
 writeFileSync(new URL('./extraction-audit.csv',import.meta.url),rows.join('\n')+'\n');
 }
 console.table([...groups].map(([policy,rs])=>({policy,cash:Math.round(rs.reduce((s,r)=>s+r.cash,0)/rs.length),cashRange:`${Math.round(Math.min(...rs.map(r=>r.cash)))}–${Math.round(Math.max(...rs.map(r=>r.cash)))}`,revenue:Math.round(rs.reduce((s,r)=>s+r.revenue,0)/rs.length),upkeep:Math.round(rs.reduce((s,r)=>s+r.upkeep,0)/rs.length),evaporation:Math.round(rs.reduce((s,r)=>s+r.evaporatedLitres,0)/rs.length*10)/10,batches:rs[0].batches,inventory:Math.round(rs.reduce((s,r)=>s+r.estimatedUnsoldValue,0)/rs.length)})));
}
