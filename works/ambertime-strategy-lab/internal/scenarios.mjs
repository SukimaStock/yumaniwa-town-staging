import {ageCask} from '../../ambertime/model.mjs';
import {marketValue} from '../../ambertime/economy.mjs';
import {planSales} from '../../ambertime/market-sales.mjs';
import {runComparison,currentShopEvidence} from '../model.mjs';
import {createModel,registerRelease,applyTransaction,compactRelease,setCurrentCasks} from './model.mjs';
const copy=structuredClone;
// Reuses native aging and carry sales; authored cask, not a full-game replay.
export function bottlingScenario(mode='whole',{months=60,seed=42}={}){
 if(!['whole','singles','aged'].includes(mode))throw Error('Unknown bottling scenario');
 let cask={id:1,age:24,cut:.5,type:'refill',roughness:.25,character:.7,wood:.3,litres:37.8,variation:{soften:1,wood:1,evaporation:1},history:[]};
 let compact=createModel(),ledger={},seq=0,peak=0;const releases=[],products=[],transactions=[],monthly=[];
 for(let month=0;month<=months;month++){
  if(month){
   cask=ageCask(cask);
   const out=planSales(products.filter(p=>p.stock>0&&p.bottledMonth<month).map(p=>({...p,count:p.stock,referencePrice:marketValue(p)})),'retail',ledger,{month,seed,method:'carry'});ledger=out.ledger;
   for(const sale of out.sales){const p=products.find(p=>p.id===sale.id),r=releases.find(r=>r.productId===sale.id);p.stock-=sale.count;p.count=p.stock;r.sold+=sale.count;r.revenue=Math.round((r.revenue+sale.count*p.price)*100)/100;r.status=p.stock?'selling':'sold-out';const tx={seq:++seq,month,status:'completed',kind:'retail-sale',releaseId:r.id,count:sale.count,revenueCents:Math.round(sale.count*p.price*100)};transactions.push(tx);compact=applyTransaction(compact,tx);if(!p.stock)compact=compactRelease(compact,r.id);}
   monthly.push({month,sold:out.sold});
  }
  const slots=8-products.filter(p=>p.stock>0).length,available=Math.floor((cask.litres+1e-9)/.7);
  const qs=mode==='whole'&&month===0?[available]:mode==='singles'?Array(Math.min(slots,available)).fill(1):mode==='aged'&&[0,6,12].includes(month)&&slots&&available?[month===12?available:Math.min(18,available)]:[];
  for(const q of qs.filter(q=>q>0)){
   const id=releases.length+1,{history,...profile}=copy(cask);delete profile.id;delete profile.litres;
   const p={...copy(cask),id,bottledMonth:month,stock:q,count:q,price:Math.round(marketValue(cask)*100)/100};
   const r={id,productId:id,caskId:1,batchId:1,brandId:1,bottledMonth:month,age:cask.age,bottles:q,price:p.price,profile,sourceGeneration:1,sold:0,revenue:0,status:'selling',listed:true};
   products.push(p);releases.push(r);compact=registerRelease(compact,r);cask.litres=Math.max(0,cask.litres-q*.7);
  }
  peak=Math.max(peak,products.filter(p=>p.stock>0).length);compact=setCurrentCasks(compact,cask.litres>=.7?[cask]:[]);
 }
 return {mode,months,seed,peak,remainingLitres:cask.litres,bottled:releases.reduce((n,r)=>n+r.bottles,0),sold:releases.reduce((n,r)=>n+r.sold,0),inventory:products.reduce((n,p)=>n+p.stock,0),monthly,source:{synthetic:true,core:{month:months,casks:cask.litres>=.7?[cask]:[],products},brands:[{id:1,name:'比較酒',bottle:'round',label:'cream'}],releases,shop:{relations:[],deliveries:[]}},compact,transactions,currentEvidence:currentShopEvidence(releases,products,months)};
}
export function stageOneRegression(){const results=[];for(const seed of [1,42,20261021])for(const focus of ['town-liquor','supermarket','bar'])for(const smoke of [.25,.75])for(const months of [12,60]){const r=runComparison({seed,focus,smoke,months});results.push({seed,focus,smoke,months,sales:r.strategies.map(s=>s.sold),revenues:r.strategies.map(s=>s.revenue),diagnostic:r.splitDiagnostic.cases.map(c=>({sold:c.sold,releaseCount:c.releaseCount,unlock:c.unlock['town-liquor'].eligible}))});}return results;}
