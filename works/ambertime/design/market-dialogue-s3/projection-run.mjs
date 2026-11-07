// Display-only scale probe. No synthetic shops or receipts are persisted as games.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {marketShopOrder} from '../../market-ui.mjs';
import {shopDialogueHistory,createDialogueProjection} from '../../shop-dialogue.mjs';
function sample(fn,n=5){const ms=[];let value;for(let i=0;i<n;i++){const t=performance.now();value=fn();ms.push(performance.now()-t);}return {minMs:Math.min(...ms),medianMs:[...ms].sort((a,b)=>a-b)[Math.floor(n/2)],maxMs:Math.max(...ms),value};}
const ordering=[];
for(const count of [3,5,10])for(const receipts of [1000,10000,100000]){
 const shops=[{id:'retail'},...Array.from({length:count},(_,i)=>({id:'s'+i}))];
 const s={core:{month:1200},storeMarket:{startedMonth:0},shop:{deliveries:Array.from({length:receipts},(_,i)=>({shopId:'s'+i%count,month:1+i%1200,count:1}))}};
 const {value,...timing}=sample(()=>marketShopOrder(s,shops));assert.equal(value.length,count+1);ordering.push({count,receipts,...timing});
}
const dialogue=[];
for(const month of [120,360,1200]){
 const ids=['town-liquor','supermarket','bar','department'];
 const releases=Array.from({length:Math.floor(month/3)},(_,i)=>({id:i+1,brandId:1,productId:i+1,bottledMonth:1+i*3,profile:{flavor:{version:1,profile:{fruit:1,grain:0,smoke:0,body:0,rough:0,spice:0,wood:0,vanilla:0}}}}));
 const deliveries=releases.flatMap(r=>ids.flatMap((shopId,j)=>Array.from({length:shopId==='department'?1:6},(_,k)=>({id:r.id*100+j*10+k,shopId,month:r.bottledMonth+1+k,brandId:1,releaseId:r.id,productId:r.productId,count:shopId==='department'?5:1,selectionId:'s'+r.id,projectId:'p'+r.id,sourceReleaseId:r.id})))).filter(d=>d.month<=month);
 const s={seed:42,core:{month},operations:[{key:'enable-shop-dialogue',value:{version:2,boundaryMonth:0}}],storeMarket:{startedMonth:0},alleyBar:{version:1,boundaryMonth:0},releases,shop:{relations:ids.map(shopId=>({shopId,startedMonth:0})),deliveries},department:{adoptions:deliveries.filter(d=>d.shopId==='department').map(d=>({...d,deliveryId:d.id}))}};
 const {value,...full}=sample(()=>shopDialogueHistory(s));const p=createDialogueProjection();assert.deepEqual(p.read(s),value.at(-1)??null);
 const {value:unused,...cached}=sample(()=>{for(let i=0;i<100;i++)for(const id of ids)p.read(s,id);});
 dialogue.push({month,releases:releases.length,receipts:deliveries.length,lines:value.length,full,cached400Readbacks:cached});
}
const result={sourceSha:'d12bdbde20f357d193c19a23ad25d3b74e92c10b',node:process.version,method:'Five desktop Node samples; synthetic display facts, not actual-model saves or browser frames. No timing assertions.',ordering,dialogue,limitations:['Receipt scan is once per room entry, not every repaint.','Dialogue cache is exact game-object identity; a new immutable game object recomputes history.','No physical Safari, DOM layout, native touch or localStorage capacity measured.']};
writeFileSync(new URL('./projection-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
