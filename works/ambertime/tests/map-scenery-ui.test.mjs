import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as D from '../partner-orders.mjs';
import {mapSceneryProjection} from '../map-scenery.mjs';
import {drawMapScenery,mapSceneryButterflies,sceneryLayout,syncSceneryLayer,installSceneryMotion} from '../map-scenery-view.mjs';
import {renderMap} from '../experiments/world-map/v01/map.mjs';
import {mapObservationBounds,mapProgress} from '../world-map-view.mjs';
import {mapPartnerProjection} from '../map-partners.mjs';
import {dailyMapProjection} from '../map-daily-view.mjs';
import {naturalDeliveryFixture} from './regional-delivery-helpers.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
function basePixels(stage){
 const pixels=new Map(),ctx={fillStyle:'',fillRect(x,y,w,h){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)pixels.set(xx+','+yy,this.fillStyle);}};
 renderMap(ctx,stage);return pixels;
}
function drawing(scenery){
 const rectangles=[],ctx={fillStyle:'',fillRect(x,y,w,h){rectangles.push({x,y,w,h,color:this.fillStyle});}};
 drawMapScenery(ctx,scenery);return rectangles;
}
const overlaps=(a,b)=>a.x<b[0]+b[2]&&a.x+a.w>b[0]&&a.y<b[1]+b[3]&&a.y+a.h>b[1];
const layer=()=>({dataset:{},writes:0,markup:'',set innerHTML(v){this.writes++;this.markup=v;},get innerHTML(){return this.markup;},setAttribute(k,v){this[k]=v;}});

test('scenery sprites follow source2px grass anchors without covering authored buildings or selection brackets',()=>{
 const grass=new Set(['#87996b','#738a62','#9caa78']);
 for(const stage of [2,3,4]){
  // Explicit presentation-only fixture exercising every sprite, not formal history.
  const bounds=mapObservationBounds(stage),partners=Object.entries(bounds).filter(([id])=>id!=='retail').map(([id,bounds])=>({id,bounds,box:true,flowerStage:2,butterfly:true}));
  const scenery={stage,partners},pixels=basePixels(stage),rects=drawing(scenery);assert(rects.length>0);
  for(const p of partners){
   const a=sceneryLayout(p,stage);assert(a);assert.deepEqual(a,sceneryLayout(p,stage));
   for(const point of [a.box,...a.flowers,a.butterfly])assert(point.every(n=>Number.isInteger(n)&&n%2===0));
   // The 6x4 wing sprite moves at most2 source pixels, an8x6 envelope.
   const [bx,by]=a.butterfly;
   for(let y=by;y<by+6;y++)for(let x=bx;x<bx+8;x++)assert(grass.has(pixels.get(x+','+y)),JSON.stringify({stage,id:p.id,butterfly:[x,y]}));
  }
  for(const r of rects){
   assert([r.x,r.y,r.w,r.h].every(n=>Number.isInteger(n)&&n%2===0));assert(r.x>=0&&r.y>=0&&r.x+r.w<=144&&r.y+r.h<=144);
   for(const box of Object.values(bounds)){const expanded=[box[0]-2,box[1]-2,box[2]+4,box[3]+4];assert.equal(overlaps(r,expanded),false,JSON.stringify({stage,r,expanded}));}
   for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)assert(grass.has(pixels.get(x+','+y)),JSON.stringify({stage,x,y,base:pixels.get(x+','+y)}));
  }
 }
});

test('unknown or absent partners create no decoration and background flowers retain their own provenance',()=>{
 for(const stage of [1,5,6]){
  assert.equal(sceneryLayout({id:'trial-region-desk'},stage),null);assert.deepEqual(drawing({stage,partners:[]}),[]);assert.equal(mapSceneryButterflies({stage,partners:[]}),'');
 }
 assert.equal(sceneryLayout({id:'missing'},3),null);
 assert.deepEqual(drawing({stage:3,partners:[{id:'missing',box:true,flowerStage:2,butterfly:true}]}),[]);
 const offer={stage:4,partners:[{id:'trial-region-desk',box:false,flowerStage:0,butterfly:false}]};assert.deepEqual(drawing(offer),[]);assert.equal(mapSceneryButterflies(offer),'');
 const unknown={stage:4,partners:[{id:'trial-region-desk',box:true,flowerStage:null,butterfly:false}]};assert.equal(drawing(unknown).length,4,'unknown continuity cannot create relation flowers');
 assert.deepEqual(basePixels(1),basePixels(1),'authored background flowers remain unchanged by scenery projection');
});

test('butterfly layers cache unchanged markup but move with scope and stop with closed or hidden maps',()=>{
 const pin={id:'town-liquor',butterfly:true},a={stage:2,partners:[pin],motionKey:'same-partner'},b={stage:3,partners:[pin],motionKey:'same-partner'},target=layer();
 syncSceneryLayer(target,a,true);assert.equal(target.writes,1);assert.equal(target.dataset.active,'true');assert.equal(target['aria-hidden'],'true');
 const first=target.innerHTML;syncSceneryLayer(target,a,true);assert.equal(target.writes,1);
 syncSceneryLayer(target,b,true);assert.equal(target.writes,2);assert.notEqual(target.innerHTML,first,'same partner needs stage-specific butterfly coordinates');
 syncSceneryLayer(target,b,false);assert.equal(target.writes,2);assert.equal(target.dataset.active,'false');
 syncSceneryLayer(target,{stage:3,partners:[],motionKey:'none'},true);assert.equal(target.innerHTML,'');
 const events=[],doc={hidden:false,documentElement:{dataset:{}},addEventListener:(event,fn)=>events.push([event,fn])};installSceneryMotion(doc);installSceneryMotion(doc);assert.equal(events.length,1);assert.equal(events[0][0],'visibilitychange');assert.equal(doc.documentElement.dataset.sceneryHidden,'false');
 doc.hidden=true;events[0][1]();assert.equal(doc.documentElement.dataset.sceneryHidden,'true');doc.hidden=false;events[0][1]();assert.equal(doc.documentElement.dataset.sceneryHidden,'false');
 const css=read('m0-observation.css');assert.match(css,/pointer-events:none/);assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/scenery-hidden/);assert.match(css,/data-active/);
 assert.doesNotMatch(read('map-scenery-view.mjs'),/setInterval|setTimeout|requestAnimationFrame/,'no butterfly-only timer or animation engine');
});

test('both maps use identical natural seed3/6 scenery and existing saved bytes stay exact',()=>{
 for(const seed of [3,6]){
  const s=naturalDeliveryFixture(seed),raw=D.serializeDistillery(s);
  for(let stage=1;stage<=6;stage++){
   const projection=mapPartnerProjection(s,stage),scenery=mapSceneryProjection(s,stage,projection),daily=dailyMapProjection(s,stage);
   assert.deepEqual(daily.scenery,scenery);
   assert.deepEqual(drawing(scenery),drawing(daily.scenery));assert.equal(mapSceneryButterflies(scenery),mapSceneryButterflies(daily.scenery));
  }
  assert.equal(D.serializeDistillery(s),raw);const restored=D.restoreDistillery(raw);assert.deepEqual(dailyMapProjection(restored,4).scenery,dailyMapProjection(s,4).scenery);
 }
});

test('production M0 paint cache invalidates only static scenery while recent activity updates CSS layer',()=>{
 const source=read('m0-observation.mjs'),block=source.slice(source.indexOf(' function syncMap(){'),source.indexOf('  const bounds=mapObservationBounds',source.indexOf(' function syncMap(){')))+'\n }';
 assert.match(block,/scenery\.staticKey/);assert.match(block,/syncSceneryLayer/);
 let current=naturalDeliveryFixture(3),draws=0,lastMotion=null,viewState={box:true,flowers:0,butterfly:true};
 const sandbox={stage:4,state:()=>current,mapProgress,mapPartnerProjection,mapSceneryProjection:()=>({staticKey:JSON.stringify([viewState.box,viewState.flowers]),motionKey:String(viewState.butterfly)}),drawGameMap:()=>draws++,canvas:{},syncSceneryLayer:(_layer,p,active)=>{lastMotion={key:p.motionKey,active};},sceneryLayer:{}};
 vm.runInNewContext('let paintKey="",mode="half",closing=false,opening=false;'+block+';globalThis.run=syncMap;globalThis.close=()=>{mode="closed";};',sandbox);
 sandbox.run();assert.equal(draws,1);sandbox.run();assert.equal(draws,1);
 viewState.butterfly=false;sandbox.run();assert.equal(draws,1);assert.equal(lastMotion.key,'false');
 viewState.flowers=1;sandbox.run();assert.equal(draws,2);sandbox.run();assert.equal(draws,2);
 sandbox.close();sandbox.run();assert.equal(draws,2);assert.equal(lastMotion.active,false);
 // Daily-map production source includes the same static signature in its cache.
 const app=read('shop-app.mjs'),paint=app.match(/ if\(kind==='world-map'\)\{const canvas=.*\n/)?.[0];assert(paint,'daily map paint block remains available');assert.match(paint,/mapScenery\?\.staticKey/);
 const dailyCanvas={dataset:{}},daily={kind:'world-map',game:current,worldMapStage:4,modal:{source:'direct'},document:{hidden:false},mapScenery:{staticKey:'flowers0',motionKey:'active'},mapProgress,drawGameMap:()=>4,mapNoticeSave(){},mapShown:0,$:()=>dailyCanvas};
 vm.runInNewContext('globalThis.paint=()=>{'+paint+'};',daily);daily.paint();assert.equal(dailyCanvas.dataset.mapDraws,'1');daily.paint();assert.equal(dailyCanvas.dataset.mapDraws,'1');
 daily.mapScenery={staticKey:'flowers0',motionKey:'inactive'};daily.paint();assert.equal(dailyCanvas.dataset.mapDraws,'1');daily.mapScenery={staticKey:'flowers1',motionKey:'inactive'};daily.paint();assert.equal(dailyCanvas.dataset.mapDraws,'2');
});
