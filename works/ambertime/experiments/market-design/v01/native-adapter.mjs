// Owned temporary native copies only. Never patches the repository or official saves.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
export const SOURCE_SHA='ea734452823f6162fa08e7671c38fa1a0cf33dc1';
export const repo=fileURLToPath(new URL('../../../../../',import.meta.url));
const src=path.join(repo,'works/ambertime');
export async function assertSourceIdentity(){
 const runtime=(await fs.readdir(src)).filter(f=>f.endsWith('.mjs')).map(f=>'works/ambertime/'+f);
 // Same source-identity boundary as the old audit. Failure is deliberately fatal.
 execFileSync('git',['diff','--quiet',SOURCE_SHA,'--',...runtime,'works/ambertime-flavor-lab-v02','works/ambertime/experiments/town-simulation','works/ambertime/experiments/reputation'],{cwd:repo});
 return {sourceSha:SOURCE_SHA,head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),runtimeFiles:runtime.length};
}
const replaceOnce=(s,old,next)=>{assert.equal(s.split(old).length,2,`Pinned native transform changed: ${old.slice(0,70)}`);return s.replace(old,next);};
export async function createNativeCandidate(){
 await assertSourceIdentity();
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ambertime-market-design-'));
 try{
  await fs.mkdir(root+'/modules',{recursive:true});
  await fs.cp(path.resolve(src,'../ambertime-flavor-lab-v02'),root+'/ambertime-flavor-lab-v02',{recursive:true});
  for(const name of ['town-simulation','reputation'])await fs.cp(path.join(src,'experiments',name),path.join(root,'modules/experiments',name),{recursive:true});
  for(const f of await fs.readdir(src))if(f.endsWith('.mjs'))await fs.copyFile(path.join(src,f),path.join(root,'modules',f));
  await fs.copyFile(fileURLToPath(new URL('./sales.mjs',import.meta.url)),root+'/modules/market-design-sales.mjs');
  let e=await fs.readFile(root+'/modules/economy.mjs','utf8');
  e="import {planSales} from './market-design-sales.mjs';\n"+e;
  const begin=e.indexOf(' const youngCount=stocked.filter('),end=e.indexOf(' let revenue=0,bottles=0;const sales=[];',begin);
  assert(begin>=0&&end>begin,'Pinned native retail block changed');
  e=e.slice(0,begin)+` const marketPlan=planSales(stocked.map(p=>({...p,count:available(p),referencePrice:marketValue(p)})),'retail',s.marketDesign?.retail??{}, {month:j.core.month,seed:s.seed});
 j.marketDesign={...(s.marketDesign??{}),retail:marketPlan.ledger};
 const counts=stocked.map(p=>marketPlan.sales.find(x=>x.id===p.id)?.count??0);
`+e.slice(end);
  await fs.writeFile(root+'/modules/economy.mjs',e);
  let m=await fs.readFile(root+'/modules/store-market.mjs','utf8');
  m="import {planSales,affinity} from './market-design-sales.mjs';\n"+m;
  const at=m.indexOf('export function planStoreMarketSales(');assert(at>0);
  m=m.slice(0,at)+`export function planStoreMarketSales(s,month=s.core.month){
 if(!storeMarketMode(s)||!Number.isInteger(month)||month<0)throw Error('店の販売月を確認してください。');
 return STORE_MARKET_SHOPS.filter(store=>s.shop.relations.some(r=>r.shopId===store.id&&r.startedMonth<month)).map(store=>{
  const rows=storeMarketRows(s,store.id).map(row=>({...row,p:s.core.products.find(p=>p.id===row.productId),r:s.releases.find(r=>r.id===row.releaseId)})).filter(row=>qualified(s,row.p,row.r,store,month));
  const items=rows.map(row=>({...row.p,count:Math.min(row.count,row.p.stock),price:normalShopUnitPrice(s,row.productId,store.id),referencePrice:NORMAL_SHOP_DEMAND.referencePaidPrice[store.id]}));
  const result=planSales(items,store.id,s.marketDesign?.[store.id]??{}, {month,seed:s.seed});
  const shipments=result.sales.map(x=>{const row=rows.find(r=>r.productId===x.id);return {productId:x.id,releaseId:row.releaseId,count:x.count,unitPrice:normalShopUnitPrice(s,x.id,store.id),fit:affinity(store.id,row.p)};});
  const planned=shipments.reduce((n,x)=>n+x.count,0),requested=result.opportunities;
  return {shopId:store.id,month,count:requested,requested,alreadyShipped:0,planned,unmet:Math.max(0,requested-planned),available:items.reduce((n,p)=>n+p.count,0),belowMinimum:0,profileProductId:rows[0]?.productId??null,unitPrice:shipments[0]?.unitPrice??null,reason:!rows.length?'no-assigned-stock':planned?'market-sales':'waiting-for-customers',components:{candidate:true},shipments,marketDesignLedger:result.ledger};
 });
}
`;
  await fs.writeFile(root+'/modules/store-market.mjs',m);
  let p=await fs.readFile(root+'/modules/partner-orders.mjs','utf8');
  p=replaceOnce(p,'  const {shipments,...summary}=plan;','  j.marketDesign={...(j.marketDesign??{}),[plan.shopId]:plan.marketDesignLedger};\n  const {shipments,marketDesignLedger,...summary}=plan;');
  await fs.writeFile(root+'/modules/partner-orders.mjs',p);
  const engine=await import(pathToFileURL(root+'/modules/partner-orders.mjs').href);
  return {engine,root,close:()=>fs.rm(root,{recursive:true,force:true})};
 }catch(error){await fs.rm(root,{recursive:true,force:true});throw error;}
}
export async function nativeBaseline(){await assertSourceIdentity();return import(pathToFileURL(src+'/partner-orders.mjs').href);}
