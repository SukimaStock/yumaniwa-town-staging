// Reputation Lab only. All six stores are fictional experimental counterparts.
// No main save, finance, demand, offer RNG or judging model is replaced here.
import * as D from '../../partner-orders.mjs';
import * as M from '../../model.mjs';
import * as E from '../../economy.mjs';
import {brandReputation,retailReputationFactors} from '../../brand-reputation.mjs';
import {shopEvidence,shopProductCondition} from '../../shop-model.mjs';
import {departmentReleaseEligible} from '../../department-projects.mjs';
export const DEFAULT_SEED=20261020;
export const MODES=Object.freeze([{id:'baseline',name:'現行の参照'},{id:'spread',name:'店から店へ'},{id:'familiarity',name:'広がりと馴染み'}]);
export const RECIPES=Object.freeze([{id:'young',name:'若く力強い',age:6,stop:99,type:'refill'},{id:'aroma',name:'原酒のかおり',age:24,stop:66,type:'refill'},{id:'wood',name:'木のかおり',age:30,stop:30,type:'bourbon'},{id:'balanced',name:'原酒と木',age:24,stop:50,type:'bourbon'}]);
export const INITIAL_PARTNERS=Object.freeze(['town','station','super']);
// Experimental price/taste gates, not real-world trade terms. The three main
// counterparts retain their main minimum-age/roughness restrictions.
export const NODES=Object.freeze([
 {id:'town',name:'町の酒店',min:1,max:20,price:[16,45],minAge:0,hint:'価格16〜45。若い原酒も扱う。',mainId:'town-liquor'},
 {id:'station',name:'駅前の店',min:1,max:20,price:[16,32],minAge:0,roughnessMax:.65,hint:'価格16〜32。シゲキは控えめ。'},
 {id:'specialist',name:'専門店',min:1,max:20,price:[20,60],minAge:0,characterMin:.65,hint:'価格20〜60。原酒のかおりを重視。'},
 {id:'super',name:'町のスーパー',min:10,max:30,price:[16,35],minAge:12,hint:'価格16〜35。12か月から、10本以上。穏やかな原酒向き。',mainId:'supermarket'},
 {id:'bar',name:'バー',min:1,max:10,price:[16,60],minAge:0,boldOrWood:true,hint:'価格16〜60。シゲキか木のかおり。'},
 {id:'department',name:'デパート',min:5,max:5,price:[20,80],minAge:24,roughnessMax:.30,hint:'価格20〜80。24か月から、穏やかな木のかおりを5本。',mainId:'department'}
]);
// Weights sum to one at each origin. A monthly hop retains .75 of that fuel,
// with deterministic seed variation .90..1.10. Evidence never revisits a node.
export const EDGES=Object.freeze([{from:'town',to:'station',weight:.55},{from:'town',to:'specialist',weight:.45},{from:'station',to:'super',weight:.55},{from:'station',to:'bar',weight:.45},{from:'specialist',to:'bar',weight:.45},{from:'specialist',to:'department',weight:.55},{from:'super',to:'station',weight:.55},{from:'super',to:'town',weight:.45},{from:'bar',to:'specialist',weight:.6},{from:'bar',to:'department',weight:.4},{from:'department',to:'town',weight:.45},{from:'department',to:'specialist',weight:.55}]);
const clone=structuredClone,round=n=>Math.round(n*100)/100;
const check=(ok,msg)=>{if(!ok)throw Error(msg);};
const validSeed=n=>Number.isInteger(n)&&n>0&&n<=4294967295;
const byId=id=>NODES.find(n=>n.id===id),recipeBy=id=>RECIPES.find(r=>r.id===id);
const profile=c=>({roughness:c.roughness,character:c.character,wood:c.wood});
const distance=(a,b)=>(Math.abs(a.roughness-b.roughness)+Math.abs(a.character-b.character)+Math.abs(a.wood-b.wood)/1.35)/3;
// Gentle destination affinity: same three axes only, mapped to .85..1.15.
// Town is neutral; station favors low stimulation; specialist spirit aroma;
// supermarket a gentle/light profile; bar strength or wood; department soft wood.
// This changes how easily evidence travels, never the separate delivery gates.
// Maximum outgoing retention .75*1.10*1.15=.94875 remains below original fuel.
export function propagationFit(nodeId,p){
 const r=p.roughness,c=p.character,w=p.wood/1.35;
 const affinity=nodeId==='town'?0:nodeId==='station'?1-2*r:nodeId==='specialist'?2*c-1:nodeId==='super'?1-r-w:nodeId==='bar'?2*Math.max(r,w)-1:w-r;
 return 1+.15*Math.max(-1,Math.min(1,affinity));
}
function unit(seed,key){let x=seed>>>0;for(const c of key)x=Math.imul(x^c.charCodeAt(0),16777619)>>>0;x^=x>>>16;return (x>>>0)/4294967296;}
function raw(seed,recipe){let g=D.startDistillation(D.newPartialDistillery(seed));while(g.still.distillation.progress<recipe.stop)g=D.distillStep(g);return D.fillBarrel(D.stopDistillation(g),recipe.type).core;}
const seasonlessAge=core=>{const c=core.casks[0];core.month++;if(!c)return;const after=M.ageCask(c);if(after.litres>=.7)core.casks[0]=after;else{core.casks=[];core.archive.unshift({...after,endedMonth:core.month,endReason:'蒸発により瓶1本未満になった',text:M.tasting(after)});core.archive=core.archive.slice(0,24);}};
const priceOf=c=>Math.max(16,Math.min(160,round(E.marketValue(c))));
function event(s,kind,details){const e={id:s.events.length+1,month:s.month,kind,...details};s.events.push(e);s.lastEvent=e;return e;}
function tasteReason(node,r){if(r.price<node.price[0]||r.price>node.price[1])return 'この店の価格帯に届いていません。';if(r.age<node.minAge)return `${node.minAge}か月から扱います。`;if(node.roughnessMax!==undefined&&r.profile.roughness>node.roughnessMax)return 'シゲキがこの店の好みより強めです。';if(node.characterMin!==undefined&&r.profile.character<node.characterMin)return '原酒のかおりがこの店の好みより控えめです。';if(node.boldOrWood&&r.profile.roughness<.3&&r.profile.wood<.25)return 'シゲキか木のかおりを待っています。';return '';}
const available=s=>s.releases.filter(r=>r.stock>0);
const evidenceStrength=n=>Object.values(n.evidence).reduce((sum,e)=>sum+e.weight,0);
function memoryInfo(s,n){
 const months=Object.values(n.observations),count=months.reduce((sum,x)=>sum+x.count,0);if(!count)return {text:'まだ届いていない',months:0,count:0,recentMonths:0,recentCount:0,profile:null,continuing:false};
 const recent=months.filter(o=>s.month-o.month<=6),basis=recent.length?recent:months,recentCount=recent.reduce((sum,o)=>sum+o.count,0),basisCount=basis.reduce((sum,o)=>sum+o.count,0),p={roughness:0,character:0,wood:0};for(const o of basis)for(const k of Object.keys(p))p[k]+=o.profile[k]*o.count/basisCount;
 const candidate=available(s).at(-1)??s.releases.at(-1),compatible=!!candidate&&!tasteReason(byId(n.id),candidate)&&distance(candidate.profile,p)<=.25,continuing=s.mode==='familiarity'&&recent.length>=2&&recentCount>=6&&compatible;
 return {text:s.mode!=='familiarity'?'納品の記録あり':!recent.length?'以前の味を覚えている':continuing?'次もこの味を扱いたい':months.length>=2?'味の変化を覚えている':'最初の味を覚えている',months:months.length,count,recentMonths:recent.length,recentCount,profile:p,profileBasis:recent.length?'recent':'historical',continuing};
}
function newOffer(s,n,kind){const offer={id:`offer-${s.nextOffer++}`,nodeId:n.id,month:s.month,kind,status:'pending',...(kind==='repeat'?{targetProfile:clone(memoryInfo(s,n).profile),tolerance:.25}:{}),min:byId(n.id).min,max:byId(n.id).max,reason:kind==='repeat'?'馴染みの味をもう一度':'店から紹介が届いた'};n.offer=offer;n.lastOfferMonth=s.month;event(s,'offer',{nodeId:n.id,offerId:offer.id,offerKind:kind,reason:offer.reason});}
function refreshOffers(s){
 for(const n of Object.values(s.nodes)){
  if(n.offer||n.repeatOrder||s.month<n.declinedUntil)continue;const product=Object.values(n.evidence).find(e=>!tasteReason(byId(n.id),e));if(!product)continue;
  // An invitation reserves no stock: it may wait for a later portion. Its taste
  // and price evidence must come from a bottle actually delivered, not an unseen release.
  if(!n.accepted){if(s.mode==='baseline')continue;if(evidenceStrength(n)>=2)newOffer(s,n,'introduction');}
  // Familiarity offers use two distinct delivery months / six bottles within
  // a six-month recent window, profile distance <=.25, two-month rest and
  // six-month offer cooldown. No score, free stock or quality bonus is granted.
  else if(s.mode==='familiarity'&&n.received>0&&memoryInfo(s,n).continuing&&s.month-n.lastDeliveryMonth>=2&&s.month-n.lastOfferMonth>=6)newOffer(s,n,'repeat');
 }
}
export function createSession({seed=DEFAULT_SEED,mode='spread',recipe='aroma',origin='normal',initialAge=null,initialCount=20}={}){
 if(initialAge===null)initialAge=recipeBy(recipe)?.age;
 check(validSeed(seed)&&MODES.some(m=>m.id===mode)&&recipeBy(recipe)&&(origin==='normal'||byId(origin))&&Number.isInteger(initialAge)&&initialAge>=0&&initialAge<=120,'実験条件を確認してください。');
 const core=raw(seed,recipeBy(recipe));for(let i=0;i<initialAge;i++)seasonlessAge(core);const partners=origin==='normal'?INITIAL_PARTNERS:[origin],nodes=Object.fromEntries(NODES.map(n=>[n.id,{id:n.id,knownAt:partners.includes(n.id)?0:null,introduced:partners.includes(n.id),accepted:partners.includes(n.id),received:0,lastDeliveryMonth:null,lastOfferMonth:-6,declinedUntil:0,offer:null,repeatOrder:null,evidence:{},observations:{}}]));
 const s={version:'ambertime-reputation/0.1',seed,mode,recipe,origin,initialAge,initialCount,month:0,core,releases:[],nodes,events:[],lastEvent:null,deliveries:[],packets:[],forwarded:[],nextOffer:1,caskSerial:1,nextCaskSerial:2,parents:{[core.casks[0].id]:1},reflections:[]};
 return bottleCurrent(s,initialCount);
}
export function bottleCurrent(s,count){
 const c=s.core.casks[0];check(c,'熟成中のたるがありません。');const next=clone(s),chosen=count??M.bottleQuote(next.core,c.id).count,beforeCash=next.core.cash,beforeCosts=next.core.totals.costs;check(Number.isInteger(chosen)&&chosen>=1&&chosen<=M.bottleQuote(next.core,c.id).count,'ビン詰め本数を確認してください。');
 // Only geometry/inventory are under test: project the required fee, then
 // restore the prepared cash/cost ledger. This is not a native replay state.
 const activeBefore=next.core.products.filter(p=>p.stock>0);next.core=M.bottle({...next.core,cash:Math.max(beforeCash,chosen*3)},c.id,chosen);
 // The native collector keeps only its last32 products. This transient lab
 // also has a durable release ledger: retain live inventory before empty receipts.
 const missing=activeBefore.filter(p=>!next.core.products.some(q=>q.id===p.id));if(missing.length){const all=[...missing,...next.core.products],live=all.filter(p=>p.stock>0),empty=all.filter(p=>p.stock===0);next.core.products=[...live,...empty.slice(-(32-live.length))].sort((a,b)=>a.id-b.id);}
 next.core.cash=beforeCash;next.core.totals.costs=beforeCosts;const p=next.core.products.at(-1),r={id:p.id,parentId:c.id,parentSerial:s.parents[c.id],label:`No.${s.parents[c.id]}・${c.age}か月`,age:c.age,bottledMonth:s.month,profile:profile(c),type:c.type,price:priceOf(c),stock:p.stock,originalCount:p.originalStock};next.releases.push(r);event(next,'bottle',{releaseId:r.id,parentId:c.id,parentSerial:r.parentSerial,age:c.age,count:p.stock,remainingLitres:next.core.casks[0]?.litres??next.core.archive.find(x=>x.id===c.id)?.litres??0});return next;
}
export function replaceRecipe(s,recipeId){check(!s.core.casks.length&&recipeBy(recipeId),'たるを空にしてから製法を選びます。');const next=clone(s),generated=raw((s.seed+Math.imul(s.nextCaskSerial,104729))>>>0||1,recipeBy(recipeId)),c=generated.casks[0],batchId=next.core.nextId++,id=next.core.nextId++;next.core.casks=[{...c,id,batchId,batchMonth:next.core.month,filledMonth:next.core.month,history:[{month:next.core.month,text:M.tasting(c)}]}];next.parents[id]=next.nextCaskSerial++;next.caskSerial=next.parents[id];next.recipe=recipeId;event(next,'replace',{parentId:id,parentSerial:next.caskSerial,recipe:recipeId});return next;}
export function quote(s,nodeId,releaseId,count=null){
 const node=byId(nodeId),n=s.nodes[nodeId],r=s.releases.find(r=>r.id===releaseId),used=s.deliveries.filter(d=>d.nodeId===nodeId&&d.month===s.month).reduce((sum,d)=>sum+d.count,0),remaining=Math.max(0,(node?.max??0)-used),max=Math.min(r?.stock??0,remaining),min=node?.min??1;
 let reason='';if(!node||!n||!n.accepted)reason='まだ取扱いの相談前です。';else if(!r||r.stock<min)reason='届けるビンが足りません。';else if(remaining<min)reason='今月の納品上限に達しました。';else reason=tasteReason(node,r);
 const amount=count??min;if(!reason&&(!Number.isInteger(amount)||amount<min||amount>max))reason='届けられる本数を確認してください。';
 return {ok:!reason,reason,quantities:reason?[]:[...new Set([min,5,10,20,max])].filter(x=>x>=min&&x<=max).sort((a,b)=>a-b),min,max,remaining,stock:r?.stock??0,unitPrice:r?round(r.price*(nodeId==='town'?.8:nodeId==='department'?1.4:1)):0};
}
export function deliver(s,nodeId,releaseId,count,{reflection=''}={}){
 const q=quote(s,nodeId,releaseId,count);check(q.ok,q.reason);const next=clone(s),n=next.nodes[nodeId],r=next.releases.find(r=>r.id===releaseId);r.stock-=count;const p=next.core.products.find(p=>p.id===releaseId);p.stock-=count;p.sold+=count;p.revenue=round(p.revenue+count*q.unitPrice);
 const d={id:next.deliveries.length+1,month:s.month,nodeId,releaseId,count,unitPrice:q.unitPrice,profile:clone(r.profile),rootId:`${nodeId}:${s.month}:brand-1:release-${releaseId}`};next.deliveries.push(d);n.received+=count;n.lastDeliveryMonth=s.month;n.knownAt??=s.month;
 const old=n.observations[s.month],total=(old?.count??0)+count,weighted={};for(const k of ['roughness','character','wood'])weighted[k]=!old||old.profile[k]===r.profile[k]?r.profile[k]:(old.profile[k]*old.count+r.profile[k]*count)/total;n.observations[s.month]={month:s.month,count:total,profile:weighted};
 if(n.repeatOrder&&distance(r.profile,n.repeatOrder.targetProfile)<=n.repeatOrder.tolerance){event(next,'fulfilled-repeat',{nodeId,offerId:n.repeatOrder.id,deliveryId:d.id});n.repeatOrder=null;}
 if(s.mode!=='baseline'){
  let packet=next.packets.find(p=>p.rootId===d.rootId&&p.at===nodeId&&p.route.length===1);if(!packet){packet={rootId:d.rootId,origin:nodeId,at:nodeId,route:[nodeId],weight:0,profile:clone(r.profile),releaseId,age:r.age,price:r.price,deliveryIds:[]};next.packets.push(packet);}const weight=packet.weight+count;for(const k of ['roughness','character','wood'])packet.profile[k]=packet.weight===0||packet.profile[k]===r.profile[k]?r.profile[k]:(packet.profile[k]*packet.weight+r.profile[k]*count)/weight;packet.weight=weight;packet.deliveryIds.push(d.id);
  n.evidence[d.rootId]={rootId:d.rootId,origin:nodeId,route:[nodeId],weight:packet.weight,profile:clone(packet.profile),releaseId,age:r.age,price:r.price,deliveryIds:clone(packet.deliveryIds),month:s.month};
 }
 event(next,'delivery',{nodeId,releaseId,count,deliveryId:d.id,rootId:d.rootId});if(reflection)next.reflections.push({month:s.month,deliveryId:d.id,text:String(reflection).slice(0,2000)});return next;
}
export function acceptOffer(s,offerId){const next=clone(s),n=Object.values(next.nodes).find(n=>n.offer?.id===offerId);check(n,'この申し出は終了しています。');const kind=n.offer.kind;if(kind==='repeat')n.repeatOrder={...clone(n.offer),status:'accepted'};n.accepted=true;n.offer=null;event(next,'accept',{nodeId:n.id,offerId,offerKind:kind});return next;}
export function declineOffer(s,offerId){const next=clone(s),n=Object.values(next.nodes).find(n=>n.offer?.id===offerId);check(n,'この申し出は終了しています。');n.offer=null;n.declinedUntil=s.month+6;event(next,'decline',{nodeId:n.id,offerId});return next;}
export function advance(s,months=1){
 check(Number.isInteger(months)&&months>=1&&months<=120,'進める月数は1〜120です。');check(!s.core.casks[0]||s.core.casks[0].age+months<=120,'たるの比較は120か月までです。');const next=clone(s);
 for(let i=0;i<months;i++){
  next.month++;seasonlessAge(next.core);for(const n of Object.values(next.nodes))for(const e of Object.values(n.evidence))e.weight*=.9;
  // A converging root/node forwards once, using its strongest same-month path.
  // Equal weights use lexicographic routes, independent of delivery call order.
  const grouped=new Map();for(const p of next.packets){const key=p.rootId+'|'+p.at,old=grouped.get(key);if(!old||p.weight>old.weight||p.weight===old.weight&&p.route.join('>')<old.route.join('>'))grouped.set(key,p);}const before=[...grouped].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([,p])=>p);next.packets=[];
  for(const packet of before){const key=packet.rootId+'|'+packet.at;if(next.forwarded.includes(key))continue;next.forwarded.push(key);
   if(packet.route.length>=6)continue;
   for(const edge of EDGES.filter(e=>e.from===packet.at&&!packet.route.includes(e.to))){const weight=packet.weight*.75*edge.weight*(.9+.2*unit(next.seed,`${packet.rootId}|${edge.from}|${edge.to}`))*propagationFit(edge.to,packet.profile);if(weight<.25)continue;const n=next.nodes[edge.to],route=[...packet.route,edge.to],arrived={...clone(packet),at:edge.to,route,weight,month:next.month};
    const old=n.evidence[packet.rootId];if(!old||weight>old.weight){n.evidence[packet.rootId]=clone(arrived);event(next,'spread',{nodeId:edge.to,from:edge.from,rootId:packet.rootId,route,weight,deliveryIds:clone(packet.deliveryIds)});}if(n.knownAt===null&&evidenceStrength(n)>=1)n.knownAt=next.month;next.packets.push(arrived);
   }
  }
  refreshOffers(next);event(next,'month',{pendingPackets:next.packets.length});
 }
 return next;
}
export function baselineEvidence(sOrScenario='zero',scenario='zero'){
 const s=typeof sOrScenario==='object'?sOrScenario:createSession({mode:'baseline'});if(typeof sOrScenario==='string')scenario=sOrScenario;check(['zero','established'].includes(scenario),'比較条件を確認してください。');
 const releases=s.releases.map(r=>({id:r.id,brandId:1,productId:r.id,bottles:r.originalCount,sold:0,revenue:0,delivered:r.originalCount-r.stock,status:r.stock?'selling':'sold-out',listed:false,age:r.age,profile:r.profile}));
 if(scenario==='established')for(let i=0;i<2;i++)releases.unshift({id:-1-i,brandId:1,productId:-1-i,bottles:20,sold:20,revenue:400,status:'sold-out',listed:true,age:24,profile:s.releases[0].profile});
 const shaped={version:19,rules:'partial-bottling',core:{month:36+s.month,products:s.releases.map(r=>({id:r.id,stock:r.stock,price:r.price,age:r.age,...r.profile}))},brands:[{id:1,createdMonth:0}],releases,productsById:Object.fromEntries(s.releases.map(r=>[r.id,{listed:false}])),shop:{relations:[],deliveries:[]},department:{seenSources:[],interests:[],adoptions:[]}};
 const rep=brandReputation(shaped,1);return {scenario,prepared:scenario==='established',retailSold:releases.reduce((n,r)=>n+r.sold,0),bonus:rep.bonus,label:rep.label,retailFactors:[...retailReputationFactors(shaped)],shops:NODES.map(n=>n.mainId?{id:n.id,mainId:n.mainId,applicable:true,evidence:shopEvidence(shaped,1,n.mainId),productCondition:s.releases[0]?shopProductCondition(shaped,s.releases[0].id,n.mainId):'ビンなし',departmentEligible:s.releases.some(departmentReleaseEligible)}:{id:n.id,applicable:false,reason:'本編に対応する店舗なし'}),note:'現行の純粋関数による条件参照。実際の申し出・契約・保存を再現した状態ではありません。'};
}
export function view(s){
 const c=s.core.casks[0];return {month:s.month,mode:s.mode,recipe:s.recipe,origin:s.origin,cask:c?{...clone(c),serial:s.parents[c.id],bottles:M.bottleQuote(s.core,c.id).count}:null,releases:clone(s.releases),nodes:NODES.map(def=>{const n=s.nodes[def.id],strength=evidenceStrength(n),memory=memoryInfo(s,n),known=n.knownAt!==null||n.introduced||n.accepted||n.received>0||!!n.offer||strength>=1;const reasons=available(s).map(r=>tasteReason(def,r));return {...clone(def),fictional:true,known,status:n.received?'handling':n.offer?'offered':n.accepted?'accepted':known?'known':'unknown',accepted:n.accepted,handling:n.received>0,offerId:n.offer?.id??null,offer:clone(n.offer),repeatOrder:clone(n.repeatOrder),memory,received:n.received,monthlyRemaining:Math.max(0,def.max-s.deliveries.filter(d=>d.nodeId===n.id&&d.month===s.month).reduce((sum,d)=>sum+d.count,0)),reason:n.accepted?(reasons.find(r=>!r)??reasons[0]??'ビンなし'):n.offer?'取扱いの申し出があります。':!known?'まだ紹介が届いていません。':reasons.every(Boolean)?reasons[0]:'紹介の量か次の月を待っています。',evidence:clone(Object.values(n.evidence))};}),events:clone(s.events),lastEvent:clone(s.lastEvent),baseline:baselineEvidence(s)};
}
