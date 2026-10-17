// Fixed-cohort price audit; not a replay of the 0.15 offer or delivery engine.
// Run: node works/ambertime/design/shop/price-audit.mjs > works/ambertime/design/shop/price-results.json
import {profileAt} from '../../experiments/distillation/models.mjs';
import {ageExperiment,bottleExperiment,productionCosts} from '../../experiments/distillation/adapters.mjs';
import * as E from '../../economy.mjs';
const rows=[];
for(const seed of [1,42,20261015])for(const stop of [30,65,99])for(const type of ['bourbon','refill'])for(const age of [6,12,24])for(const tier of ['low','standard','high']){
 const aged=ageExperiment(profileAt('a',stop,seed),type,age),r=bottleExperiment(aged,{tier}),cost=productionCosts(aged).total;
 for(const rate of [0,.75,.8,.85])for(const delivery of rate?[5,10]:[0]){
  let s=E.newDistillery(seed);s.core=structuredClone(r.core);s.productsById[3]={listed:true,selectedPrice:tier};let shopRevenue=0,shopSold=0,stock6,rev6,stock1,rev1,soldOut=null;
  const unit=Math.round(Math.min(r.product.price,r.prices.standard)*rate*100)/100;
  for(let month=1;month<=24;month++){
   const p=s.core.products[0],n=Math.min(delivery,p.stock);p.stock-=n;p.sold+=n;p.revenue=Math.round((p.revenue+n*unit)*100)/100;shopSold+=n;shopRevenue=Math.round((shopRevenue+n*unit)*100)/100;
   s=E.economicMonthly(s,s.core.month);
   if(month===1){stock1=s.core.products[0].stock;rev1=s.core.totals.revenue+shopRevenue;}if(soldOut===null&&s.core.products[0].stock===0)soldOut=month;
   if(month===6){stock6=s.core.products[0].stock;rev6=s.core.totals.revenue+shopRevenue;}
  }
  rows.push({seed,stop,type,age,tier,rate,delivery,unit,retail:r.product.price,stock1,rev1,soldOut,stock6,rev6,revenue:s.core.totals.revenue+shopRevenue,profit:s.core.totals.revenue+shopRevenue-cost-96,stock:s.core.products[0].stock,shopSold});
 }
}
const summary=[];
for(const rate of [.75,.8,.85])for(const delivery of [5,10]){
 const rs=rows.filter(r=>r.rate===rate&&r.delivery===delivery),diff=rs.map(r=>{const b=rows.find(b=>b.rate===0&&['seed','stop','type','age','tier'].every(k=>b[k]===r[k]));return {r,b,d:r.revenue-b.revenue};});
 summary.push({rate,delivery,mean24RevenueDelta:diff.reduce((s,x)=>s+x.d,0)/diff.length,minDelta:Math.min(...diff.map(x=>x.d)),maxDelta:Math.max(...diff.map(x=>x.d)),noneGreater:diff.filter(x=>x.d<0).length,shopGreater:diff.filter(x=>x.d>0).length,mean6Delta:diff.reduce((s,x)=>s+x.r.rev6-x.b.rev6,0)/diff.length,remainingNoShop24:diff.filter(x=>x.b.stock>0).length,mean1CashGain:diff.reduce((s,x)=>s+x.r.rev1-x.b.rev1,0)/diff.length,meanSellOut:diff.reduce((s,x)=>s+x.r.soldOut,0)/diff.length,meanNoShopSellOut:diff.reduce((s,x)=>s+x.b.soldOut,0)/diff.length});
}
console.log(JSON.stringify({schema:'ambertime-shop-price-audit/1',assumptions:{profileCount:162,policyCount:7,horizonMonths:24,seeds:[1,42,20261015],positions:[30,65,99],ages:[6,12,24],casks:['bourbon','refill'],tiers:['low','standard','high'],rates:[0,.75,.8,.85],monthlyDeliveries:[0,5,10],retailReputationFactor:1,deliveryTiming:'before monthly retail, established relationship assumed',pricing:'round(0.80 * min(current selected retail price, standard), 2) for adopted policy',profit:'retail plus shop receipts less current production costs and 24 months base upkeep',scope:'fixed single release; no capacity, offer, cash-reinvestment or replay claim'},conditions:rows.length,summary,rows,examples:rows.filter(r=>r.seed===20261015&&r.type==='bourbon'&&r.tier==='standard'&&[0,.8].includes(r.rate)&&[0,10].includes(r.delivery))},null,2));
