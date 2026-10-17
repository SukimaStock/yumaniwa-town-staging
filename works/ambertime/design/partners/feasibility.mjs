// Read-only recipe/economy comparison using the unchanged v0.7 economy.
// Run from any directory: node works/ambertime/design/partners/feasibility.mjs
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import * as E from '../../economy.mjs';
import * as M from '../../model.mjs';
export const SEEDS=[1,2,3,4,5,6,7,8,9,10,42,20261015];
export const STOPS=[30,48,65,83,99];
export const AGES=[12,18,24,30,36];
export const TERMS=[{partner:'町の卸売商',age:12,price:13.2},{partner:'港の仕入れ店',age:18,price:14.98},{partner:'川沿いの酒販店',age:24,price:17}];
export const SPECIAL={partner:'港の仕入れ店',age:24,price:26.1,roughnessMax:.30,characterMinExclusive:.80,woodMax:.66};
export const matches=r=>r.age===SPECIAL.age&&r.roughness<=SPECIAL.roughnessMax&&r.character>SPECIAL.characterMinExclusive&&r.wood<=SPECIAL.woodMax;
const stats=a=>({count:a.length,min:Math.min(...a),max:Math.max(...a),mean:a.reduce((x,y)=>x+y,0)/a.length});
export function simulateRecipe(seed,stop,type,mode='wait',ages=AGES){
 let s=E.startDistillation(E.newDistillery(seed));
 while(s.still.distillation.progress<stop)s=E.distillStep(s);
 s=E.fillBarrel(E.stopDistillation(s),type);const id=s.core.casks[0].id,rows=[];
 while(s.core.month<Math.max(...ages)){
  while(s.decisions.length){const d=s.decisions[0],n=s.notesById[id];
   const key=mode==='cool'&&!n.cooled&&d.pending.options.some(o=>o.id==='cool')?'cool':'wait';
   if(!d.pending.options.some(o=>o.id===key))throw Error('Recipe cannot continue without an economic decision.');
   s=E.chooseDistillery(s,id,key);
  }
  s=E.tickDistillery(s);const c=E.currentCask(s,id);if(!ages.includes(c.age))continue;
  const q=E.quote(s,id);let shop=E.bottleNow(s,id);const productId=shop.core.products.at(-1).id;
  shop=E.listBottles(shop,productId);let saleMonths=0;
  while(shop.core.products.find(p=>p.id===productId).stock>0&&saleMonths<120){shop=E.tickDistillery(shop);saleMonths++;}
  if(shop.core.products.find(p=>p.id===productId).stock!==0)throw Error('Retail did not sell out.');
  rows.push({seed,stop,cut:c.cut,type,mode,cooled:s.notesById[id].cooled,age:c.age,roughness:c.roughness,character:c.character,wood:c.wood,litres:c.litres,bottles:q.count,standard:Math.round(E.marketValue(c)*100)/100,saleMonths,retailProfit:Math.round((shop.core.cash-1600)*100)/100,cost:120+(type==='bourbon'?160:100)+q.cost+c.age*12,upkeep:c.age*12,taste:M.tasting(c)});
 }
 return rows;
}
export function runGrid(){
 const rows=SEEDS.flatMap(seed=>STOPS.flatMap(stop=>['bourbon','refill'].flatMap(type=>['wait','cool'].flatMap(mode=>simulateRecipe(seed,stop,type,mode)))));
 const terms=TERMS.map(t=>{const a=rows.filter(r=>r.age===t.age),profit=r=>r.bottles*t.price-r.cost;return {...t,gross:stats(a.map(r=>r.bottles*t.price)),profit:stats(a.map(profit)),mediumCutProfit:stats(a.filter(r=>r.stop===65).map(profit)),standardRetailProfit:stats(a.map(r=>r.retailProfit)),retailMonths:stats(a.map(r=>r.saleMonths)),upkeep:t.age*12};});
 const a=rows.filter(matches),special={...SPECIAL,successes:a.length,observations:rows.filter(r=>r.age===SPECIAL.age).length,successfulSeeds:[...new Set(a.map(r=>r.seed))],paths:[...new Set(a.map(r=>`${r.stop}/${r.type}/${r.cooled?'cooled':'unchanged'}`))],cooledSuccesses:a.filter(r=>r.cooled).length,standard:stats(a.map(r=>r.standard)),premiumFraction:stats(a.map(r=>SPECIAL.price/r.standard-1)),profit:stats(a.map(r=>r.bottles*SPECIAL.price-r.cost)),standardRetailProfit:stats(a.map(r=>r.retailProfit))};
 return {method:{seeds:SEEDS,stopProgresses:STOPS,ages:AGES,initialCash:1600,upkeepPerMonth:12,recipePolicies:['wait','cool at first legally offered opportunity'],retailPolicy:'standard price; sell until stock is zero',scope:'Isolated single-cask recipe comparison; no future-dependent player policy, relationship frequency or parallel-capacity model.'},terms,special,rows};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const result=runGrid(),{rows,...summary}=result,header=JSON.stringify(summary,null,2);
 fs.writeFileSync(new URL('feasibility-results.json',import.meta.url),header.slice(0,-2)+',\n  "rows": [\n'+rows.map(row=>'    '+JSON.stringify(row)).join(',\n')+'\n  ]\n}\n');console.log(JSON.stringify({observations:result.rows.length,terms:result.terms,special:result.special},null,2));
}
