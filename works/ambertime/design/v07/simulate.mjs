// Deterministic business policies; no time, DOM, storage, or save mutation.
import * as E from '../../economy.mjs';
import * as OLD from '../../parallel.mjs';
import * as M from '../../model.mjs';
export const SEEDS=[1,2,3,42,20261016];
export const POLICIES=[
 {name:'早期回転',age:18,n:1,progress:85,type:'bourbon'},
 {name:'長期熟成',age:36,n:1,progress:80,type:'refill'},
 {name:'二樽並行',age:24,n:2,progress:70,type:'bourbon'},
 {name:'四樽並行',age:24,n:4,progress:70,type:'bourbon'},
 {name:'若い狭い抽出',age:12,n:1,progress:55,type:'refill'},
 {name:'木の強い長期（損失例）',age:84,n:1,progress:30,type:'bourbon'},
 {name:'若い原酒の連続販売',age:0,n:1,progress:30,type:'refill'}
];
const r=n=>Math.round(n*100)/100;
export function simulate(seed,policy,{months=240,old=false}={}){
 const D=old?OLD:E;let s=D.newDistillery(seed),forced=0,starts=0,bottled=0,minCash=s.core.cash,stalls=0;const snapshots={},ages=[];
 function bottle(id){s=D.bottleNow(D.endTasting(s),id);const product=s.core.products.at(-1);s=D.listBottles(s,product.id);bottled++;ages.push(product.age);}
 for(let step=0;s.core.month<months&&step<months*10;step++){
  while(s.decisions.length){const d=s.decisions[0],c=D.currentCask(s,d.caskId);const wait=d.pending.options.find(o=>o.id==='wait')??d.pending.options.find(o=>o.id!=='bottle');if(c.age>=policy.age||!wait){if(c.age<policy.age)forced++;bottle(c.id);}else s=D.chooseDistillery(s,c.id,wait.id);}
  for(const c of [...s.core.casks])if(c.age>=policy.age)bottle(c.id);
  if(s.core.casks.length<policy.n&&D.canStart(s).ok&&s.core.cash>=D.canStart(s).minimum+(policy.type==='bourbon'?60:0)){
   s=D.startDistillation(s);for(let i=0;i<policy.progress;i++)s=D.distillStep(s);s=D.stopDistillation(s);s=D.fillBarrel(s,policy.type);starts++;
  }
  const previous=s;s=D.tickDistillery(s);minCash=Math.min(minCash,s.core.cash);
  if(previous.core.month===s.core.month){stalls++;if(!s.decisions.length)break;continue;}
  if([36,72,120,240].includes(s.core.month)){
   const caskValue=s.core.casks.reduce((v,c)=>v+M.bottleQuote(s.core,c.id).count*(old?M.marketValue(c):E.marketValue(c))-M.bottleQuote(s.core,c.id).cost,0);
   const inventory=s.core.products.reduce((v,p)=>v+p.stock*p.price,0);
   snapshots[s.core.month]={cash:r(s.core.cash),estimatedAssets:r(s.core.cash+caskValue+inventory),revenue:s.core.totals.revenue,costs:s.core.totals.costs,upkeep:s.core.totals.upkeep,litres:r(s.core.casks.reduce((v,c)=>v+c.litres,0)),stock:s.core.products.reduce((v,p)=>v+p.stock,0),starts,bottled,forced};
  }
 }
 return {seed,policy:policy.name,month:s.core.month,minCash:r(minCash),forced,starts,bottled,meanBottleAge:r(ages.reduce((a,b)=>a+b,0)/Math.max(1,ages.length)),stalls,canStart:D.canStart(s).ok,remainingCasks:s.core.casks.length,remainingStock:s.core.products.reduce((v,p)=>v+p.stock,0),cash:s.core.cash,snapshots};
}
if(process.argv[1]&&import.meta.url===new URL(`file://${process.argv[1]}`).href){
 const runs=[];for(const old of [true,false])for(const policy of POLICIES)for(const seed of SEEDS)runs.push({old,...simulate(seed,policy,{old})});
 console.log(JSON.stringify({note:'Estimated assets use current unit value × bottles, not guaranteed sale proceeds. Policies resolve choices by waiting; funds or final bottle-only choices bottle immediately.',runs},null,2));
}
