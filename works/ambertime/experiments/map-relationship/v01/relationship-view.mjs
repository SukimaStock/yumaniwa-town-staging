// M1 R0: read-only relationship evidence for a selected shop.
// A rumor/arrival is never treated as a sale, a contract or a named person's identity.
const SHOP_TO_NODE=Object.freeze({
 'town-liquor':'town',supermarket:'super',bar:'bar',department:'department'
});
const NODE_TO_SHOP=Object.freeze(Object.fromEntries(Object.entries(SHOP_TO_NODE).map(([shop,node])=>[node,shop])));
export const relationshipNodeForShop=id=>SHOP_TO_NODE[id]??null;

function activeShopIds(game){
 const ids=new Set();
 for(const rel of game?.shop?.relations??[]){
  const id=rel.shopId??'town-liquor';
  if(rel.status!=='declined'&&Object.hasOwn(SHOP_TO_NODE,id))ids.add(id);
 }
 return ids;
}
function eventChain(events,byId,event){
 const result=[],seen=new Set();let current=event;
 while(current){
  if(!current.id||seen.has(current.id)||byId.get(current.id)!==current)return null;
  seen.add(current.id);result.push(current);
  if(result.length>events.length)return null;
  if(!current.sourceId)break;
  const parent=byId.get(current.sourceId);
  if(!parent||!Number.isInteger(parent.month)||parent.month>current.month||
    current.releaseId!=null&&parent.releaseId!=null&&current.releaseId!==parent.releaseId)return null;
  // Verify every hop, not only the final arrival. The parent must actually
  // lead to the child's stated origin or destination.
  if((current.type==='rumor'||current.type==='share')&&parent.to!==current.from)return null;
  if(current.type==='arrival'&&parent.type==='arrival'&&parent.to!==current.from)return null;
  if(current.type==='arrival'&&parent.type==='shipment'&&
     (current.channel!=='direct'||parent.to!==current.to))return null;
  current=parent;
 }
 if(result.at(-1)?.type!=='release'||!result.some(e=>e.type==='shipment'))return null;
 return result;
}
function immediateLink(arrival,source){
 if(source?.type==='rumor'||source?.type==='share')return source.from===arrival.from&&source.to===arrival.to;
 if(source?.type==='arrival')return source.to===arrival.from;
 return false;
}

// No inferred links: an arrival must trace through its real source event and a
// factual shipment, with the same release and nondecreasing months.
export function shopRelationshipEvidence(game,shopId,{visibleShopIds=null,mapShopIds=[]}={}){
 const to=SHOP_TO_NODE[shopId],town=game?.labConnection?.version===1?game.labConnection.town:null;
 if(!to||!Array.isArray(town?.events))return null;
 const visible=visibleShopIds==null?activeShopIds(game):new Set(visibleShopIds);
 if(!visible.has(shopId))return null;
 const drawable=new Set(mapShopIds),byId=new Map();
 for(const event of town.events){if(typeof event?.id!=='string'||byId.has(event.id))return null;byId.set(event.id,event);}
 let chosen=null;
 for(let index=0;index<town.events.length;index++){
  const e=town.events[index],source=NODE_TO_SHOP[e?.from];
  if(e?.type!=='arrival'||e.channel==='direct'||!e.channel||e.to!==to||!source||
     source===shopId||!Number.isInteger(e.month)||e.month<0||!e.sourceId)continue;
  const chain=eventChain(town.events,byId,e);
  if(!chain||!immediateLink(e,chain[1]))continue;
  // The source must represent a currently observable contracted shop. This
  // does not imply that the arrival caused its contract.
  if(!visible.has(source))continue;
  const next={
   selectedShopId:shopId,fromShopId:source,fromNodeId:e.from,toNodeId:e.to,
   eventId:e.id,sourceEventId:e.sourceId,month:e.month,
   townReleaseId:e.releaseId??null,mainReleaseId:e.mainReleaseId??null,
   proofEventIds:chain.map(row=>row.id),
   canDrawLink:drawable.has(shopId)&&drawable.has(source)
  };
  if(!chosen||e.month>chosen.month||e.month===chosen.month&&index>chosen.index)chosen={...next,index};
 }
 if(!chosen)return null;
 const {index,...evidence}=chosen;
 return evidence;
}

// Cache the event scan only for the identical immutable game object and view.
// This cache is not serialized and never changes the game or its RNG.
export function createShopRelationshipProjection(){
 let lastGame=null,lastShop=null,lastVisible='',lastMap='',lastResult=null;
 return {
  read(game,shopId,options={}){
   const visible=options.visibleShopIds==null?null:[...options.visibleShopIds].sort();
   const map=[...(options.mapShopIds??[])].sort();
   const visibleKey=visible===null?'auto':JSON.stringify(visible),mapKey=JSON.stringify(map);
   if(lastGame!==game||lastShop!==shopId||lastVisible!==visibleKey||lastMap!==mapKey){
    lastGame=game;lastShop=shopId;lastVisible=visibleKey;lastMap=mapKey;
    lastResult=shopRelationshipEvidence(game,shopId,{visibleShopIds:visible,mapShopIds:map});
   }
   return lastResult;
  },
  reset(){lastGame=null;lastShop=null;lastVisible='';lastMap='';lastResult=null;}
 };
}
