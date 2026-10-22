import { PARAMETERS as P } from './parameters.mjs';
import {ageFlavor,freezeFlavor} from './lab-flavor.mjs?v=stage4-r2';
export const SAVE_VERSION = 1;
const clamp = (v,lo=0,hi=1)=>Math.min(hi,Math.max(lo,v));
const round = v => Math.round(v*100)/100;
const copy = s => structuredClone(s);
function requireThat(ok, message) { if (!ok) throw new Error(message); }
function finite(v,lo,hi) { return typeof v==='number' && Number.isFinite(v) && v>=lo && v<=hi; }
function rng(s) { let x=s.rngState; x^=x<<13; x^=x>>>17; x^=x<<5; s.rngState=x>>>0; return s.rngState/4294967296; }
function note(s,message) { s.journal.unshift({month:s.month,message}); s.journal=s.journal.slice(0,120); }
function pay(s,cost) { requireThat(s.cash>=cost,`費用 ${round(cost)} に対し資金が足りません。`); s.cash=round(s.cash-cost); s.totals.costs=round(s.totals.costs+cost); }
function id(s) { return s.nextId++; }
export function monthLabel(month) { return `${P.startYear+Math.floor(month/12)}年${month%12+1}月`; }
export function ageLabel(months) { return months<12?`${months}か月`:`${Math.floor(months/12)}年${months%12?`${months%12}か月`:''}`; }
export function newGame(seed=20261014) {
  requireThat(Number.isInteger(seed)&&seed>=1&&seed<=4294967295,'シードは1〜4294967295の整数です。');
  return {version:SAVE_VERSION,modelVersion:P.modelVersion,seed,rngState:seed,month:0,cash:P.startingCash,nextId:1,lastDistillation:-1,
    spirit:null,casks:[],products:[],archive:[],journal:[],lastMonth:null,totals:{revenue:0,costs:0,upkeep:0,evaporated:0,bottlesSold:0}};
}
export function previewDistillation(cut) {
  requireThat(finite(cut,0,1),'抽出範囲が不正です。');
  return {litres:round(P.baseLitres+P.extraLitres*cut),roughness:0.22+0.68*cut,character:0.30+0.60*cut};
}
export function distill(state,cut) {
  requireThat(!state.spirit,'先に原酒を樽詰めするか、瓶詰めしてください。');
  requireThat(state.lastDistillation!==state.month,'今月の蒸留は終わりました。次の月に仕込めます。');
  const f=previewDistillation(cut),s=copy(state); pay(s,P.distillationCost);
  const variation=0.96+rng(s)*0.08;
  s.spirit={id:id(s),batchMonth:s.month,cut,initialLitres:round(f.litres),litres:round(f.litres),roughness:clamp(f.roughness*variation),character:clamp(f.character*variation),wood:0,age:0};
  s.lastDistillation=s.month; note(s,`仕込み${s.spirit.id}：抽出${Math.round(cut*100)}%、${f.litres.toFixed(1)} Lの原酒。`); return s;
}
export function fillCask(state,type,litres=state.spirit?.litres) {
  requireThat(Object.hasOwn(P.casks,type),'樽の種類が不正です。');
  requireThat(state.spirit,'樽詰めする原酒がありません。');
  requireThat(state.casks.length<P.maxCasks,'貯蔵庫の4樽が埋まっています。');
  requireThat(finite(litres,1,state.spirit.litres),'樽詰め量が不正です。');
  const s=copy(state); pay(s,P.casks[type].cost); const spirit=copy(s.spirit);
  const cask={...spirit,id:id(s),batchId:spirit.id,type,filledMonth:s.month,age:0,litres,initialLitres:litres,
    variation:{soften:0.86+rng(s)*0.28,wood:0.86+rng(s)*0.28,evaporation:0.92+rng(s)*0.16},history:[]};
  cask.history.push({month:s.month,text:tasting(cask)}); s.casks.push(cask);
  s.spirit.litres=round(s.spirit.litres-litres); if(s.spirit.litres<P.bottleLitres) {
    if(s.spirit.litres>0) note(s,`樽詰め後、瓶1本に届かない原酒の端数${s.spirit.litres.toFixed(2)} Lを整理した。`);
    s.spirit=null;
  }
  note(s,`樽${cask.id}に仕込み${spirit.id}を${litres.toFixed(1)} L詰めた。${P.casks[type].short}。`); return s;
}
export function tasting(c) {
  if(c.flavor?.version===1)return [c.roughness<.3?'口当たりが穏やか':c.roughness<.6?'少し刺激が残る':'刺激が強い',c.flavor.label,c.wood<.3?'樽の香りは控えめ':'樽の香りを感じる'].join('。')+'。';
  const rough=c.roughness>0.6?'舌に強い刺激が残る':c.roughness>0.30?'口当たりにまだ角がある':c.roughness>0.12?'刺激がほどけ、丸さが出てきた':'やわらかい口当たり';
  const aroma=c.character>0.80?'熟した果実と厚い穀物の香り':c.character>0.57?'果実と穀物の香りが広がる':c.character>0.35?'軽い果実、穀物の香り':'香りは控えめ';
  const wood=c.wood>0.85?'乾いた木の苦みが余韻を覆う':c.wood>0.66?'木の渋みが長く残る':c.wood>0.36?'バニラと木の香りが重なる':c.wood>0.13?'ほのかにバニラを感じる':'木の香りはまだ淡い';
  return `${rough}。${aroma}。${wood}。`;
}
export function ageCask(cask) {
  const c=copy(cask),b=P.casks[c.type]; c.age++;
  c.roughness=clamp(c.roughness*Math.exp(-b.soften*c.variation.soften*(1.12-0.18*c.cut)));
  c.wood=clamp(c.wood+b.wood*c.variation.wood*(1-0.30*c.wood),0,1.35);
  const bloom=(0.30+0.16*c.cut)*Math.exp(-c.age/P.aromaBloomMonths)/P.aromaBloomMonths;
  c.character=clamp(c.character+bloom-0.016*Math.max(0,c.wood-0.62));
  c.litres=Math.max(0,c.litres*(1-b.evaporation*c.variation.evaporation));
  return c.flavor?.version===1?ageFlavor(c):c;
}
// Private economic signal. Never rendered as a score, optimum age or future price.
export function marketValue(c) {
  if(c.age===0) return Math.max(9,12+9*c.character-3*c.roughness-P.newmakeHarshnessPenalty*c.roughness**2);
  const balance=clamp(0.38*(1-c.roughness)+0.48*c.character+0.14*Math.min(c.wood/0.42,1)-0.85*Math.max(0,c.wood-0.65));
  const maturity=1-Math.exp(-c.age/16);
  return Math.max(9,14+P.maturePremium*balance*maturity+5*c.character-6*Math.max(0,c.wood-0.70)-P.youngHarshnessPenalty*c.roughness**2*Math.exp(-c.age/18));
}
export function upkeep(state) { return P.baseUpkeep+state.casks.length*P.caskUpkeep+(state.spirit?P.spiritUpkeep:0); }
export function bottleQuote(state,sourceId=null) {
  const source=sourceId===null?state.spirit:state.casks.find(c=>c.id===sourceId);
  requireThat(source,'瓶詰めする原酒がありません。');
  const count=Math.floor((source.litres+1e-9)/P.bottleLitres);
  return {count,cost:count*P.bottlingCost};
}
export function bottle(state,sourceId=null,count=null,{directSale=false}={}) {
  const q=bottleQuote(state,sourceId); count??=q.count;
  requireThat(Number.isInteger(count)&&count>=1&&count<=q.count,'瓶詰め本数が不正です。');
  requireThat(directSale||state.products.filter(p=>p.stock>0).length<P.maxProducts,'販売棚の8商品が埋まっています。');
  const s=copy(state),source=sourceId===null?s.spirit:s.casks.find(c=>c.id===sourceId); pay(s,count*P.bottlingCost);
  const product={id:id(s),sourceId:source.id,batchId:source.batchId??source.id,batchMonth:source.batchMonth,bottledMonth:s.month,
    type:source.type??'newmake',age:source.age,cut:source.cut,roughness:source.roughness,character:source.character,wood:source.wood,
    stock:count,originalStock:count,price:source.age===0?16:30,revenue:0,sold:0,lastSold:0,lastRevenue:0};
  if(source.flavor?.version===1)product.flavor=freezeFlavor(source);
  s.products.push(product); s.products=s.products.filter(p=>p.stock>0||s.month-p.bottledMonth<=24).slice(-32);
  const remaining=source.litres-count*P.bottleLitres;
  if(sourceId===null) { s.spirit.litres=Math.max(0,remaining); if(remaining<P.bottleLitres) s.spirit=null; }
  else { source.litres=Math.max(0,remaining); if(remaining<P.bottleLitres){
    s.casks=s.casks.filter(c=>c.id!==sourceId); s.archive.unshift({...source,bottledMonth:s.month,text:tasting(source)}); s.archive=s.archive.slice(0,24);
  }}
  note(s,`${sourceId===null?'ニューメイク':`樽${source.id}（${ageLabel(source.age)}）`}を${count}本瓶詰め。商品${product.id}の販売は来月から。`); return s;
}
export function setPrice(state,productId,price) {
  requireThat(finite(price,P.minPrice,P.maxPrice),'価格は2〜160です。');
  requireThat(state.products.some(p=>p.id===productId),'商品がありません。');
  const s=copy(state); s.products.find(p=>p.id===productId).price=round(price); return s;
}
export function advanceMonth(state,{listedProductIds}={}) {
  if(listedProductIds!==undefined) requireThat(Array.isArray(listedProductIds)&&new Set(listedProductIds).size===listedProductIds.length&&listedProductIds.every(id=>state.products.some(p=>p.id===id)),'販売する商品の識別値が不正です。');
  const s=copy(state); s.month++; let evaporated=0;
  s.casks=s.casks.map(c=>{const after=ageCask(c); evaporated+=c.litres-after.litres;
    if(after.age%3===0) { after.history.push({month:s.month,text:tasting(after)}); after.history=after.history.slice(-12); } return after;});
  s.casks=s.casks.filter(c=>{if(c.litres>=P.bottleLitres)return true;
    s.archive.unshift({...c,endedMonth:s.month,endReason:'蒸発により瓶1本未満になった',text:tasting(c)});s.archive=s.archive.slice(0,24);
    note(s,`樽${c.id}は天使の分け前で瓶1本未満になり、貯蔵庫を片づけた。`);return false;});
  // A small local shelf: all products share customers. High prices slow turnover.
  // Characterful spirit keeps its niche even if rough; maturity is not the sole signal.
  const stocked=s.products.filter(p=>p.stock>0&&(listedProductIds===undefined||listedProductIds.includes(p.id)));
  const desire=p=>Math.min(p.stock, (p.age<6?16:10+6*p.character)*(0.80+0.20*p.character)*Math.exp(P.priceElasticity*(1-p.price/marketValue(p))));
  const wishes=stocked.map(desire),sum=wishes.reduce((a,b)=>a+b,0),scale=Math.min(1,P.monthlyCustomers/Math.max(sum,1));
  let revenue=0,bottles=0; const sales=[];
  s.products.forEach(p=>{p.lastSold=0;p.lastRevenue=0;});
  stocked.forEach((p,i)=>{const sold=Math.min(p.stock,Math.floor(wishes[i]*scale)); p.stock-=sold;p.sold+=sold;p.lastSold=sold;
    p.lastRevenue=round(sold*p.price);p.revenue=round(p.revenue+p.lastRevenue);revenue+=p.lastRevenue;bottles+=sold;
    sales.push({id:p.id,sold,revenue:p.lastRevenue});});
  const maintenance=upkeep(s); s.cash=round(s.cash+revenue-maintenance);
  s.totals.revenue=round(s.totals.revenue+revenue);s.totals.upkeep=round(s.totals.upkeep+maintenance);
  s.totals.evaporated+=evaporated;s.totals.bottlesSold+=bottles;
  s.lastMonth={month:s.month,revenue:round(revenue),upkeep:maintenance,bottles,evaporated,sales};
  note(s,`${monthLabel(s.month)}：販売${bottles}本・収入${round(revenue)}、維持費${maintenance}。天使の分け前${evaporated.toFixed(2)} L。`); return s;
}
export function serialize(state) { validateState(state); return JSON.stringify(state); }
export function restore(text) {
  requireThat(typeof text==='string'&&text.length<1000000,'保存データが大きすぎます。');
  let s; try{s=JSON.parse(text);}catch{throw new Error('保存データを読み取れません。');}
  validateState(s);return s;
}
export function validateState(s) {
  requireThat(s&&typeof s==='object'&&s.version===SAVE_VERSION&&s.modelVersion===P.modelVersion,'対応していない保存形式です。');
  for(const k of ['seed','rngState','nextId']) requireThat(Number.isInteger(s[k])&&s[k]>=1&&s[k]<=4294967295,'保存データの識別値が不正です。');
  requireThat(Number.isInteger(s.month)&&s.month>=0&&s.month<=120000,'保存データの年月が不正です。');
  requireThat(Number.isInteger(s.lastDistillation)&&s.lastDistillation>=-1&&s.lastDistillation<=s.month,'保存データの蒸留月が不正です。');
  requireThat(finite(s.cash,-1e12,1e12),'保存データの資金が不正です。');
  requireThat(Array.isArray(s.casks)&&s.casks.length<=P.maxCasks&&Array.isArray(s.products)&&s.products.length<=32&&Array.isArray(s.archive)&&s.archive.length<=24&&Array.isArray(s.journal)&&s.journal.length<=120,'保存データの棚が不正です。');
  const validSpirit=c=>c&&Number.isInteger(c.id)&&c.id>0&&c.id<s.nextId&&Number.isInteger(c.batchMonth)&&c.batchMonth>=0&&c.batchMonth<=s.month&&finite(c.cut,0,1)&&finite(c.roughness,0,1)&&finite(c.character,0,1)&&finite(c.wood,0,1.35)&&finite(c.litres,0,40.001)&&finite(c.initialLitres,0,40.001)&&c.litres<=c.initialLitres+1e-8&&Number.isInteger(c.age)&&c.age>=0&&c.age<=s.month;
  requireThat(s.spirit===null||(s.spirit&&typeof s.spirit==='object'),'保存データの原酒が不正です。');
  if(s.spirit) requireThat(validSpirit(s.spirit)&&s.spirit.age===0,'保存データの原酒が不正です。');
  const validHistory=h=>Array.isArray(h)&&h.length<=12&&h.every(n=>Number.isInteger(n.month)&&n.month>=0&&n.month<=s.month&&typeof n.text==='string'&&n.text.length<=500);
  for(const c of [...s.casks,...s.archive]) requireThat(validSpirit(c)&&Object.hasOwn(P.casks,c.type)&&Number.isInteger(c.batchId)&&Number.isInteger(c.filledMonth)&&c.filledMonth>=c.batchMonth&&c.filledMonth<=s.month&&(s.archive.includes(c)||c.age===s.month-c.filledMonth)&&c.batchId>0&&c.batchId<s.nextId&&c.variation&&['soften','wood','evaporation'].every(k=>finite(c.variation[k],0.8,1.2))&&validHistory(c.history),'保存データの樽が不正です。');
  for(const p of s.products) requireThat(p&&Number.isInteger(p.id)&&p.id>0&&p.id<s.nextId&&Number.isInteger(p.sourceId)&&p.sourceId>0&&p.sourceId<s.nextId&&Number.isInteger(p.batchId)&&p.batchId>0&&p.batchId<s.nextId&&(['newmake',...Object.keys(P.casks)]).includes(p.type)&&Number.isInteger(p.age)&&p.age>=0&&p.age<=s.month&&finite(p.cut,0,1)&&finite(p.roughness,0,1)&&finite(p.character,0,1)&&finite(p.wood,0,1.35)&&finite(p.price,P.minPrice,P.maxPrice)&&Number.isInteger(p.stock)&&p.stock>=0&&p.stock<=58&&Number.isInteger(p.originalStock)&&p.originalStock<=Math.floor(40/P.bottleLitres)&&p.originalStock===p.stock+p.sold&&Number.isInteger(p.sold)&&p.sold>=0&&Number.isInteger(p.lastSold)&&p.lastSold>=0&&p.lastSold<=p.sold&&finite(p.lastRevenue,0,1e12)&&finite(p.revenue,0,1e12)&&Number.isInteger(p.batchMonth)&&p.batchMonth>=0&&Number.isInteger(p.bottledMonth)&&p.bottledMonth>=p.batchMonth&&p.bottledMonth<=s.month&&p.age<=p.bottledMonth-p.batchMonth,'保存データの商品が不正です。');
  requireThat(s.products.filter(p=>p.stock>0).length<=P.maxProducts,'保存データの商品数が不正です。');
  const activeIds=[...(s.spirit?[s.spirit.id]:[]),...s.casks.map(c=>c.id),...s.products.map(p=>p.id)];requireThat(new Set(activeIds).size===activeIds.length,'保存データのIDが重複しています。');
  requireThat(s.journal.every(n=>Number.isInteger(n.month)&&n.month>=0&&n.month<=s.month&&typeof n.message==='string'&&n.message.length<=500),'保存データの記録が不正です。');
  requireThat(s.totals&&['revenue','costs','upkeep','evaporated','bottlesSold'].every(k=>finite(s.totals[k],0,1e12)),'保存データの集計が不正です。');
  requireThat(s.lastMonth===null||(s.lastMonth&&s.lastMonth.month===s.month&&['revenue','upkeep','bottles','evaporated'].every(k=>finite(s.lastMonth[k],0,1e12))&&Array.isArray(s.lastMonth.sales)&&s.lastMonth.sales.length<=32&&s.lastMonth.sales.every(x=>Number.isInteger(x.id)&&Number.isInteger(x.sold)&&x.sold>=0&&finite(x.revenue,0,1e12))),'保存データの月次結果が不正です。');
  return true;
}
