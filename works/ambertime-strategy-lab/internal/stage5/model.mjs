// Independent copy-on-write experiment. Published snapshots must be treated as immutable.
// Index spreads still cost O(index size); metrics explicitly count those references.
let metrics;
export function resetMetrics(){metrics={copiedPayloadBytes:0,shallowIndexEntriesCopied:0,shallowPropertiesCopied:0,copiedRows:0,recalculations:0};}
resetMetrics();
export function getMetrics(){return {...metrics};}
const copy=x=>{const text=JSON.stringify(x);metrics.copiedPayloadBytes+=new TextEncoder().encode(text).length;metrics.copiedRows++;return JSON.parse(text);};
const row=x=>{metrics.copiedRows++;metrics.shallowPropertiesCopied+=Object.keys(x).length;return {...x};};
const index=x=>{metrics.shallowIndexEntriesCopied+=Object.keys(x).length;return {...x};};
const root=x=>{metrics.shallowPropertiesCopied+=Object.keys(x).length;return {...x};};
const assert=(v,m)=>{if(!v)throw Error(m);};
const validId=x=>(typeof x==='string'&&x.length>0&&!['__proto__','constructor','prototype'].includes(x))||Number.isSafeInteger(x);
const integer=(x,min=0)=>Number.isSafeInteger(x)&&x>=min;
export function canonical(value){
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 assert(value===null||['string','boolean'].includes(typeof value)||typeof value==='number'&&Number.isFinite(value),'Non-JSON characteristic');return JSON.stringify(value);
}
export function createModel(){return {version:'ambertime-internal-comparison/1',month:0,casks:{},wines:{},identities:{},releases:{},stores:{},retail:{bottles:0,revenueCents:0,months:0,firstMonth:null,lastMonth:null,streak:0},references:{},recalls:{},recallReleaseIds:{},completed:{releases:0,bottles:0,revenueCents:0},cursor:{seq:0,signature:null},nextWineId:1};}
const key=(shop,brand)=>canonical([shop,brand]);
const blankMetric=()=>({bottles:0,months:0,firstMonth:null,lastMonth:null,streak:0});
function metric(m,count,month){metrics.recalculations++;m.bottles+=count;if(m.lastMonth!==month){m.months++;m.streak=m.lastMonth===month-1?m.streak+1:1;m.firstMonth??=month;m.lastMonth=month;}}
function touchRelease(store,id,month){let r=store.perRelease[id];if(!r)r=store.perRelease[id]={firstMonth:month,lastMonths:[],bottles:0};if(r.lastMonths.at(-1)!==month)r.lastMonths=[...r.lastMonths,month].slice(-2);return r;}
export function registerRelease(model,release,{cask=null}={}){
 assert(release&&validId(release.id)&&validId(release.productId)&&validId(release.brandId),'Release identity required');
 assert(integer(release.bottles,1)&&integer(release.bottledMonth)&&Number.isFinite(release.age)&&release.age>=0&&Number.isFinite(release.price)&&release.price>0,'Invalid release');
 assert(!model.identities[release.id],'Release already registered');
 assert(release.bottledMonth>=model.month,'Out-of-order release month');
 assert(!Object.values(model.identities).some(r=>r.productId===release.productId),'Product already registered');
 assert(Object.values(model.releases).filter(r=>r.stock>0).length<8,'Eight active products maximum');
 const descriptor={};for(const [k,v] of Object.entries(release))if(!['id','productId','bottles','stock','sold','revenue','status','listed','revenueCents','retailSold','retailRevenueCents','delivered','deliveryRevenue','deliveryRevenueCents','consumerSold','totalDisposed','totalRevenueCents'].includes(k))descriptor[k]=copy(v);
 const signature=canonical(descriptor),m=root(model);m.identities=index(model.identities);m.releases=index(model.releases);let wineId=Object.keys(m.wines).find(id=>{metrics.recalculations++;return canonical(m.wines[id].descriptor)===signature;});
 if(!wineId){m.wines=index(model.wines);wineId='wine:'+m.nextWineId++;m.wines[wineId]={id:wineId,descriptor};}
 m.identities[release.id]={releaseId:release.id,productId:release.productId,brandId:release.brandId,wineId,bottledMonth:release.bottledMonth,bottles:release.bottles};
 m.releases[release.id]={id:release.id,productId:release.productId,brandId:release.brandId,wineId,bottles:release.bottles,price:release.price,stock:release.bottles,sold:0,revenueCents:0,retailSold:0,retailRevenueCents:0,delivered:0,deliveryRevenueCents:0,consumerSold:0,listed:!!release.listed,allocations:{},status:'selling'};m.month=release.bottledMonth;
 if(cask){assert(validId(cask.id)&&cask.id===release.caskId,'Cask identity mismatch');return setCurrentCasks(m,[...Object.values(m.casks).filter(c=>String(c.id)!==String(cask.id)),cask]);}
 return m;
}
export function assignStock(model,releaseId,shopId,count){
 const r=model.releases[releaseId];assert(r&&validId(shopId)&&integer(count),'Invalid reservation');
 const other=Object.entries(r.allocations).reduce((n,[k,v])=>n+(k===String(shopId)?0:v),0);assert(other+count<=r.stock,'Reservation exceeds stock');
 const m=root(model);m.releases=index(model.releases);m.releases[releaseId]=row(r);m.releases[releaseId].allocations=index(r.allocations);if(count)m.releases[releaseId].allocations[shopId]=count;else delete m.releases[releaseId].allocations[shopId];return m;
}
function relationScore(metric,capacity,weight){return metric.bottles/capacity+metric.months*weight;}
export function storeRelation(model,shopId,brandId,{month=model.month,capacity=1,weight=.5,target=12,basis='sale'}={}){
 assert(Number.isFinite(capacity)&&capacity>0&&Number.isFinite(weight)&&weight>=0&&Number.isFinite(target)&&target>0&&['sale','delivery'].includes(basis)&&integer(month)&&month>=model.month,'Invalid relation options');
 const s=model.stores[key(shopId,brandId)],x=s?.[basis]??blankMetric(),score=relationScore(x,capacity,weight);
 const stage=x.bottles===0?0:score>=target&&x.bottles>=capacity*2&&x.months>=3?3:score>=target/2?2:1;
 // Historical achievement never decays; current contact is a separate fact.
 return {basis,score,targetReached:score>=target,stage,bottles:x.bottles,activeMonths:x.months,lastMonth:x.lastMonth,gapMonths:x.lastMonth===null?null:month-x.lastMonth,currentStreak:x.lastMonth!==null&&month-x.lastMonth<=1?x.streak:0,historicalMaxStage:stage,coverage:basis==='sale'&&s?.unknownSaleReceipts?'partial':'complete'};
}
export function applyTransaction(model,event){
 assert(event&&integer(event.seq,1)&&integer(event.month),'Invalid transaction cursor');
 assert(['retail-sale','paid-procurement','store-sell-through'].includes(event.kind),'Unknown transaction kind');
 // Proposed/pending rows never move the cursor or change state.
 if(event.status!=='completed'){assert(['pending','proposed','cancelled'].includes(event.status),'Unknown completion state');return model;}
 const signature=canonical(event);
 if(event.seq===model.cursor.seq){assert(signature===model.cursor.signature,'Changed transaction retry');return model;}
 if(event.seq<model.cursor.seq)return model; // Trusted immutable ordered source. Old payload revalidation is explicitly unavailable.
 assert(event.seq===model.cursor.seq+1,'Transaction sequence gap');assert(event.month>=model.month,'Out-of-order transaction month');
 assert(integer(event.count,1)&&integer(event.revenueCents),'Invalid committed amount');
 const old=model.releases[event.releaseId];assert(old&&old.stock>=event.count,'Insufficient active stock');
 if(event.kind!=='retail-sale')assert(validId(event.shopId),'Store required');
 const allocations=Object.values(old.allocations).reduce((a,b)=>a+b,0),owned=event.kind==='store-sell-through'?(old.allocations[event.shopId]??0):0;
 if(event.kind==='store-sell-through')assert(owned>=event.count,'Sale exceeds assigned shelf');
 else assert(old.stock-allocations>=event.count,'Sale consumes reserved stock');
 const m=root(model);m.releases=index(model.releases);const r=m.releases[event.releaseId]=row(old);r.stock-=event.count;r.sold+=event.count;r.revenueCents+=event.revenueCents;r.status=r.stock?'selling':'sold-out';
 if(event.kind==='store-sell-through'){r.allocations=index(old.allocations);r.allocations[event.shopId]-=event.count;if(!r.allocations[event.shopId])delete r.allocations[event.shopId];}
 if(event.kind==='retail-sale'){m.retail=row(model.retail);r.retailSold+=event.count;r.retailRevenueCents+=event.revenueCents;metric(m.retail,event.count,event.month);m.retail.revenueCents+=event.revenueCents;}
 else{
  r.delivered+=event.count;r.deliveryRevenueCents+=event.revenueCents;if(event.kind==='store-sell-through')r.consumerSold+=event.count;
  const k=key(event.shopId,r.brandId);m.stores=index(model.stores);let s=m.stores[k];if(s){s=m.stores[k]=row(s);s.delivery=row(s.delivery);if(event.kind==='store-sell-through')s.sale=row(s.sale);s.perRelease=index(s.perRelease);if(s.perRelease[event.releaseId])s.perRelease[event.releaseId]=row(s.perRelease[event.releaseId]);}else s=m.stores[k]={shopId:event.shopId,brandId:r.brandId,startedMonth:null,delivery:blankMetric(),sale:blankMetric(),revenueCents:0,unknownSaleReceipts:0,perRelease:{},recent:[]};
  metric(s.delivery,event.count,event.month);if(event.kind==='store-sell-through')metric(s.sale,event.count,event.month);else s.unknownSaleReceipts++;
  s.revenueCents+=event.revenueCents;touchRelease(s,event.releaseId,event.month).bottles+=event.count;
  s.recent=[...s.recent,{seq:event.seq,month:event.month,releaseId:event.releaseId,count:event.count,kind:event.kind}].slice(-8);
 }
 m.month=event.month;m.cursor={seq:event.seq,signature};return m;
}
export function setContract(model,shopId,brandId,startedMonth){
 assert(validId(shopId)&&validId(brandId)&&integer(startedMonth),'Invalid contract');const m=root(model),k=key(shopId,brandId);m.stores=index(model.stores);if(m.stores[k])m.stores[k]=row(m.stores[k]);
 if(!m.stores[k])m.stores[k]={shopId,brandId,startedMonth:null,delivery:blankMetric(),sale:blankMetric(),revenueCents:0,unknownSaleReceipts:0,perRelease:{},recent:[]};
 assert(m.stores[k].startedMonth===null||m.stores[k].startedMonth===startedMonth,'Contract start immutable');m.stores[k].startedMonth=startedMonth;return m;
}
export function setReference(model,releaseId,kind,id,active=true){
 assert(model.identities[releaseId]&&['pending-rumor','pending-inquiry','recall'].includes(kind)&&validId(id),'Invalid reference');const m=root(model),k=canonical([kind,id]);m.references=index(model.references);
 assert(!m.references[k]||m.references[k].releaseId===releaseId,'Reference binding immutable');
 if(active)m.references[k]={releaseId,kind,id};else{assert(kind!=='recall','Frozen recall reference cannot be removed');delete m.references[k];}return m;
}
export function freezeRecall(model,id,snapshot,releaseIds=[]){
 assert(validId(id),'Recall ID required');assert(Array.isArray(releaseIds)&&releaseIds.every(x=>model.identities[x]),'Unknown recall source');const bindings=[...new Set(releaseIds)].sort((a,b)=>String(a).localeCompare(String(b))),text=canonical(snapshot);if(model.recalls[id]){assert(canonical(model.recalls[id])===text&&canonical(model.recallReleaseIds[id])===canonical(bindings),'Completed recall immutable');return model;}
 const m=root(model);m.references=index(model.references);m.recalls=index(model.recalls);m.recallReleaseIds=index(model.recallReleaseIds);
 for(const releaseId of releaseIds){const refId=String(id)+':'+String(releaseId),k=canonical(['recall',refId]);assert(!m.references[k]||m.references[k].releaseId===releaseId,'Reference binding immutable');m.references[k]={releaseId,kind:'recall',id:refId};}
 m.recalls[id]=copy(snapshot);m.recallReleaseIds[id]=bindings;return m;
}
export function compactRelease(model,releaseId){
 const r=model.releases[releaseId];assert(r,'Active release missing');assert(r.stock===0&&Object.values(r.allocations).every(n=>n===0),'Live inventory cannot be compacted');assert(!Object.values(model.references).some(x=>x.releaseId===releaseId),'Release has unresolved or frozen references');
 const m=root(model);m.completed=row(model.completed);m.identities=index(model.identities);m.identities[releaseId]=row(model.identities[releaseId]);m.releases=index(model.releases);m.completed.releases++;m.completed.bottles+=r.sold;m.completed.revenueCents+=r.revenueCents;Object.assign(m.identities[releaseId],{completed:true,listed:r.listed,totalDisposed:r.sold,revenueCents:r.revenueCents,retailSold:r.retailSold,retailRevenueCents:r.retailRevenueCents,delivered:r.delivered,deliveryRevenueCents:r.deliveryRevenueCents,consumerSold:r.consumerSold,lastPrice:r.price});delete m.releases[releaseId];return m;
}
export function storeRecord(model,shopId,brandId){return copy(model.stores[key(shopId,brandId)]??null);}

// Reconstruct the native RELEASE read meaning: sold/revenue are retail-only.
// Internal live r.sold and r.revenueCents are all paid disposal for stock conservation.
// totalDisposed/totalRevenueCents expose that aggregate explicitly at the boundary.
export function readRelease(model,releaseId){
 const identity=model.identities[releaseId];if(!identity)return null;
 const live=model.releases[releaseId],row={...model.wines[identity.wineId].descriptor,...identity,id:identity.releaseId,...(live??{})};
 return copy({...row,totalDisposed:live?.sold??identity.totalDisposed??0,totalRevenueCents:row.revenueCents??0,sold:row.retailSold??0,revenue:(row.retailRevenueCents??0)/100,deliveryRevenue:(row.deliveryRevenueCents??0)/100});
}
// Exact current-state replacement from the native aging/bottling boundary.
// This model never advances flavor, evaporation or manufacturing itself.
export function setCurrentCasks(model,casks){
 assert(Array.isArray(casks)&&casks.length<=4,'At most four current casks');canonical(casks);
 const ids=new Set();for(const c of casks){assert(c&&typeof c==='object'&&!Array.isArray(c)&&validId(c.id)&&!ids.has(String(c.id)),'Unique cask identities required');ids.add(String(c.id));}
 const m=root(model);m.casks=Object.fromEntries(casks.map(c=>[c.id,copy(c)]));return m;
}

// Commands are data, never dynamic method/property access. Read functions are excluded.
const commands=Object.freeze({registerRelease,assignStock,applyTransaction,setContract,setReference,freezeRecall,compactRelease,setCurrentCasks});
export function applyCommand(model,command){
 assert(command&&typeof command.type==='string'&&Object.hasOwn(commands,command.type)&&Array.isArray(command.args),'Unknown model command');
 return commands[command.type](model,...command.args);
}
