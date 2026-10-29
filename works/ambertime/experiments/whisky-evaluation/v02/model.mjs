import * as E from '../v011/model.mjs';
import {cohort} from '../v01/model.mjs';
import {distill,mature,expression,valid} from '../../../../ambertime-flavor-lab-v02/model.mjs';
import {projectFlavor} from '../../../lab-flavor.mjs';
import {marketValue as coreValue} from '../../../model.mjs';
import {PARALLEL_PARAMETERS as P,ECONOMY_PARAMETERS as C} from '../../../economy-parameters.mjs';
import {planSales,unit,RULES as SALES_VERSION} from '../../../market-sales.mjs';
import * as D from '../../hand-and-place/v073/draft.mjs';

export const VERSION='whisky-evaluation/0.2';
export const MAX_LOG_BYTES=12000000;
export const EVALUATION_VERSION=E.VERSION;
export {SALES_VERSION};
export const SAMPLES=E.SAMPLES,AGES=[1,3,6,8,10,15,20],PRICE_TIERS=P.priceTiers;
export const SHOPS=[{id:'diner',name:'町の食堂',nativeVenue:'supermarket',draftKey:'retail'},{id:'bar',name:'町のバー',nativeVenue:'retail',draftKey:'restaurant'},{id:'specialist',name:'専門酒店',nativeVenue:'town-liquor',draftKey:'liquor'}];
const copy=x=>structuredClone(x),round=x=>Math.round(x*100)/100,assert=(x,t)=>{if(!x)throw Error(t);};
const shop=id=>SHOPS.find(x=>x.id===id),product=(s,id=s.selectedId)=>s.products.find(p=>p.id===id);
export const allocation=s=>Object.fromEntries(SHOPS.map(x=>[x.id,s.draft.allocation[x.draftKey]]));
export const freeHand=(s,id=s.selectedId)=>product(s,id).hand-(id===s.selectedId?Object.values(allocation(s)).reduce((a,b)=>a+b,0):0);
const freshDraft=p=>D.createDraft({stock:p.hand,retail:0});
export function makeProduct({id=1,sample='balanced',years=8,tier='standard',recipe=null,createdMonth=0}={}){
 assert(SAMPLES.some(s=>s.id===sample)&&AGES.includes(years)&&Object.hasOwn(PRICE_TIERS,tier),'製法・年数・価格を確認してください。');
 const source=SAMPLES.find(s=>s.id===sample),choice=copy(recipe??source.recipe);assert(valid(choice),'製法を確認してください。');
 const spirit=distill(choice),profile=mature(spirit,years,choice.cask),projection=projectFlavor(profile);
 const referencePrice=Math.max(P.minimumMarketValue,coreValue({...projection,age:years*12})*P.marketMultiplier);
 const price=Math.max(C.minPrice,Math.min(C.maxPrice,round(referencePrice*PRICE_TIERS[tier])));
 return {id,sample,name:source.name,years,tier,recipe:choice,profile,expression:expression(profile,spirit),projection,referencePrice,price,createdMonth,hand:5,shops:Object.fromEntries(SHOPS.map(s=>[s.id,0])),sold:0,recovered:0};
}
export function create({seed=20261029}={}){
 assert(Number.isInteger(seed)&&seed>=1&&seed<=4294967295,'シードを確認してください。');const p=makeProduct();
 return {version:VERSION,evaluationVersion:E.VERSION,salesVersion:SALES_VERSION,seed,month:0,products:[p],selectedId:1,draft:freshDraft(p),ledgers:{},lastMonths:[],actions:[],revenue:0};
}
export const salesItem=(p,count)=>({id:p.id,count,age:p.years*12,price:p.price,referencePrice:p.referencePrice,...p.projection,flavor:{profile:p.profile}});
// Read-only caches: neither inventory nor evaluation is stored in the shared engines.
const guestCache=new Map();
export function guests(shopId,seed){const key=shopId+':'+seed;if(!guestCache.has(key)){if(guestCache.size>600)guestCache.clear();guestCache.set(key,cohort(shopId,seed));}return guestCache.get(key);}
export function evaluatePurchase(p,shopId,seed,serial,month){
 // Buyer selection never reads fit, verdict, support rate or sale probability.
 const g=guests(shopId,seed),id=Math.floor(unit(seed,`${VERSION}:buyer:${shopId}:${month}:${p.id}:${serial}`)*g.length),guest=g[id];
 const result=E.assess({...p,flavorYears:p.years},guest,'B',E.ADOPTED);
 return {...result,serial,month,shopId,productId:p.id,reaction:E.reaction(result,p)};
}
function monthStep(s){
 const month=++s.month,rows=[];
 for(const definition of SHOPS){
  const items=s.products.map(p=>salesItem(p,p.shops[definition.id]));
  const plan=planSales(items,definition.nativeVenue,s.ledgers[definition.id],{month,seed:s.seed,method:'seeded'});
  s.ledgers[definition.id]=plan.ledger;
  for(const sale of plan.sales){
   const p=product(s,sale.id),before=p.sold;p.shops[definition.id]-=sale.count;p.sold+=sale.count;
   const evaluations=Array.from({length:sale.count},(_,i)=>evaluatePurchase(p,definition.id,s.seed,before+i,month));
   const revenue=round(sale.count*p.price);s.revenue=round(s.revenue+revenue);
   rows.push({shopId:definition.id,productId:p.id,count:sale.count,unitPrice:p.price,revenue,evaluations});
  }
 }
 s.lastMonths.push({month,shops:rows,revenue:round(rows.reduce((n,r)=>n+r.revenue,0)),inventory:s.products.map(p=>({productId:p.id,hand:p.hand,shops:copy(p.shops),sold:p.sold,recovered:p.recovered}))});
}
function apply(s,a){
 assert(a&&typeof a.type==='string','操作を確認してください。');const p=product(s);
 if(a.type==='select'){assert(product(s,a.productId),'瓶を選んでください。');assert(Object.values(allocation(s)).every(x=>x===0),'仮置きを確定または取り消してください。');s.selectedId=a.productId;s.draft=freshDraft(product(s));}
 else if(a.type==='place'){
  const target=shop(a.shopId);assert(target&&['1','5','all'].includes(a.portion),'本数と店を選んでください。');
  const count=Math.min(freeHand(s),a.portion==='all'?Infinity:Number(a.portion));assert(count>0,'手元に瓶がありません。');
  const values={...s.draft.allocation,[target.draftKey]:s.draft.allocation[target.draftKey]+count};assert(D.setAllocation(s.draft,values).changed,'仮置きできません。');
 }
 else if(a.type==='undo')assert(D.undo(s.draft).changed,'取り消す配分がありません。');
 else if(a.type==='cancel'){D.redistribute(s.draft);s.draft=freshDraft(p);}
 else if(a.type==='confirm'){
  const counts=allocation(s),sum=Object.values(counts).reduce((a,b)=>a+b,0);assert(sum>0,'届ける瓶を置いてください。');
  assert(sum<=p.hand,'手元の本数を超えています。');p.hand-=sum;for(const d of SHOPS)p.shops[d.id]+=counts[d.id];s.draft=freshDraft(p);
 }
 else if(a.type==='recall'){
  assert(Object.values(allocation(s)).every(x=>x===0),'仮置きを確定または取り消してください。');
  const x=product(s,a.productId),d=shop(a.shopId),count=a.count??x?.shops[d?.id];assert(x&&d&&Number.isInteger(count)&&count>0&&count<=x.shops[d.id],'回収する本数を確認してください。');
  x.shops[d.id]-=count;x.hand+=count;x.recovered+=count;s.draft=freshDraft(p);
 }
 else if(a.type==='advance'){
  assert(Object.values(allocation(s)).every(x=>x===0),'配分を確定してから時間を進めてください。');
  assert(Number.isInteger(a.months)&&a.months>=1&&a.months<=12&&s.month+a.months<=1200,'進める月数を確認してください。');
  for(let i=0;i<a.months;i++)monthStep(s);
 }
 else if(a.type==='next'){
  assert(Object.values(allocation(s)).every(x=>x===0),'仮置きを確定または取り消してください。');
  assert(s.month>s.products.at(-1).createdMonth&&s.products.length<100,'時間を進めてから次の試作を選べます。');
  const next=makeProduct({...a,id:s.products.length+1,createdMonth:s.month});s.products.push(next);s.selectedId=next.id;s.draft=freshDraft(next);
 }
 else throw Error('このLabに対応していない操作です。');
}
export function validate(s){
 assert(s?.version===VERSION&&s.evaluationVersion===E.VERSION&&s.salesVersion===SALES_VERSION,'このLabの記録を選んでください。');
 assert(Number.isInteger(s.seed)&&s.seed>0&&s.seed<=4294967295&&Number.isInteger(s.month)&&s.month>=0&&s.month<=1200,'シードと月を確認してください。');
 assert(Array.isArray(s.products)&&s.products.length>0&&s.products.length<=100&&new Set(s.products.map(p=>p.id)).size===s.products.length&&product(s),'瓶の記録を確認してください。');
 for(const p of s.products){const counts=[p.hand,p.sold,...SHOPS.map(d=>p.shops[d.id])];assert(counts.every(n=>Number.isInteger(n)&&n>=0)&&counts.reduce((a,b)=>a+b,0)===5,'瓶の保存則が成立しません。');assert(Number.isInteger(p.recovered)&&p.recovered>=0,'回収記録を確認してください。');}
 assert(freeHand(s)>=0&&s.draft.total===product(s).hand&&Object.values(allocation(s)).every(n=>Number.isInteger(n)&&n>=0),'仮置きの本数を確認してください。');
 assert(Array.isArray(s.lastMonths)&&s.lastMonths.length===s.month&&s.lastMonths.every((m,i)=>m.month===i+1),'月の記録を確認してください。');
 let cash=0;const sold=new Map();
 for(const m of s.lastMonths){assert(m.revenue===round(m.shops.reduce((n,r)=>n+r.revenue,0))&&m.inventory.every(p=>p.hand+p.sold+SHOPS.reduce((n,d)=>n+p.shops[d.id],0)===5),'月末在庫・売上を確認してください。');for(const r of m.shops){assert(shop(r.shopId)&&product(s,r.productId)&&r.count>0&&Number.isInteger(r.count)&&r.evaluations.length===r.count&&r.revenue===round(r.count*r.unitPrice),'実売と評価・売上が一致しません。');cash+=r.revenue;sold.set(r.productId,(sold.get(r.productId)??0)+r.count);}}
 assert(round(cash)===s.revenue&&s.products.every(p=>(sold.get(p.id)??0)===p.sold),'売上・実売累計を確認してください。');
 assert(Array.isArray(s.actions)&&s.actions.length<=5000,'操作数を確認してください。');return true;
}
export function transact(s,action,saveFn=()=>{}){
 validate(s);const next=copy(s);apply(next,copy(action));next.actions.push(copy(action));validate(next);
 const saved=saveFn(serialize(next));assert(saved!==false&&!(saved&&typeof saved.then==='function'),'記録できなかったため変更していません。');return next;
}
export function serialize(s){validate(s);const text=JSON.stringify(s);assert(new TextEncoder().encode(text).length<MAX_LOG_BYTES,'記録が大きいため、別の試遊として始めてください。');return text;}
export function restore(text){
 assert(typeof text==='string'&&new TextEncoder().encode(text).length<MAX_LOG_BYTES,'記録の大きさを確認してください。');const input=JSON.parse(text);validate(input);
 let s=create({seed:input.seed});for(const a of input.actions)s=transact(s,a);
 assert(JSON.stringify(s)===JSON.stringify(input),'記録と操作履歴が一致しません。');return s;
}
export function productSummary(s,productId=s.selectedId){
 const p=product(s,productId);assert(p,'瓶を選んでください。');
 const byShop=SHOPS.map(d=>{
  const rows=s.lastMonths.flatMap(m=>m.shops.filter(r=>r.productId===p.id&&r.shopId===d.id)),evaluations=rows.flatMap(r=>r.evaluations),n=evaluations.length;
  const ordered=[...evaluations].sort((a,b)=>a.score-b.score||a.id-b.id),positive=evaluations.filter(x=>['like','strong'].includes(x.verdict)).length,negative=evaluations.filter(x=>x.verdict==='miss').length;
  const representative=ordered.length?ordered[Math.floor((ordered.length-1)/2)]:null;
  const favorable=[...evaluations].filter(x=>['like','strong'].includes(x.verdict)).sort((a,b)=>b.score-a.score)[0]??null;
  const unfavorable=[...evaluations].filter(x=>['neutral','miss'].includes(x.verdict)).sort((a,b)=>a.score-b.score)[0]??null;
  return {shopId:d.id,sold:n,remaining:p.shops[d.id],revenue:round(rows.reduce((a,b)=>a+b.revenue,0)),evaluations,positive,negative,strong:evaluations.filter(x=>x.verdict==='strong').length,representative,favorable,unfavorable,storeReaction:n===0?(p.shops[d.id]?'まだ売れていません。':'まだ販売していません。'):p.shops[d.id]===0?'届いた瓶は売り切れました。':`${n}本売れ、${p.shops[d.id]}本を店頭に置いています。`};
 });
 return {productId:p.id,sold:p.sold,revenue:round(byShop.reduce((a,b)=>a+b.revenue,0)),byShop};
}
export function csv(s){validate(s);const q=x=>'"'+String(x??'').replaceAll('"','""')+'"';const rows=[['version','seed','month','productId','sample','years','shop','price','sold','revenue','remainingAtMonthEnd','guest','verdict','score','rawScore','positiveImpression','negativeImpression','reason']];
 // One CSV row per actual purchase, so sales and revenue remain additive.
 for(const m of s.lastMonths)for(const r of m.shops){const p=product(s,r.productId);for(const e of r.evaluations)rows.push([VERSION,s.seed,m.month,p.id,p.sample,p.years,r.shopId,r.unitPrice,1,r.unitPrice,m.inventory.find(x=>x.productId===p.id).shops[r.shopId],e.id,e.verdict,e.score,e.rawScore,e.positiveImpression,e.negativeImpression,e.reaction.text]);}
 return '\uFEFF'+rows.map(row=>row.map(q).join(',')).join('\r\n');
}
