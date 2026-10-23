// Pure, read-only view of the existing AmberTime town record.
// No save schema, economic action or transmission draw is changed here.
import {STAGES,clampStage,renderMap,MAP_CELL} from './experiments/world-map/v01/map.mjs';
import {NODES} from './town-connection.mjs?v=stage4-r2';
const level=new Map(NODES.map(n=>[n.id,n.level]));
const receipts=game=>game?.labConnection?.version===1?game.labConnection.town:null;
export function mapProgress(game){
 const town=receipts(game);
 const arrivals=Array.isArray(town?.arrivals)?town.arrivals:[];
 const sales=Array.isArray(game?.shop?.deliveries)?game.shop.deliveries:[];
 const shipments=Array.isArray(town?.shipments)?town.shipments:[];
 const firstSale=shipments.some(e=>(e?.count??0)>0)||sales.some(e=>(e?.count??0)>0);
 const bottled=firstSale||(game?.releases??[]).some(r=>(r.bottles??0)>0)||(game?.records??[]).some(r=>(r.bottles??0)>0)||(game?.core?.products??[]).some(p=>(p.originalStock??p.stock??0)>0);
 let max=firstSale?2:1;
 const reached={town:false,near:false,national:false,overseas:false};
 for(const e of arrivals){if(!e||e.type!=='arrival'||!e.to||e.channel==='direct')continue;
   const group=level.get(e.to);if(group==='町')reached.town=true;
   if(group==='周辺地域')reached.near=true;
   if(group==='全国')reached.national=true;
   if(group==='海外')reached.overseas=true;
 }
 if(reached.town)max=Math.max(max,3);
 if(reached.near)max=Math.max(max,4);
 if(reached.national)max=Math.max(max,5);
 if(reached.overseas)max=Math.max(max,5);
 // Arrival, rumor and interest are not factual relationships. Overseas inquiries
 // identify the overseas destination; visits identify the visitor's origin.
 const events=Array.isArray(town?.events)?town.events:[];
 const overseasContact=events.some(e=>e&&(e.type==='inquiry'&&level.get(e.to)==='海外'||e.type==='visit'&&level.get(e.from)==='海外'));
 if(overseasContact)max=6;
 // Lab's long-range encounters may skip intermediate groups: lower viewpoints open as well.
 const activeShops=new Set();
 for(const relation of game?.shop?.relations??[]){if(relation?.shopId&&relation.status!=='declined')activeShops.add(relation.shopId);}
 return {max,reached,activeShops,firstSale,overseasContact,bottled};
}
// Reasons describe facts, including skipped viewpoints without inventing a local event.
export function mapIntroduction(game,stage){
 const p=mapProgress(game),events=receipts(game)?.events??[];
 if(stage===1)return p.bottled?'最初の一本ができました。':'蒸留所の地図です。';
 if(stage===2)return p.firstSale?'ウイスキーが届きました。':'近所の地図も見られます。';
 if(stage===3)return p.reached.town?'うわさが町に広がりました。':'町の地図も見られます。';
 if(stage===4)return p.reached.near?'うわさが周辺の地域に届きました。':'周辺の地図も見られます。';
 if(stage===5)return p.reached.national?'うわさが全国に届きました。':p.reached.overseas?'うわさが海外に届きました。':'日本の地図も見られます。';
 if(events.some(e=>e?.type==='inquiry'&&level.get(e.to)==='海外'))return '海外から問い合わせが届きました。';
 return p.overseasContact?'海外から訪問がありました。':'地球の地図です。';
}
// Fresh games have no introduction yet; legacy saves retain their seen viewpoint.
export function mapSeenBaseline(progress,stored,restored){
 if(!restored)return 0;
 if(Number.isInteger(stored?.shown)&&stored.shown>1&&stored.shown<=6)return stored.shown;
 if(!progress.bottled&&progress.max===1)return 0;
 if(Number.isInteger(stored?.shown)&&stored.shown>=0&&stored.shown<=6)return stored.shown;
 return restored?progress.max:0;
}
// Pure UI display boundary; no game or town-model mutation.
export const newlyUnlocked=(shown,max)=>Math.max(0,Math.min(6,max))>Math.max(0,Math.min(6,shown));
export const revealStart=(shown,max)=>Math.min(Math.max(1,shown),Math.max(1,max));
export function mapStep(current,direction,max){const n=clampStage(current)+(direction==='out'?1:-1);return Math.max(1,Math.min(clampStage(max),n));}
function marker(ctx,x,y,fill){const cell=(v)=>Math.floor(v/MAP_CELL)*MAP_CELL;const sx=cell(x),sy=cell(y);ctx.fillStyle='#27353b';ctx.fillRect(sx-2,sy-2,8,8);ctx.fillStyle=fill;ctx.fillRect(sx,sy,4,4);}
export function drawGameMap(canvas,game,stage,seenMax=1){
 const ctx=canvas.getContext('2d',{alpha:false});
 const progress=mapProgress(game);const safe=Math.min(clampStage(stage),Math.max(progress.max,clampStage(seenMax)));
 renderMap(ctx,safe);
 if(safe===2||safe===3){
  const pos=safe===2?{ 'town-liquor':[100,64],supermarket:[114,118]}:{'town-liquor':[31,69],supermarket:[117,99],department:[41,111]};
  for(const [shop,[x,y]] of Object.entries(pos))if(progress.activeShops.has(shop))marker(ctx,x,y,'#e6d49e');
 }else if(safe===4&&progress.reached.near){marker(ctx,88,40,'#e6d49e')}
 else if(safe===5&&progress.reached.national){marker(ctx,70,70,'#e6d49e')}
 return safe;
}
export {STAGES};
