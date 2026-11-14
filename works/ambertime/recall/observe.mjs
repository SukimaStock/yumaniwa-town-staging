// Observe each committed formal operation without replay or game mutation.
import {SHOPS} from '../shop-model.mjs?v=bar-v01-1';
import {NODES} from '../town-connection.mjs?perf=v06';
import {displayHash,commentLines,commentWording,productTitle} from '../player-news.mjs?perf=v06';
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const helpers={displayHash,commentLines,commentWording,productTitle};
const shops=new Map(SHOPS.map(({id,name})=>[id,{id,name}]));
const places=new Map(NODES.map(({id,name,level})=>[id,{id,name,level}]));
const manual=new Set(['stop','fill','bottle','bottle-branded','bottle-counted-branded','stockist-accept','accept-shop','store-assign','stockist-deliver','stockist-accept-delivery','deliver-shop','accept-shop-delivery','department-queue','department-accept-queue','staff-hire','bottling-staff-hire','generation-handover']);
export function createObserverState(game=null){const cursor={version:1,index:-2,lastKey:null,counts:{town:0,shipments:0,deliveries:0,releases:0,relations:0,completed:0},positionBlocks:[],origins:{batches:{},casks:{}},comment:{lastMonth:null,lastLine:null,lastDisplayedLine:null}};
 if(game!==null){
  assert(game.origin===null&&game.core?.month===0&&game.generations?.active?.id===1,'Collector requires a pristine game');
  assert(Array.isArray(game.operations)&&game.operations.every(o=>o.key.startsWith('enable-')||o.key==='adopt-placement'),'Cannot initialize from past operations');
  const sources={town:game.labConnection?.town?.events,shipments:game.labConnection?.town?.shipments,deliveries:game.shop?.deliveries,releases:game.releases,relations:game.shop?.relations,completed:game.generations?.completed};
  assert(Object.values(sources).every(list=>!list?.length)&&!game.core.casks?.length&&!game.still?.batch,'Cannot initialize from existing facts');
  cursor.index=game.operations.length-1;cursor.lastKey=JSON.stringify(game.operations.at(-1)??null);
 }
 return cursor;
}
export function townPosition(id,blocks){
 const n=Number(String(id).slice(1));assert(/^e[1-9]\d*$/.test(id),'Invalid town ID');
 let lo=0,hi=blocks.length-1;
 while(lo<=hi){const mid=(lo+hi)>>1,b=blocks[mid];if(n<b.first)hi=mid-1;else if(n>b.last)lo=mid+1;else return {operationIndex:b.operationIndex,nativeOrdinal:n-b.first,generationId:b.generationId};}
 throw Error('Missing town operation position '+id);
}
export function resolveChain(after,id,blocks){
 const rows=after.labConnection?.town?.events??[],seen=new Set(),chain=[];let child=null;
 while(id!=null){assert(!seen.has(id),'Cyclic source chain');seen.add(id);const row=rows[Number(id.slice(1))-1];assert(row?.id===id,'Missing source '+id);const position=townPosition(id,blocks);
  if(child){assert(row.releaseId===child.row.releaseId,'Source release mismatch');assert(row.month<=child.row.month,'Future source month');assert(position.operationIndex<child.position.operationIndex||position.operationIndex===child.position.operationIndex&&position.nativeOrdinal<child.position.nativeOrdinal,'Future source operation');}
  chain.unshift({...row,position});child={row,position};id=row.sourceId;
 }
 return chain;
}
export function observeOperation(cursor,observation){
 const {index,operation,before,after}=observation;assert(cursor.version===1&&Number.isInteger(index),'Invalid observer cursor');
 const key=JSON.stringify(operation);if(index===cursor.index){assert(key===cursor.lastKey,'Conflicting operation');return {cursor,facts:[],originUpdates:[],positionBlocks:cursor.positionBlocks,origins:cursor.origins};}
 assert(index===cursor.index+1,'Skipped or reordered operation');assert(after?.core,'Missing operation state');
 const generationId=before?.generations?.active?.id??null,operationKey=operation?.key??null,agency=manual.has(operationKey)?'manual':'unknown';
 const town=after.labConnection?.town,oldTown=before?.labConnection?.town;
 const lists={town:town?.events??[],shipments:town?.shipments??[],deliveries:after.shop?.deliveries??[],releases:after.releases??[],relations:after.shop?.relations??[],completed:after.generations?.completed??[]};
 const oldLists={town:oldTown?.events??[],shipments:oldTown?.shipments??[],deliveries:before?.shop?.deliveries??[],releases:before?.releases??[],relations:before?.shop?.relations??[],completed:before?.generations?.completed??[]};
 for(const [k,list] of Object.entries(lists)){assert(oldLists[k].length===cursor.counts[k],'Observation before count mismatch '+k);assert(list.length>=cursor.counts[k],'Append-only source shrank '+k);}
 const appended=k=>lists[k].slice(cursor.counts[k]);
 if(appended('town').length){const first=cursor.counts.town+1,last=lists.town.length;assert(lists.town[first-1].id==='e'+first&&lists.town[last-1].id==='e'+last,'Town ID order changed');cursor.positionBlocks.push({first,last,operationIndex:index,generationId});}
 const facts=[],originUpdates=[],bottle=id=>{const b=after.brands?.find(b=>b.id===id);return b?{id:b.id,name:b.name,shape:b.bottle,label:b.label}:undefined;};
 const add=(id,kind,month,ids,label,scene,record,extra={},a=agency)=>facts.push({id,kind,month,operationIndex:operation?index:null,operationKey,generationId,agency:a,ids,label,scene,evidence:{record,sourceId:id.slice(id.indexOf(':')+1),...extra}});
 const distillery={kind:'distillery',entity:{id:'distillery',name:'蒸留所'}};
 if(['start','start-usual'].includes(operationKey)&&after.still?.batch)cursor.origins.batches[after.still.batch.id]={batchId:after.still.batch.id,generationId,month:after.core.month,operationIndex:index};
 if(['stop','complete-usual'].includes(operationKey)){const batch=(operationKey==='stop'?after.still:before.still)?.batch;if(batch)add('distillation:'+index,'distillation',after.core.month,{batchId:batch.id},'原酒を採り終えた。',distillery,'operations',{},operationKey==='stop'?'manual':'delegated');}
 if(['staff-hire','bottling-staff-hire'].includes(operationKey))add('hire:'+index,'hire',after.core.month,{},'担当者を雇った。',distillery,'operations');
 const oldCasks=new Set((before?.core.casks??[]).map(c=>c.id));
 for(const c of after.core.casks??[])if(!oldCasks.has(c.id)){const rawBatch=after.batchesById?.[c.id]??(before?.still?.batch?.id===c.batchId?before.still.batch:null);
 const batch=cursor.origins.batches[c.batchId]??{batchId:c.batchId,generationId:null,month:rawBatch?.startedMonth??null,operationIndex:null,unknownReason:'start operation not observed'};
 cursor.origins.casks[c.id]={caskId:c.id,batchId:c.batchId,generationId,month:c.filledMonth,batch};originUpdates.push({kind:'fill',eventId:'fill:'+c.id,...structuredClone(cursor.origins.casks[c.id])});add('fill:'+c.id,'fill',c.filledMonth,{caskId:c.id,batchId:c.batchId},'原酒を樽に詰めた。',{kind:'production',entity:{id:c.id,name:'貯蔵庫'},caskType:c.type},'core.casks',{},operationKey==='complete-usual'?'delegated':agency);}
 const sales=new Map(),reactions=[];
 for(const receipt of appended('shipments')){
  if(!receipt.id.startsWith('retail:')||receipt.count<=0)continue;
  const townReleaseId=receipt.parts.find(p=>p.count>0)?.releaseId,releaseId=town?.releases[townReleaseId-1]?.externalId,r=after.releases.find(r=>r.id===releaseId);if(!r)continue;
  const ids={saleReceiptId:receipt.id,releaseId,brandId:r.brandId,productId:r.productId,count:receipt.count};
  add('sale:'+receipt.id,'sale',receipt.month,ids,`自家販売で${receipt.count}本が売れた。`,{kind:'production',entity:{id:'retail',name:'自家販売'},bottle:bottle(r.brandId)},'labConnection.town.shipments',{},operation?'automatic':'unknown');sales.set(receipt.id,facts.at(-1));
  const c=cursor.comment;if(c.lastMonth!==null&&receipt.month-c.lastMonth<12)continue;
  const hash=helpers.displayHash(after.seed,'customer:'+receipt.id);if(hash%8)continue;
  const context={},legacy=helpers.commentLines(r,context),lines=legacy.filter(l=>l!==c.lastLine);if(!lines.length)continue;
  const line=helpers.commentWording(after,receipt,legacy,context,c.lastDisplayedLine);c.lastMonth=receipt.month;c.lastLine=lines[Math.floor(hash/8)%lines.length];c.lastDisplayedLine=line;
  reactions.push({receipt,r,label:helpers.productTitle(after,r)+'のお客さん「'+line+'」'});
 }
 for(const d of appended('deliveries')){const shopId=d.shopId??'town-liquor';add('delivery:'+d.id,'delivery',d.month,{shopId,receiptId:d.id,brandId:d.brandId,productId:d.productId,releaseId:d.releaseId,count:d.count},(shops.get(shopId)?.name??shopId)+'に'+d.count+'本納品。',{kind:'shop',entity:shops.get(shopId),bottle:bottle(d.brandId)},'shop.deliveries',{},operationKey==='month'?'automatic':agency);}
 for(const r of appended('releases')){originUpdates.push({kind:'release',eventId:'bottling:'+r.id,releaseId:r.id,productId:r.productId,releaseGeneration:generationId,origin:structuredClone(cursor.origins.casks[r.caskId]??null)});const b=bottle(r.brandId),age=r.age%12===0?r.age/12+'年':r.age+'か月';add('bottling:'+r.id,'bottling',r.bottledMonth,{brandId:r.brandId,releaseId:r.id,productId:r.productId,caskId:r.caskId,age:r.age,count:r.bottles},`${age}熟成の「${b?.name??'ウイスキー'}」を${r.bottles}本、瓶詰めした。`,{kind:'production',entity:{id:'bottling',name:'瓶詰め'},bottle:b},'releases',{flavorName:r.flavorName},operationKey==='bottling-delegate'||after.automation?.lastBottlings?.some(x=>x.productId===r.productId&&x.month===after.core.month)?'delegated':agency);}
 for(const r of appended('relations')){const shopId=r.shopId??'town-liquor';if(shopId==='department')continue;const b=bottle(r.brandId),name=shops.get(shopId)?.name??shopId;add(`shop-start:${shopId}:${r.brandId}`,'shop-start',r.startedMonth,{shopId,brandId:r.brandId},b?`「${b.name}」を造る蒸留所は${name}と取引を始めた。`:name+'と取引を始めた。',{kind:'shop',entity:shops.get(shopId)},'shop.relations');}
 for(const r of appended('completed'))add('handover:'+r.id,'handover',r.endedMonth,{fromGeneration:r.id,toGeneration:after.generations.active.id},`第${after.generations.active.id}世代へ蒸留所が引き継がれた。`,distillery,'generations.completed',{inheritedCaskIds:(after.core.casks??[]).filter(c=>oldCasks.has(c.id)).map(c=>c.id),inheritedShopIds:[...new Set((after.shop?.relations??[]).filter(r=>r.shopId!=='department'||after.shop.deliveries.some(d=>d.shopId==='department')).map(r=>r.shopId??'town-liquor'))]});
 for(const r of appended('town')){const regionId=r.type==='visit'?r.from:r.to,place=places.get(regionId);if(!place||!['arrival','inquiry','visit'].includes(r.type)||r.type==='arrival'&&r.channel==='direct')continue;
  const label=r.type==='visit'?place.name+'で銘柄を知った人が蒸留所を訪れた。':place.name+(r.type==='arrival'?'に口コミが届いた。':'から問い合わせが届いた。');
  add(r.type+':'+r.id,r.type,r.month,{townEventId:r.id,sourceId:r.sourceId,regionId,level:place.level,townReleaseId:r.releaseId,releaseId:r.mainReleaseId??null,channel:r.channel??null},label,{kind:'reputation',entity:place},'labConnection.town.events',{sourceChain:resolveChain(after,r.id,cursor.positionBlocks).map(x=>x.id),townOrdinal:Number(r.id.slice(1))-1},operation?'automatic':'unknown');
 }
 for(const {receipt,r,label} of reactions){const sale=sales.get(receipt.id);add('reaction:customer:'+receipt.id,'reaction',receipt.month,sale.ids,label,{kind:'production',entity:{id:'retail',name:'自家販売のお客さん'},bottle:bottle(r.brandId)},'player-news.customerComments',{saleReceiptId:receipt.id},sale.agency);}
 facts.sort((a,b)=>a.month-b.month);facts.forEach((e,i)=>{e.ordinal=i;e.replayOrdinal=i;});
 const block=cursor.positionBlocks.at(-1);if(block?.operationIndex===index){block.townBases={};for(const e of facts)if(e.evidence.record==='labConnection.town.events'&&block.townBases[e.month]===undefined)block.townBases[e.month]=e.ordinal;block.operationKey=operationKey;}

 cursor.index=index;cursor.lastKey=key;for(const k of Object.keys(lists))cursor.counts[k]=lists[k].length;
 // Keep live barrel origins only; emitted fill/release facts are retained by the caller.
 const live=new Set((after.core.casks??[]).map(c=>String(c.id)));for(const id of Object.keys(cursor.origins.casks))if(!live.has(id))delete cursor.origins.casks[id];
 const batches=new Set([after.still?.batch?.id,...Object.values(cursor.origins.casks).map(c=>c.batchId)].map(String));for(const id of Object.keys(cursor.origins.batches))if(!batches.has(id))delete cursor.origins.batches[id];
 return {cursor,facts,originUpdates,positionBlocks:cursor.positionBlocks,origins:cursor.origins};
}

export function materializeTownFact(after,townId,cursor){
 const row=after.labConnection?.town?.events[Number(townId.slice(1))-1];assert(row?.id===townId,'Missing town source');
 const pos=townPosition(townId,cursor.positionBlocks),block=cursor.positionBlocks.find(b=>b.operationIndex===pos.operationIndex);
 const eligible=r=>places.has(r.type==='visit'?r.from:r.to)&&['arrival','inquiry','visit'].includes(r.type)&&!(r.type==='arrival'&&r.channel==='direct');
 assert(eligible(row),'Source is not a display fact');let ordinal=block.townBases[row.month];assert(Number.isInteger(ordinal),'Missing town fact base');
 for(let n=block.first;n<Number(townId.slice(1));n++){const r=after.labConnection.town.events[n-1];if(r.month===row.month&&eligible(r))ordinal++;}
 const regionId=row.type==='visit'?row.from:row.to,place=places.get(regionId);
 const label=row.type==='visit'?place.name+'で銘柄を知った人が蒸留所を訪れた。':place.name+(row.type==='arrival'?'に口コミが届いた。':'から問い合わせが届いた。');
 return {id:row.type+':'+row.id,kind:row.type,month:row.month,operationIndex:pos.operationIndex,operationKey:block.operationKey,generationId:pos.generationId,agency:pos.operationIndex<0?'unknown':'automatic',ids:{townEventId:row.id,sourceId:row.sourceId,regionId,level:place.level,townReleaseId:row.releaseId,releaseId:row.mainReleaseId??null,channel:row.channel??null},label,scene:{kind:'reputation',entity:place},evidence:{record:'labConnection.town.events',sourceId:row.id,sourceChain:resolveChain(after,row.id,cursor.positionBlocks).map(x=>x.id),townOrdinal:Number(row.id.slice(1))-1},ordinal,replayOrdinal:ordinal};
}
