// Public native operations only. Snapshots are lawful saves; projections never mutate them.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as D from '../../partner-orders.mjs';
import {dailyMapProjection} from '../../map-daily-view.mjs';
import {mapProgress} from '../../world-map-view.mjs';
import {advance} from '../../tests/brands-helpers.mjs';
import {runCareer} from '../../experiments/market-design/v01/run.mjs';
const out=process.argv[2]??'/tmp/amber-stage2';fs.mkdirSync(out,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
const scenarios={},timeline=[];let last;
function capture(name,s){if(scenarios[name])return;const raw=D.serializeDistillery(s);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw);const progress=mapProgress(s),p=dailyMapProjection(s,3);assert.equal(D.serializeDistillery(s),raw);fs.writeFileSync(`${out}/${name}.json`,raw);scenarios[name]={month:s.core.month,saveSha256:hash(raw),max:progress.max,bottled:progress.bottled,stores:p.pins.map(x=>({id:x.id,name:x.name,stock:x.currentStock,sold:x.recentSold,totalSold:x.totalSold,remark:x.remark,remarkKey:x.remarkKey,latestMonth:x.latestMonth,products:x.products})),retail:p.retail,reach:p.reach};}
const engine={...D,newStoreMarketDistillery(seed){last=D.newMarketRulesDistillery(seed);capture('initial',last);return last;}};
const ops=['tickDistillery','assignStoreProduct','returnStoreProduct','setMarketRetail','bottleBranded','acceptShop','declineShop'];let points=0;
for(const name of ops)engine[name]=(...args)=>{const s=D[name](...args);last=s;const raw=JSON.stringify(s);for(const stage of [1,2,3,4,5,6])dailyMapProjection(s,stage);assert.equal(JSON.stringify(s),raw);points++;
 if(name==='bottleBranded')capture('first-bottle',s);
 if(name==='acceptShop')capture('first-unlock',s);
 if(name==='assignStoreProduct')capture('first-placement',s);
 const p=dailyMapProjection(s,3);if(p.pins.length>=2)capture('multiple-stores',s);
 if(name==='tickDistillery'&&s.core.month>args[0].core.month){
  if(s.core.lastMonth.sales.some(x=>x.channel!=='stockist'&&x.sold>0))capture('first-retail-sale',s);
  if(mapProgress(s).max>=4)capture('first-wide-reach',s);
  timeline.push({month:s.core.month,max:mapProgress(s).max,retailSold:s.core.lastMonth.sales.filter(x=>x.channel!=='stockist').reduce((n,x)=>n+x.sold,0),shops:p.pins.map(x=>({id:x.id,stock:x.currentStock,recentSold:x.recentSold,totalSold:x.totalSold,remarkKey:x.remarkKey,remark:x.remark}))});
  if(s.core.lastMonth.sales.some(x=>x.channel==='stockist'&&x.sold>0))capture('first-shop-sale',s);
  if(p.pins.some(x=>x.remarkKey==='repeat'))capture('repeat-sales',s);
  if(p.pins.some(x=>x.remarkKey==='long'))capture('long-relationship',s);
  if(p.pins.length>=2&&new Set(p.pins.map(x=>x.recentSold)).size>1)capture('different-sales',s);
 }
 return s;};
const config={seed:1,cap:2,age:12,policy:'mixed',horizon:120};const career=runCareer(engine,config);capture('long-play',last);
let gap=D.restoreDistillery(fs.readFileSync(`${out}/first-shop-sale.json`,'utf8'));
for(const [id,n] of Object.entries(gap.storeMarket.byShop['town-liquor']))if(n>0)gap=D.returnStoreProduct(gap,{productId:Number(id),shopId:'town-liquor'});
gap=advance(gap,6);capture('gap-before-restock',gap);
const held=gap.core.products.find(p=>D.storeMarketInventory(gap,p.id).hand>=5);assert(held);gap=D.assignStoreProduct(gap,{productId:held.id,shopId:'town-liquor',count:5});capture('restocked-after-gap',gap);
const baseline=runCareer({...D,newStoreMarketDistillery:D.newMarketRulesDistillery},config);assert.deepEqual(career,baseline);
fs.writeFileSync(`${out}/summary.json`,JSON.stringify({base:'189223bf',config,method:'Native runCareer public operations; deterministic seed1, no injected stock/shops/sales. Same career without view reads gives exact same result. Each snapshot serializes/restores exactly.',points,nativeCareerMatch:true,scenarios,timeline,career},null,2)+'\n');
console.log(JSON.stringify({points,months:career.months,stop:career.reason,scenarios:Object.fromEntries(Object.entries(scenarios).map(([k,v])=>[k,{month:v.month,max:v.max,shops:v.stores.length,remarks:v.stores.map(x=>x.remarkKey)}]))},null,2));
