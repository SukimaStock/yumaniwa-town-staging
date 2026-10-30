// Disposable presentation of native sales records. Never replay or mutate the game.
import {SHOPS,SHOP} from './shop-model.mjs?v=0.48-free-aging';
import {storeMarketMode,placementMode} from './placement-mode.mjs?v=store-market-main-r1';
import {shopRemark} from './shop-remarks.mjs?v=0.51-shop-remarks';
import {mapShopPositions} from './world-map-view.mjs?v=0.28.0-map';
import {customerComments} from './player-news.mjs?v=0.25.4';
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const count=n=>integer(n)?n:0;
const shopId=row=>row.shopId??SHOP.id;
const validMonth=(month,now)=>integer(month)&&month<=now;
const sum=rows=>rows.reduce((n,row)=>n+count(row.count),0);
const productName=(game,id)=>{
 const release=(game.releases??[]).find(r=>r.productId===id),brand=(game.brands??[]).find(b=>b.id===release?.brandId);
 return brand?.name??'ウイスキー';
};
function periodFor(month){return {fromMonth:Math.max(0,month-11),toMonth:month,label:'直近12か月'};}
function shopDetail(game,id,month,period){
 const store=SHOPS.find(s=>s.id===id);if(!store)return null;
 const relations=(game.shop?.relations??[]).filter(r=>shopId(r)===id&&r.status!=='declined'&&validMonth(r.startedMonth,month));
 const receipts=(game.shop?.deliveries??[]).filter(r=>shopId(r)===id&&count(r.count)>0&&validMonth(r.month,month));
 // A department consultation is not completed handling. Never display proposals as shops.
 if(id==='department'?!receipts.length:!relations.length)return null;
 const market=storeMarketMode(game)&&id!=='department',boundary=game.storeMarket?.startedMonth;
 // Before the explicit shelf boundary the same ledger meant wholesale deliveries.
 // Store-market sales happen on a later month; never relabel older receipts as purchases.
 const sales=market&&integer(boundary)?receipts.filter(r=>r.month>boundary):[];
 const window=rows=>rows.filter(r=>r.month>=period.fromMonth);
 const rows=market?Object.entries(game.storeMarket.byShop?.[id]??{}).filter(([,n])=>count(n)>0):[];
 const products=rows.map(([key,n])=>{
  const productId=Number(key),release=(game.releases??[]).find(r=>r.productId===productId),product=(game.core?.products??[]).find(p=>p.id===productId);
  return {productId,name:productName(game,productId),count:n,bottledMonth:release?.bottledMonth??product?.bottledMonth??null,age:release?.age??product?.age??null};
 }).sort((a,b)=>(b.bottledMonth??-1)-(a.bottledMonth??-1)||a.productId-b.productId);
 const latest=[...receipts].sort((a,b)=>b.month-a.month||(b.id??0)-(a.id??0))[0];
 const brandId=latest?.brandId??relations.at(-1)?.brandId;
 const remark=brandId==null?null:shopRemark(game,id,brandId);
 const currentStock=market?sum(products):null,totalSold=market?sum(sales):null,recentSold=market?sum(window(sales)):null;
 const monthlySold=market?sum(sales.filter(r=>r.month===month)):null;
 const status=market?(recentSold>0?'販売あり':currentStock>0?'店頭あり':totalSold>0?'販売記録':latest?'納品記録':'取扱開始'):(receipts.length?'納品済み':'取扱開始');
 return {id,name:store.name,mode:market?'store-market':'delivery',period:{...period},currentStock,monthlySold,recentSold,windowSold:recentSold,totalSold,totalDelivered:sum(receipts),recentDelivered:sum(window(receipts)),historicalDelivered:market?sum(receipts.filter(r=>r.month<=boundary)):sum(receipts),latestMonth:latest?.month??null,latestCount:latest?.count??null,status,products,remark:remark?.text??'',remarkKey:remark?.key??null,remarkBrandId:brandId??null,customerComment:null};
}
function retailDetail(game,month,period){
 const releases=(game.releases??[]).filter(r=>validMonth(r.bottledMonth,month));
 const receipts=game.labConnection?.version===1?(game.labConnection.town?.shipments??[]).filter(r=>typeof r.id==='string'&&r.id.startsWith('retail:')&&count(r.count)>0&&validMonth(r.month,month)):[];
 const stock=placementMode(game)?Object.values(game.placement.retailByProduct??{}).reduce((n,v)=>n+count(v),0):null;
 const comments=customerComments(game).filter(r=>validMonth(r.month,month));
 return {id:'retail',name:'自家販売',currentStock:stock,totalSold:releases.reduce((n,r)=>n+count(r.sold),0),recentSold:receipts.length?sum(receipts.filter(r=>r.month>=period.fromMonth)):null,period:{...period},customerComment:comments.at(-1)?{...comments.at(-1)}:null};
}
export function mapShopDetail(game,id){
 const month=count(game?.core?.month),period=periodFor(month);
 return id==='retail'?retailDetail(game,month,period):shopDetail(game,id,month,period);
}
export function mapSalesProjection(game,stage){
 const month=count(game?.core?.month),period=periodFor(month),positions=mapShopPositions(stage);
 const pins=Object.entries(positions).flatMap(([id,position])=>{
  const detail=shopDetail(game,id,month,period);if(!detail)return [];
  const [x,y]=Array.isArray(position)?position:[position.x,position.y];return [{...detail,x,y}];
 });
 return {month,period,pins,retail:retailDetail(game,month,period)};
}
