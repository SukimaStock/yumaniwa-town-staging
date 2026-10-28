import test from 'node:test';
import assert from 'node:assert/strict';
import {computeViewport,layoutScene,projectRect,toLogical,hitTest,noticeLayout} from '../canvas-layout.mjs';
const sizes=[[360,740,1],[390,844,3],[360,640,2],[1024,768,2],[1280,900,1],[390,430,3]];
test('letterboxed viewport keeps shape and inverse input mapping, including viewport offset',()=>{
 for(const [width,height,dpr] of sizes){const v=computeViewport({width,height,dpr,left:17,top:31});assert(v.offsetX>=0&&v.offsetY>=0);assert(Math.abs(360*v.scale+2*v.offsetX-width)<1e-8);assert(Math.abs(640*v.scale+2*v.offsetY-height)<1e-8);
  for(const point of [{x:0,y:0,w:1,h:1},{x:180,y:320,w:1,h:1},{x:360,y:640,w:1,h:1}]){const p=projectRect(v,point),q=toLogical(v,p.x+17,p.y+31);assert(Math.abs(q.x-point.x)<1e-8);assert(Math.abs(q.y-point.y)<1e-8);}
 }
});
test('all room controls fit the scene, and physical centers resolve to drawn targets',()=>{
 for(const room of ['distill','warehouse','sales']){const layout=layoutScene({room,casks:[{id:1},{id:2},{id:3},{id:4}],products:[{id:8},{id:9},{id:10},{id:11}]});for(const r of layout.controls){assert(r.x>=0&&r.y>=0&&r.x+r.w<=360&&r.y+r.h<=640);for(const [width,height,dpr] of sizes){const v=computeViewport({width,height,dpr}),p=projectRect(v,r),q=toLogical(v,p.x+p.width/2,p.y+p.height/2);const hit=hitTest(layout.controls.filter(x=>!['start-distill','stop-distill','open-fill'].includes(x.key)||x.key===r.key),q.x,q.y);assert.equal(hit?.key,r.key);if(height>=640)assert(p.height>=44);}}}
});
test('room furniture remains fixed for empty and full shelves and transient windows',()=>{
 for(const room of ['warehouse','sales']){const empty=layoutScene({room}),full=layoutScene({room,casks:[{id:4},{id:8},{id:12},{id:19}],products:[{id:7}],modal:'tasting'});for(const key of ['shelf','floorY','caskSlots','productSlots'])assert.deepEqual(empty[key],full[key]);assert.equal(hitTest(empty.controls,-1,-1),null);}
});

test('notice windows center variable measured widths and wrap within scene',()=>{
 const measure=t=>Array.from(t).length*20,short=noticeLayout('ビン詰め 10本',measure),long=noticeLayout('長い出来事の表示を画面幅の内側で折り返して表示します'.repeat(3),measure);
 for(const n of [short,long]){assert.equal(n.x+n.w/2,180);assert(n.x>=12&&n.x+n.w<=348);assert(n.lines.every(t=>measure(t)<=318));assert.equal(n.h,n.padding*2+n.lines.length*n.step);assert(n.y+n.h<=514);}
 assert(short.w<long.w);assert(long.lines.length>1);
});

test('native market owns sales content without invisible old product/page/feedback hits',()=>{
 const legacy=layoutScene({room:'sales',products:[{id:8}],feedback:true});
 assert(legacy.controls.some(c=>c.key==='product-8'));
 const market=layoutScene({room:'sales',marketMode:true,products:[{id:8}],feedback:true});
 assert(!market.controls.some(c=>/^(product-|shelf-)|room-feedback|start-distill|stop-distill|open-fill/.test(c.key)));
 for(const key of ['toggle-time','room-distill','room-warehouse','room-sales','shop-offer','open-ledger','open-aux-menu'])assert(market.controls.some(c=>c.key===key),key);
 const board={x:12,y:99,w:336,h:417};
 for(const c of market.controls)assert(c.x+c.w<=board.x||c.x>=board.x+board.w||c.y+c.h<=board.y||c.y>=board.y+board.h,`native control ${c.key} overlaps market board`);
});
