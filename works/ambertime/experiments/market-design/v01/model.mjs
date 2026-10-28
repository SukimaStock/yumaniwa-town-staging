import scenarios from './scenarios.mjs';
import {planSales} from './sales.mjs';
import {planStoreMarketSales} from '../../../store-market.mjs';
import {marketValue} from '../../../economy.mjs';
import {PARALLEL_PARAMETERS as P,ECONOMY_PARAMETERS as C} from '../../../economy-parameters.mjs';
export const STORAGE_KEY='ambertime-market-design-v01';
export const VERSION='ambertime-market-shelf/1';
const clone=x=>structuredClone(x),round=x=>Math.round(x*100)/100;
const assert=(x,t)=>{if(!x)throw Error(t);};
const places=['hand','retail','town-liquor','supermarket'];
function count(p,v){return v==='hand'||v==='retail'?p[v]:p.shops[v];}
function change(p,v,n){if(v==='hand'||v==='retail')p[v]+=n;else p.shops[v]+=n;}
export function create({mode='candidate',scenario='matched'}={}){
 assert(['current','candidate'].includes(mode)&&scenarios[scenario],'試遊条件を確認してください。');
 const initial=clone(scenarios[scenario]);
 return {schema:VERSION,mode,scenario,seed:42,month:0,cash:initial.cash,initialCash:initial.cash,investment:initial.costs,setupUpkeep:initial.upkeep,nativeMonth:initial.nativeMonth,products:initial.products,ledger:{},actions:[],lastSales:[],history:[],revenue:0,maintenance:0,diagnostics:{scope:'棚の比較。2店は開放済み。本編の解放・生産・資金判断を含む経済検証はREPORT.md参照。',provenance:initial.provenance}};
}
function currentPlan(s,venue,month){
 const products=s.products.map(p=>({...clone(p),stock:count(p,venue),bottledMonth:0,price:venue==='retail'?p.price: p.price}));
 if(venue==='retail'){
  const stocked=products.filter(p=>p.stock),youngCount=stocked.filter(p=>p.age<P.youngDemandMonths).length;
  const wishes=stocked.map(p=>Math.min(p.stock,(p.age<P.youngDemandMonths?P.youngDemand/youngCount:10+6*p.character)*(.8+.2*p.character)*Math.exp(C.priceElasticity*(1-p.price/marketValue(p)))));
  const sum=wishes.reduce((a,b)=>a+b,0),scale=Math.min(1,C.monthlyCustomers/Math.max(sum,1)),quotas=wishes.map(w=>w*scale),counts=quotas.map(Math.floor);
  let extra=Math.floor(quotas.reduce((a,b)=>a+b,0)+1e-9)-counts.reduce((a,b)=>a+b,0);
  for(const {i} of stocked.map((p,i)=>({i,f:quotas[i]-counts[i],id:p.id})).sort((a,b)=>b.f-a.f||a.id-b.id))if(extra>0&&counts[i]<stocked[i].stock){counts[i]++;extra--;}
  return {sales:stocked.map((p,i)=>({id:p.id,count:counts[i]})).filter(x=>x.count),opportunities:C.monthlyCustomers};
 }
 const native={seed:s.seed,core:{products},storeMarket:{version:1,byShop:{'town-liquor':{},supermarket:{}}},placement:{version:1,retailByProduct:{}},shopDemand:{mode:'variable'},shop:{relations:[{shopId:venue,brandId:1,startedMonth:-1}],deliveries:[]},releases:products.map(p=>({id:p.id,productId:p.id,brandId:1,age:p.age,profile:p,listed:true,bottledMonth:0})),productsById:Object.fromEntries(products.map(p=>[p.id,{listed:true,listedMonth:0}]))};
 for(const p of products)native.storeMarket.byShop[venue][p.id]=p.stock;
 const plan=planStoreMarketSales(native,month)[0];
 return {sales:plan.shipments.map(x=>({id:x.productId,count:x.count})),opportunities:plan.requested};
}
function price(p,venue){return round(p.price*(venue==='town-liquor'?.8:1));}
function apply(s,a){
 assert(a&&typeof a.type==='string','操作を確認してください。');
 if(a.type==='move'){
  const p=s.products.find(p=>p.id===a.productId);assert(p&&places.includes(a.from)&&places.includes(a.to)&&a.from!==a.to,'瓶と行き先を確認してください。');
  assert(a.to!=='supermarket'||p.age>=12,'スーパーは12か月から渡せます。');
  assert(Number.isInteger(a.count)&&a.count>0&&a.count<=count(p,a.from),'移す本数を確認してください。');
  change(p,a.from,-a.count);change(p,a.to,a.count);return;
 }
 assert(a.type==='month','この試遊に対応していない操作です。');
 const month=s.month+1;s.lastSales=[];for(const p of s.products)p.lastSold=0;
 for(const venue of places.slice(1)){
  const items=s.products.map(p=>({...p,count:count(p,venue),price:price(p,venue),referencePrice:venue==='retail'?marketValue(p):venue==='town-liquor'?16:20}));
  const plan=s.mode==='candidate'?planSales(items,venue,s.ledger[venue],{month,seed:s.seed}):currentPlan(s,venue,month);
  if(plan.ledger)s.ledger[venue]=plan.ledger;
  for(const sale of plan.sales){const p=s.products.find(p=>p.id===sale.id),revenue=round(sale.count*price(p,venue));change(p,venue,-sale.count);p.totalSold+=sale.count;p.lastSold+=sale.count;s.cash=round(s.cash+revenue);s.revenue=round(s.revenue+revenue);s.lastSales.push({productId:p.id,venue,count:sale.count,revenue});}
 }
 // This detached shelf projection has no casks. Preserve native £4 upkeep and reject unaffordable month.
 assert(s.cash>=4,'維持費を払えず月が進みません。瓶の置き先を変えて試せます。');
 s.cash=round(s.cash-4);s.maintenance+=4;s.month=month;
 s.history.push({month,cash:s.cash,sold:s.lastSales.reduce((n,x)=>n+x.count,0),revenue:s.revenue,stock:s.products.reduce((n,p)=>n+p.hand+p.retail+Object.values(p.shops).reduce((a,b)=>a+b,0),0)});
}
export function validate(s){
 assert(s?.schema===VERSION&&['current','candidate'].includes(s.mode)&&scenarios[s.scenario],'このLabの保存を選んでください。');
 assert(Number.isInteger(s.month)&&s.month>=0&&Number.isFinite(s.cash)&&s.cash>=0,'資金と経過月を確認してください。');
 for(const p of s.products){const counts=[p.hand,p.retail,p.reserved,p.totalSold,...Object.values(p.shops)];assert(counts.every(x=>Number.isInteger(x)&&x>=0)&&counts.reduce((a,b)=>a+b,0)===p.initialCount,'在庫を確認できません。');}
 assert(s.cash===round(s.initialCash+s.revenue-s.maintenance),'資金を確認できません。');return true;
}
export function serialize(s){validate(s);return JSON.stringify(s);}
export function transact(s,action,saveFn=()=>{}){
 validate(s);const next=clone(s);apply(next,clone(action));next.actions.push(clone(action));validate(next);
 const saved=saveFn(serialize(next));assert(saved!==false,'保存できなかったため変更していません。');assert(!saved||typeof saved.then!=='function','同期保存を使用してください。');return next;
}
export function load(text){
 assert(typeof text==='string'&&text.length<2e6,'保存の大きさを確認してください。');const input=JSON.parse(text);validate(input);assert(Array.isArray(input.actions)&&input.actions.length<=2000,'操作記録を確認してください。');
 let s=create(input);for(const a of input.actions)s=transact(s,a);assert(serialize(s)===JSON.stringify(input),'保存と操作記録が一致しません。');return s;
}
