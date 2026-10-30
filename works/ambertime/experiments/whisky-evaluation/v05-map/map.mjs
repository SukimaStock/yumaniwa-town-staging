import * as M from '../v03/model.mjs';
import {SIZE,MAP_CELL,STAGES,renderMap} from '../../world-map/v01/map.mjs';

export const MAP_VERSION='whisky-map/0.5';
export const VARIANTS=Object.freeze({numbers:'数字中心',symbols:'印中心',reaction:'数字と短い反応'});
// Lab-only overlays. These are not native store IDs, contracts or canonical map positions.
export const PIN_POSITIONS=Object.freeze({
  2:Object.freeze({bar:Object.freeze([48,52]),specialist:Object.freeze([102,46]),diner:Object.freeze([114,106])}),
  3:Object.freeze({bar:Object.freeze([30,56]),specialist:Object.freeze([94,52]),diner:Object.freeze([106,100])})
});
const LABEL_POSITIONS={2:{bar:[30,75],specialist:[106,22],diner:[106,128]},3:{bar:[28,78],specialist:[106,24],diner:[106,124]}};
export const LEGEND='売＝開始からの累計、残＝現在の店頭';
export const PLACEMENT_NOTE='3店はLab用の仮配置です。';
const clone=x=>structuredClone(x),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const positive=e=>e.verdict==='like'||e.verdict==='strong';
const negative=e=>e.verdict==='neutral'||e.verdict==='miss';
const info=p=>({productId:p.id,name:p.name,sample:p.sample,years:p.years,createdMonth:p.createdMonth});
const quote=(p,e)=>e?{productId:p.id,text:e.reaction?.text??e.text??'',verdict:e.verdict}:null;
const archivedInfo=(p,r)=>({...info(p),sold:r.sold,supportCount:r.supportCount,lastSale:r.lastSale});
function shopPin(session,shop,stage){
 const month=session.sales.month,deliveries=session.receipts.filter(r=>r.shopId===shop.id&&r.kind==='delivery'&&r.month<=month);
 if(!deliveries.length)return null;
 const latest=deliveries.at(-1),products=session.sales.products,product=products.find(p=>p.id===latest.productId),relation=session.relations[shop.id];
 const rows=products.map(p=>({p,row:M.productSummary(session,p.id).byShop.find(r=>r.shopId===shop.id)}));
 const sold=rows.reduce((n,x)=>n+x.row.sold,0),remaining=rows.reduce((n,x)=>n+x.row.remaining,0);
 const evaluations=rows.flatMap(x=>x.row.evaluations),positiveCount=evaluations.filter(positive).length;
 const report=rows.find(x=>x.p.id===product.id).row,view=M.shopView(session,shop.id,product.id);
 const currentProducts=rows.filter(x=>x.row.remaining>0).map(({p,row})=>({...info(p),sold:row.sold,remaining:row.remaining}));
 const priorId=view.reaction?.priorProductId,prior=relation.archive.find(r=>r.productId===priorId&&r.sold>0&&r.lastSale<=month);
 const positiveHistory=relation.archive.filter(r=>r.productId!==product.id&&r.sold>0&&r.supportCount>0&&r.lastSale<=month).sort((a,b)=>b.lastSale-a.lastSale||a.productId-b.productId);
 const past=prior??positiveHistory[0]??null,pastProduct=past?products.find(p=>p.id===past.productId):null;
 // Expectations are descriptions of previously observed favorable examples, not invented requests.
 const expectationExamples=relation.expectations.filter(e=>e.positiveCount>0).sort((a,b)=>b.weight-a.weight||a.productId-b.productId).slice(0,2).map(e=>info(products.find(p=>p.id===e.productId)));
 const buyerPositive=quote(product,report.evaluations.find(positive)),buyerNegative=quote(product,report.evaluations.find(negative));
 const hasPrior=Boolean(prior),change=buyerPositive?'好む客':hasPrior?'前の一本':remaining>0?'店頭あり':sold>0?'販売記録':'納品済み';
 const marker=buyerPositive?'positive':hasPrior?'memory':remaining>0?'stock':sold>0?'sold':'received';
 const [x,y]=PIN_POSITIONS[stage][shop.id],[labelX,labelY]=LABEL_POSITIONS[stage][shop.id];
 return {id:shop.id,name:shop.name,x,y,labelX,labelY,sold,remaining,positiveCount,reportProductId:product.id,
  reportProduct:{...info(product),sold:report.sold,remaining:report.remaining,evaluationCount:report.evaluations.length,positiveCount:report.evaluations.filter(positive).length},
  currentProducts,buyerPositive,buyerNegative,buyerPositiveText:buyerPositive?.text??'',buyerNegativeText:buyerNegative?.text??'',
  memoryText:view.text??'',pastMemory:past?archivedInfo(pastProduct,past):null,expectationExamples,
  change,marker,lastTradeMonth:relation.lastTradeMonth,
  salesMapping:shop.id==='bar'?'retail（販売計算上のLab対応。本編bar店舗ではありません）':shop.id==='diner'?'supermarket（Lab対応）':'town-liquor（Lab対応）'};
}
export function mapFor(session,stage=2){
 if(stage!==2&&stage!==3)throw Error('近所か町を選んでください。');
 const pins=M.SHOPS.map(shop=>shopPin(session,shop,stage)).filter(Boolean);
 return {version:MAP_VERSION,month:session.sales.month,stage,stageName:STAGES[stage-1],pins,legend:LEGEND,placementNote:PLACEMENT_NOTE};
}
export function markerRects(pin,selected=false){
 const x=Math.floor(pin.x/MAP_CELL)*MAP_CELL,y=Math.floor(pin.y/MAP_CELL)*MAP_CELL;
 const base=[{x:x-6,y:y-6,w:12,h:12,color:'#27353b'},{x:x-4,y:y-4,w:8,h:8,color:'#e6d49e'}];
 if(pin.marker==='positive')base.push({x:x-2,y:y-8,w:4,h:2,color:'#f0e6c8'});
 if(pin.marker==='memory')base.push({x:x-4,y:y-4,w:8,h:2,color:'#b87333'});
 if(pin.marker==='stock')base.push({x:x-2,y:y-4,w:4,h:8,color:'#87996b'});
 if(pin.marker==='sold')base.push({x:x-4,y:y-2,w:8,h:4,color:'#b87333'});
 if(selected)base.push({x:x-8,y:y-8,w:2,h:2,color:'#f0e6c8'},{x:x+6,y:y+6,w:2,h:2,color:'#f0e6c8'});
 return base;
}
// No model action, requestAnimationFrame or timer is part of painting.
export function paintMap(canvas,projection,variant='numbers',selectedId=null){
 if(!Object.hasOwn(VARIANTS,variant))throw Error('見せ方を選んでください。');
 canvas.width=SIZE;canvas.height=SIZE;const ctx=canvas.getContext('2d',{alpha:false});
 renderMap(ctx,projection.stage);
 for(const pin of projection.pins)for(const r of markerRects(pin,pin.id===selectedId)){ctx.fillStyle=r.color;ctx.fillRect(r.x,r.y,r.w,r.h);}
 return projection.stage;
}
export function pinsMarkup(projection,variant='numbers',selectedId=null){
 if(!Object.hasOwn(VARIANTS,variant))throw Error('見せ方を選んでください。');
 return projection.pins.map(pin=>{
  const label=variant==='numbers'?`売${pin.sold} 残${pin.remaining}`:variant==='reaction'?`売${pin.sold} · ${pin.change}`:'';
  const name=pin.id==='diner'?'食堂':pin.id==='bar'?'バー':'専門酒店';
  const button=`<button type="button" class="map-pin" data-map-shop="${pin.id}" style="left:${pin.x/SIZE*100}%;top:${pin.y/SIZE*100}%" aria-pressed="${pin.id===selectedId}" aria-label="${esc(pin.name+'。累計'+pin.sold+'本売却、店頭'+pin.remaining+'本。店からの報告を見る')}" title="${esc(pin.name)}"><span class="map-pin-focus" aria-hidden="true"></span></button>`;
  const badge=variant==='symbols'?'':`<span class="map-badge" data-map-badge="${pin.id}" style="left:${pin.labelX/SIZE*100}%;top:${pin.labelY/SIZE*100}%" aria-hidden="true"><span>${esc(name)}</span><strong>${esc(label)}</strong></span>`;
  return button+badge;
 }).join('');
}
export const SYMBOL_LEGEND='突起＝好む客の報告、上線＝前の一本、縦線＝店頭あり、横線＝販売記録';
