// Reactions to the main game's factual bottles and receipts. This adapter never
// allocates inventory, starts a batch, changes demand or creates a stockist.
import {createExternal,registerExternalRelease,receiveExternal,advanceExternal,newsEvents,affinity,NODES,AROMA_PLACES,phaseFor} from './experiments/town-simulation/v01/model.mjs';
const copy=x=>structuredClone(x);
const nativePlaces=Object.freeze({'town-liquor':'town',supermarket:'super',department:'department'});
export {NODES,AROMA_PLACES,phaseFor};
export const createTown=(seed,month=0)=>createExternal({seed,month});
function productFor(release){
 const p=release.profile??release,flavor=p.flavor;
 return {roughness:p.roughness,character:p.character,wood:p.wood,age:release.age??0,price:30,label:flavor?.label??release.flavorName??release.label??'ウイスキー',specimenId:'ambertime-release-'+release.id,productId:release.productId??release.id,aromaFamily:flavor?.version===1&&Object.hasOwn(AROMA_PLACES,flavor.primary)?flavor.primary:null,...(flavor?{flavor:copy(flavor)}:{})};
}
export function recordBottle(town,release){
 if(!release||!Number.isSafeInteger(release.id)||!Number.isSafeInteger(release.bottles))throw Error('街へ渡す発売回を確認してください。');
 if(Number.isSafeInteger(release.bottledMonth)&&release.bottledMonth>town.month)advanceTown(town,release.bottledMonth);
 return registerExternalRelease(town,{externalId:release.id,product:productFor(release),count:release.bottles,month:release.bottledMonth??town.month});
}
export function receiveActual(town,{receiptId,month=town.month,releaseId,product,release,to,count}){
 const source=release??product;if(source){const stored=recordBottle(town,source);releaseId=stored.externalId;}
 const r=town.releases.find(r=>r.externalId===releaseId);if(!r)throw Error('街へ渡す瓶詰め情報がありません。');
 const place=nativePlaces[to]??to;
 // A factual receipt may be replayed again by a caller; duplicates stay no-ops,
 // including when the reaction clock has already advanced past its month.
 const prior=town.shipments.find(x=>x.id===receiptId);
 if(prior){if(prior.month!==month||prior.to!==place||prior.count!==count||prior.parts[0].releaseId!==r.id)throw Error('街の実発送記録が変わっています。');return false;}
 advanceTown(town,month);return receiveExternal(town,{receiptId,releaseId:r.id,to:place,count});
}
export const advanceTown=(town,month)=>advanceExternal(town,month);
export const townNews=town=>newsEvents(town);
export function townAffinity(place,releaseOrProduct){
 const node=typeof place==='string'?NODES.find(n=>n.id===(nativePlaces[place]??place)):place;
 if(!node)throw Error('街の場所を確認してください。');
 const product=releaseOrProduct.profile?productFor(releaseOrProduct):releaseOrProduct;
 return affinity(node,product,true);
}
