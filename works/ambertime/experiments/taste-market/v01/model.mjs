// AmberTime taste × shops Lab 0.1. Independent toy model; never reads/writes main save.
export const VERSION = 'ambertime-taste-market/1';
export const FLAVORS = Object.freeze([
  {id:'fruit', name:'果実の香り', note:'やわらかい果実香', taste:[.88,.10,.13]},
  {id:'smoke', name:'煙の香り', note:'煙と力強い原酒', taste:[.14,.91,.18]},
  {id:'wood', name:'樽の香り', note:'樽香と余韻', taste:[.21,.22,.91]}
]);
export const SHOPS = Object.freeze([
  {id:'liquor', name:'町の酒店', note:'特徴のある味が好き', taste:[.35,.75,.51], salesRate:1.0},
  {id:'super', name:'町のスーパー', note:'飲みやすさが好み', taste:[.89,.09,.18], salesRate:1.12},
  {id:'bar', name:'路地のバー', note:'香りと余韻を楽しむ', taste:[.28,.71,.81], salesRate:.95}
]);
const copy=x=>structuredClone(x);
const check=(v,msg)=>{if(!v)throw Error(msg);};
const release=s=>FLAVORS.find(f=>f.id===s);
const shop=s=>SHOPS.find(f=>f.id===s);
export const when=month=>Math.floor(month/12)+'年'+month%12+'か月';
export const hand=s=>s.releases.reduce((n,r)=>n+r.stock,0);
export const storeStock=(s,id)=>Object.values(s.shops[id].shelf).reduce((n,v)=>n+v,0);
export const totalStored=s=>hand(s)+SHOPS.reduce((n,t)=>n+storeStock(s,t.id),0);
export const isSoldOut=(s,id)=>{const r=s.releases.find(x=>x.id===id);return !!r&&r.stock===0&&SHOPS.every(t=>(s.shops[t.id].shelf[id]??0)===0);};
export function fit(shopId,flavorId){
  const a=shop(shopId),b=release(flavorId);
  check(a&&b,'店・味が見つかりません。');
  const diff=a.taste.reduce((n,v,i)=>n+Math.abs(v-b.taste[i]),0)/3;
  return Math.max(0,Math.min(1,1-diff*1.35));
}
export function fitLabel(score){return score>=.76?'よく合う':score>=.54?'好みが分かれる':'少し合わない';}
function noise(seed,...pieces){
  let h=(seed>>>0)^0x9e3779b9;
  for(const part of pieces){const word=String(part);for(const letter of word){h=Math.imul(h^letter.charCodeAt(0),16777619)>>>0;}}
  h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;h=Math.imul(h,0x846ca68b)>>>0;h^=h>>>16;
  return (h>>>0)/4294967296;
}
function addRelease(s,flavorId,initial=false){
  const f=release(flavorId);check(f,'味を選んでください。');
  const id=s.releases.length+1,stock=18;
  s.releases.push({id,flavorId,createdMonth:s.month,stock,produced:stock,sold:0,delivered:0});
  s.produced+=stock;
  s.history.push({month:s.month,type:'release',releaseId:id,text:'第'+id+'回 '+f.name+'を18本ビン詰め'});
  if(!initial)s.lastNotice='第'+id+'回 '+f.name+'をビン詰めしました。';
  return id;
}
export function create(seed=42){
  check(Number.isInteger(seed)&&seed>0&&seed<=4294967295,'シードは1以上の整数にしてください。');
  const s={version:VERSION,seed,brand:'AmberTime',month:0,produced:0,sold:0,releases:[],shops:{},history:[],lastNotice:'',actions:[]};
  for(const item of SHOPS)s.shops[item.id]={contract:true,shelf:{},totalSold:0,totalDelivered:0,last:{wish:0,delivered:0,sold:0,shortage:0,detail:'取扱契約中。最初の月から自動で納品します。'}};
  for(const f of FLAVORS)addRelease(s,f.id,true);
  s.lastNotice='3つの発売回ができました。1か月進めると、自動で店に届きます。';
  validate(s);return s;
}
const releaseById=(s,id)=>s.releases.find(r=>r.id===Number(id));
function monthlySales(s,shopId){
  const holder=s.shops[shopId];let total=0;
  for(const [idString,quantity] of Object.entries(holder.shelf)){
    const id=Number(idString),r=releaseById(s,id);if(quantity<=0)continue;
    const affinity=fit(shopId,r.flavorId);
    // One shared flavor-independent starting point, with shop compatibility determining pace.
    const expected=(.12+2.55*affinity*affinity)*shop(shopId).salesRate;
    const count=Math.min(quantity,Math.floor(expected)+(noise(s.seed,'sale',s.month,shopId,id)<expected%1?1:0));
    if(!count)continue;
    holder.shelf[id]-=count;holder.totalSold+=count;r.sold+=count;s.sold+=count;total+=count;
    s.history.push({month:s.month,type:'sale',shopId,releaseId:id,count,fit:affinity,text:shop(shopId).name+'で第'+id+'回が'+count+'本売れた'});
  }
  return total;
}
function chooseRelease(s,shopId){
  const stock=s.releases.filter(r=>r.stock>0&&r.createdMonth<s.month);
  if(!stock.length)return null;
  // Preference is soft: a mismatched whisky can still reach a shop. Never relabel release identity.
  return stock.map(r=>({r,score:fit(shopId,r.flavorId)+.12*noise(s.seed,'choice',s.month,shopId,r.id)}))
    .sort((a,b)=>b.score-a.score||a.r.id-b.r.id)[0].r;
}
function replenish(s,shopId){
  const holder=s.shops[shopId],best=s.releases.filter(r=>r.stock>0&&r.createdMonth<s.month).map(r=>fit(shopId,r.flavorId));
  // No minimum lot and no monthly order button. A store does not refill a full shelf.
  const target=best.length?3+Math.floor(Math.max(...best)*4):4;
  const wish=Math.max(0,target-storeStock(s,shopId));
  let remaining=wish,delivered=0;const receipts=[];
  while(remaining>0){
    const r=chooseRelease(s,shopId);if(!r)break;
    const n=Math.min(r.stock,remaining);r.stock-=n;r.delivered+=n;holder.shelf[r.id]=(holder.shelf[r.id]??0)+n;
    delivered+=n;remaining-=n;holder.totalDelivered+=n;receipts.push('第'+r.id+'回 '+n+'本');
    s.history.push({month:s.month,type:'delivery',shopId,releaseId:r.id,count:n,fit:fit(shopId,r.flavorId),text:shop(shopId).name+'へ第'+r.id+'回を'+n+'本届けた'});
  }
  return {wish,delivered,shortage:remaining,receipts};
}
export function step(s){
  check(s?.version===VERSION,'Labの状態を確認してください。');
  check(s.month<360,'30年までの試遊です。');
  s.month++;
  const sold={};
  for(const t of SHOPS)sold[t.id]=monthlySales(s,t.id);
  // Rotate fulfillment priority so one shop cannot always take scarce inventory first.
  for(let i=0;i<SHOPS.length;i++){
    const t=SHOPS[(s.month+i)%SHOPS.length],h=s.shops[t.id],v=replenish(s,t.id);
    const soldCount=sold[t.id],lastSale=[...s.history].reverse().find(e=>e.type==='sale'&&e.shopId===t.id&&e.month===s.month);
    const lastRelease=lastSale?releaseById(s,lastSale.releaseId):null,flavor=lastRelease?release(lastRelease.flavorId):null;
    h.last={...v,sold:soldCount,detail:lastSale?(flavor.name+'の第'+lastRelease.id+'回が'+soldCount+'本売れました。'):(storeStock(s,t.id)?'今月は店頭での販売がありませんでした。':'在庫待ちです。')};
  }
  s.lastNotice=when(s.month)+'：店で'+SHOPS.reduce((n,t)=>n+s.shops[t.id].last.sold,0)+'本売れました。';
  validate(s);return s;
}
export function advance(s,count=1){
  check(Number.isInteger(count)&&count>=0&&s.month+count<=360,'進める月数を確認してください。');
  for(let i=0;i<count;i++)step(s);return s;
}
export function brew(s,flavorId){
  check(s?.version===VERSION&&s.releases.length<99,'発売回の上限です。');
  addRelease(s,flavorId);s.actions.push({type:'brew',month:s.month,flavorId});validate(s);return s;
}
export function reaction(s,shopId){
  const h=s.shops[shopId];check(h,'店が見つかりません。');
  const sales=s.history.filter(e=>e.shopId===shopId&&e.type==='sale'),last=sales.at(-1);
  if(!last)return h.totalDelivered?'まだ販売の反応はありません。':'まだウイスキーが届いていません。';
  const f=releaseById(s,last.releaseId);
  const taste=release(f.flavorId);
  const score=fit(shopId,taste.id);
  if(score>=.76)return '第'+f.id+'回の'+taste.name+'は、うちのお客さんによく合っています。';
  if(score>=.54)return '第'+f.id+'回の'+taste.name+'は、好みが分かれるようです。';
  return '第'+f.id+'回の'+taste.name+'は、うちではゆっくり売れています。';
}
export function report(s){
  return SHOPS.map(t=>({shopId:t.id,contract:s.shops[t.id].contract,stock:storeStock(s,t.id),sold:s.shops[t.id].totalSold,delivered:s.shops[t.id].totalDelivered,last:copy(s.shops[t.id].last),reaction:reaction(s,t.id)}));
}
export function validate(s){
  check(s?.version===VERSION&&Number.isInteger(s.month)&&s.month>=0,'Labの状態が不正です。');
  check(s.releases.every((r,i)=>r.id===i+1&&release(r.flavorId)&&Number.isInteger(r.stock)&&r.stock>=0&&Number.isInteger(r.sold)&&r.sold>=0),'発売回の在庫が不正です。');
  check(SHOPS.every(t=>s.shops[t.id]?.contract===true&&Object.entries(s.shops[t.id].shelf).every(([id,n])=>releaseById(s,id)&&Number.isInteger(n)&&n>=0)),'店頭在庫が不正です。');
  check(s.produced===s.sold+totalStored(s),'ビンの合計が合いません。');
  check(s.sold===SHOPS.reduce((n,t)=>n+s.shops[t.id].totalSold,0),'店の販売記録が合いません。');
  return true;
}
export function exportLog(s){validate(s);return {version:VERSION,seed:s.seed,actions:copy(s.actions),month:s.month,checksum:JSON.stringify({produced:s.produced,sold:s.sold,stock:totalStored(s)})};}
export function replay(log){
  check(log?.version===VERSION&&Array.isArray(log.actions)&&log.actions.length<=99,'Labのログを確認してください。');
  const s=create(log.seed);
  for(const a of log.actions){check(a.type==='brew'&&Number.isInteger(a.month)&&a.month>=s.month&&a.month<=log.month,'ログの操作が不正です。');advance(s,a.month-s.month);brew(s,a.flavorId);}
  advance(s,log.month-s.month);
  check(exportLog(s).checksum===log.checksum,'ログの記録が一致しません。');return s;
}
