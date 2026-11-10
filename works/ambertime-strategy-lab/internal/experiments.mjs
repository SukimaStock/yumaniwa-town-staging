import {createModel,registerRelease,assignStock,applyTransaction,compactRelease,storeRelation,setContract,storeRecord} from './model.mjs';
import {planSales} from '../../ambertime/market-sales.mjs';
import {bytes} from './memory.mjs';
export function relationExperiment(kind='continuous',{capacity=4,months=36,weight=.5,target=12}={}){
 let model=createModel();const release={id:1,productId:1,brandId:1,caskId:1,batchId:1,bottledMonth:0,age:24,bottles:100,price:20,profile:{roughness:.2,character:.7,wood:.3}};
 model=registerRelease(model,release);model=setContract(model,'bar',1,0);let seq=0;const rows=[];
 for(let month=1;month<=months;month++){
  const count=kind==='bulk'?month===1?60:0:kind==='continuous'?month<=30?2:0:month<=6?5:0;
  if(!count)continue;
  const event={seq:++seq,month,status:'completed',kind:kind==='procurement'?'paid-procurement':'store-sell-through',releaseId:1,shopId:'bar',count,revenueCents:count*2000};
  // This is a typed transaction accounting test, not a native sales pace simulation.
  if(event.kind==='store-sell-through')model=assignStock(model,1,'bar',count);
  model=applyTransaction(model,event);rows.push(event);
 }
 return {kind,scope:'確定transactionの集計比較。販売機会を再現する経営シミュレーションではない',delivery:storeRelation(model,'bar',1,{month:months,capacity,weight,target,basis:'delivery'}),sale:storeRelation(model,'bar',1,{month:months,capacity,weight,target,basis:'sale'}),record:storeRecord(model,'bar',1),model,rows};
}
// Fixed native carry schedule, 54 bottles/year, at most 8 active products.
// 100 years here means 1200 synthetic monthly steps, not formal game/save validation.
export function longRun(months=1200,{seed=42}={}){
 const started=performance.now();let m=createModel(),seq=0,ledger={},peak=0;const releases=[],transactions=[],products=[];
 const flavor={version:1,profile:{fruit:.15,grain:.2,smoke:.6,body:.4,rough:.2,spice:.2,wood:.3,vanilla:.3}};
 for(let month=0;month<=months;month++){
  if(month){
   const result=planSales(products.filter(p=>p.stock>0).map(p=>({...p,count:p.stock,referencePrice:20})),'retail',ledger,{month,seed,method:'carry'});ledger=result.ledger;
   for(const sale of result.sales){const p=products.find(p=>p.id===sale.id);p.stock-=sale.count;const r=releases.find(r=>r.id===p.id);r.sold+=sale.count;const e={seq:++seq,month,status:'completed',kind:'retail-sale',releaseId:p.id,count:sale.count,revenueCents:sale.count*2000};transactions.push(e);m=applyTransaction(m,e);if(!p.stock)m=compactRelease(m,p.id);}
  }
  if(month<months&&month%12===0&&products.filter(p=>p.stock>0).length<8){const id=releases.length+1,profile={roughness:.2,character:.7,wood:.3,flavor};const r={id,productId:id,brandId:1,caskId:id,batchId:id,bottledMonth:month,age:24,bottles:54,price:20,profile,sold:0};releases.push(r);products.push({id,age:24,...profile,price:20,stock:54});m=registerRelease(m,r);}
  peak=Math.max(peak,products.filter(p=>p.stock>0).length);
 }
 const updateMs=performance.now()-started,full={releases,transactions,products},scanStart=performance.now();let scans=0,total=0;
 // Repeated read workload, independent baseline traverses all receipts.
 for(let i=0;i<100;i++)for(const e of transactions){total+=e.count;scans++;}
 const fullReadMs=performance.now()-scanStart,compactStart=performance.now();let compactTotal=0;for(let i=0;i<100;i++)compactTotal+=m.retail.bottles;
 const compactReadMs=performance.now()-compactStart;
 return {months,seed,synthetic:true,peak,releaseCount:releases.length,transactionCount:transactions.length,sold:m.retail.bottles,remaining:products.reduce((n,p)=>n+p.stock,0),fullBytes:bytes(full),modelBytes:bytes(m),updateMs,fullReadMs,compactReadMs,fullReadVisits:scans,compactReadVisits:100,readEqual:total===compactTotal,identityCount:Object.keys(m.identities).length,wineCount:Object.keys(m.wines).length,model:m,full};
}
