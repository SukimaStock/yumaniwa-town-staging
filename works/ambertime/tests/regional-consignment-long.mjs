// Reproducible real native operation careers; no injected cash, dates or state.
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import * as D from '../partner-orders.mjs';
import {naturalDeliveryFixture,fillRegionalBatch,sessionFor} from './regional-delivery-helpers.mjs';
import {readSession,serializeSession} from '../development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
const opts={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs},round=n=>Math.round(n*100)/100;
const strategies=process.env.STRATEGY?[process.env.STRATEGY]:['regional','diversified','small','bulk','local'];
const horizon=Number(process.env.MONTHS??1200);
const out=[];
for(const strategy of strategies){
 let s=D.enableConsignment(D.enableWorldNetwork(naturalDeliveryFixture(3))),start=s.core.month,handovers=0,consigns=0;const checks=[];const started=performance.now();
 function resolve(){let guard=0;while(s.decisions.length){assert(++guard<50,'decisions stuck');const d=s.decisions[0],o=d.pending.options.find(x=>x.id==='wait')??d.pending.options.find(x=>x.id==='last');assert(o);s=D.chooseDistillery(s,d.caskId,o.id);}if(s.trade.offer)s=D.declineOffer(s);while(s.shop.offer){assert(++guard<50,'offers stuck');s=(s.shop.offer.shopId==='department'?D.declineShop:D.acceptShop)(s,s.shop.offer.shopId,s.shop.offer.id);}for(const o of D.regionalOffers(s))s=D.acceptRegionalOffer(s,o.partnerId,o.id);if(s.generations.active.phase==='review'){s=D.handoverGeneration(s,s.generations.active.id);handovers++;}}
 function distribute(){
  const bulkReady=s.core.products.reduce((n,p)=>n+D.storeMarketInventory(s,p.id).hand,0)>=100||s.core.month%60===0;
  for(const p of s.core.products){let available=D.storeMarketInventory(s,p.id).hand;if(!available)continue;
   if(strategy==='bulk'&&!bulkReady)continue;
   const desks=D.regionalDeliveryPartners(s).filter(d=>D.regionalDeliveryQuote(s,p.id,d.id).ok),chosen=strategy==='diversified'?desks:desks.slice(0,1);
   if(strategy==='local'||!chosen.length){s=D.setMarketRetail(s,{productId:p.id,count:D.storeMarketInventory(s,p.id).retail+available});continue;}
   for(let i=0;i<chosen.length;i++){const d=chosen[i],q=D.regionalDeliveryQuote(s,p.id,d.id),count=strategy==='small'?Math.min(5,q.maxCount):Math.ceil(q.maxCount/(chosen.length-i));if(!count)continue;s=D.assignRegionalProduct(s,{partnerId:d.id,productId:p.id,contractId:d.contractId,allocationId:q.nextAllocationId,count});const row=D.regionalDeliveryRows(s,d.id).find(r=>r.productId===p.id);s=D.consignRegionalProduct(s,{partnerId:d.id,productId:p.id,contractId:d.contractId,allocationIds:row.allocationIds,consignmentId:D.nextConsignmentId(s)});consigns++;}
  }
 }
 for(;s.core.month<start+horizon;){
  resolve();for(const c of [...s.core.casks])if(c.age>=12)s=D.bottleBranded(s,c.id,{});distribute();resolve();
  if(D.canStart(s).ok&&(s.core.month%12===0||s.generations.active.phase==='last-batch')){s=fillRegionalBatch(s);resolve();}
  const prior=s.core.month;s=D.tickDistillery(s);assert.equal(s.core.month,prior+1,`${strategy} stalled at ${prior}`);
  for(const p of s.core.products){const inv=D.storeMarketInventory(s,p.id);assert.equal(inv.hand+inv.retail+inv.assigned+inv.held,p.stock);assert.equal(p.stock+p.sold,p.originalStock);}
  assert.equal(s.core.cash,round(1600+s.core.totals.revenue-s.core.totals.costs-s.core.totals.upkeep));assert(s.regionalConsignment.rows.length<=24);assert(Object.keys(s.regionalConsignment.ledgers).length<=9);
  if((s.core.month-start)%120===0)console.error(JSON.stringify({progress:strategy,elapsed:s.core.month-start,month:s.core.month,cash:s.core.cash}));
  if([360,1200].includes(s.core.month-start)){
   const t=performance.now(),session=sessionFor(s),raw=serializeSession(s,session,opts),restored=readSession(raw,opts);assert.equal(serializeSession(restored.game,restored,opts),raw);
   checks.push({months:s.core.month-start,gameMonth:s.core.month,formalBytes:Buffer.byteLength(raw),verifyMs:Math.round(performance.now()-t),rows:s.regionalConsignment.rows.length,ledgerBytes:Buffer.byteLength(JSON.stringify(s.regionalConsignment.ledgers)),cash:s.core.cash,sold:s.regionalConsignment.totalsByPartner,handovers});
   {mkdirSync('/tmp/ambertime-consignment-evidence',{recursive:true});writeFileSync(`/tmp/ambertime-consignment-evidence/${strategy}-${s.core.month-start}.json`,raw);}
  }
 }
 const total=Object.values(s.regionalConsignment.totalsByPartner).reduce((n,x)=>n+x.count,0);if(strategy!=='local'){assert(consigns>0);assert(total>0);}
 out.push({strategy,consigns,actualConsignmentSold:total,desks:D.regionalDeliveryPartners(s).map(d=>d.id),checks,totalMs:Math.round(performance.now()-started)});console.log(JSON.stringify(out.at(-1)));
 writeFileSync('/tmp/consignment-long-results-'+strategy+'.json',JSON.stringify(out,null,2));
}
