// Isolated retention comparison. No save API and no inference of missing flavor.
import {packageArt,packageFamily} from '../../ambertime/release-package.mjs';
import {releasePriceTier} from '../../ambertime/brand-identity.mjs';
const copy=structuredClone;
export const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
export function referencedReleaseIds(source,recalls){
 const found=new Set(),facts=new Map((source.recallFacts??[]).map(f=>[f.id,f])),visited=new Set();
 function visit(value,key=''){
  if(['releaseId','mainReleaseId','sourceReleaseId'].includes(key)&&source.releases.some(r=>r.id===value))found.add(value);
  if(key==='productId'){const r=source.releases.find(r=>r.productId===value);if(r)found.add(r.id);}
  if(typeof value==='string'&&facts.has(value)&&!visited.has(value)){visited.add(value);visit(facts.get(value));}
  if(value&&typeof value==='object')for(const [k,v]of Object.entries(value))visit(v,k);
 }
 visit(recalls);return [...found];
}
export function selectImportantWines(source){
 const reasons={};const add=(id,reason)=>{if(id==null||!source.releases.some(r=>r.id===id))return;(reasons[id]??=[]).push(reason);};
 const chronological=[...source.releases].sort((a,b)=>a.bottledMonth-b.bottledMonth);
 add(chronological[0]?.id,'first-bottling');
 const mature=chronological.find(r=>r.age>=36);add(mature?.id,'first-36-month-aging');
 const shops=new Set();for(const d of [...(source.shop?.deliveries??[])].sort((a,b)=>a.month-b.month)){const key=(d.shopId??'town-liquor')+':'+d.brandId;if(d.count>0&&!shops.has(key)){shops.add(key);add(d.releaseId,'first-store:'+key);}}
 const regions=new Set();for(const e of [...(source.labConnection?.town?.events??[])].sort((a,b)=>a.month-b.month)){if(!['arrival','inquiry','visit'].includes(e.type)||e.type==='arrival'&&e.channel==='direct')continue;const key=e.type+':'+(e.type==='visit'?e.from:e.to);if(!regions.has(key)){regions.add(key);add(e.mainReleaseId,'regional-milestone:'+key);}}
 for(const r of source.releases){const era=[...(source.generations?.completed??[]),...(source.generations?.active?[source.generations.active]:[])].find(g=>g.startedMonth<=r.bottledMonth&&(g.endedMonth==null||r.bottledMonth<g.endedMonth));if(era&&r.sourceGeneration!=null&&r.sourceGeneration<era.id)add(r.id,'inherited-cask');}
 return reasons;
}
export function memoryCatalog(source,{policy='C',importantIds=null,pendingIds=[],recallIds=[],favoriteIds=[]}={}){
 if(!['A','B','C'].includes(policy))throw Error('Unknown memory policy');
 const reasons=selectImportantWines(source);
 const chosen=new Set([...(importantIds??source.releases.filter(r=>reasons[r.id]).map(r=>r.id)),...recallIds,...favoriteIds]);
 const protectedIds=new Set([...pendingIds,...recallIds,...source.releases.filter(r=>(source.core?.products??[]).some(p=>p.id===r.productId&&(p.stock??p.count)>0)).map(r=>r.id)]);
 const catalog=[],visuals={},details={},omitted=[];
 for(const r of source.releases){
  const required=protectedIds.has(r.id),detailed=required||policy!=='A'&&chosen.has(r.id);
  if(policy==='B'&&!detailed){omitted.push(r.id);continue;}
  const brand=source.brands?.find(b=>b.id===r.brandId)??{},tier=releasePriceTier(source,r.productId);
  const svg=packageArt(r.profile,brand,tier),visualKey=Object.keys(visuals).find(k=>visuals[k].svg===svg)??'v'+(Object.keys(visuals).length+1);
  visuals[visualKey]??={svg,renderer:'release-package/main-f7e69701',family:packageFamily(r.profile),tier};
  const row={id:r.id,productId:r.productId,brandId:r.brandId,caskId:r.caskId??null,bottledMonth:r.bottledMonth,age:r.age,name:brand.name??null,sourceGeneration:r.sourceGeneration??null,visualKey,detailed,protected:required};
  catalog.push(row);
  if(detailed)details[r.id]=copy(r);
 }
 // Deliberate O(release) cost: remembering an arbitrary past ID is not constant space.
 return {version:1,synthetic:true,policy,catalog,visuals,details,summary:{totalReleases:source.releases.length,omittedReleases:omitted.length,bottles:source.releases.reduce((n,r)=>n+(r.bottles??0),0)},limits:policy==='A'?['通常酒の風味・製法詳細は保持しない']:policy==='B'?['選外の発売ID・外観・再登場会話を失う']:['通常酒の風味・製法詳細は保持しない。任意の旧ID対応は発売数に比例して増える']};
}
export function recallWine(memory,id){
 const row=memory.catalog.find(r=>r.id===id);
 if(!row)return {status:'missing',releaseId:id,reason:'この方式では識別情報を残していません'};
 return {status:'known',...copy(row),svg:memory.visuals[row.visualKey].svg,detail:copy(memory.details[id]??null),coverage:{appearance:true,flavor:!!memory.details[id]?.profile,recipe:!!memory.details[id]?.recipe}};
}
export function compareMemory(source,options={}){
 return ['A','B','C'].map(policy=>{const memory=memoryCatalog(source,{...options,policy});return {policy,bytes:bytes(memory),identities:memory.catalog.length,details:Object.keys(memory.details).length,visuals:Object.keys(memory.visuals).length,missing:source.releases.filter(r=>!memory.catalog.some(x=>x.id===r.id)).map(r=>r.id),coverage:source.releases.map(r=>({releaseId:r.id,...recallWine(memory,r.id).coverage,status:recallWine(memory,r.id).status})),memory};});
}
