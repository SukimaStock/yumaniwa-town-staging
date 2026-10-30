import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../v03/model.mjs';
import {visualTrace} from '../v04-visual/timeline.mjs';
import {renderMap,SIZE,MAP_CELL} from '../../world-map/v01/map.mjs';
import {mapFor,pinsMarkup,paintMap,markerRects,PIN_POSITIONS,VARIANTS,LEGEND} from './map.mjs';
const place=(s,shopId='bar',portion='all')=>M.transact(M.transact(s,{type:'place',shopId,portion}),{type:'confirm'});
const deepFreeze=o=>{if(o&&typeof o==='object'){Object.freeze(o);for(const x of Object.values(o))deepFreeze(x);}return o;};
function canvas(){const ops=[],ctx={fillStyle:'',imageSmoothingEnabled:true,fillRect(x,y,w,h){ops.push({x,y,w,h,color:this.fillStyle});}};return {width:0,height:0,getContext:()=>ctx,ops,ctx};}

test('available shops and unconfirmed drafts do not create handling pins or positive reports',()=>{
 let s=M.create();assert.deepEqual(mapFor(s).pins,[]);
 s=M.transact(s,{type:'place',shopId:'bar',portion:'all'});assert.deepEqual(mapFor(s).pins,[]);
 s=M.transact(s,{type:'cancel'});assert.deepEqual(mapFor(s).pins,[]);
 s=place(s);const pin=mapFor(s).pins[0];assert.equal(pin.id,'bar');assert.equal(pin.sold,0);assert.equal(pin.remaining,5);assert.equal(pin.positiveCount,0);assert.equal(pin.buyerPositive,null);assert.equal(pin.pastMemory,null);assert.equal(pin.change,'店頭あり');
});

test('cumulative sales and present inventory aggregate every product and survive recall/reallocation without duplicated sales',()=>{
 let s=place(M.create({seed:42}));s=M.transact(s,{type:'advance',months:1});const first=mapFor(s).pins[0];
 assert.equal(first.sold+first.remaining,5);
 if(first.remaining)s=M.transact(s,{type:'recall',shopId:'bar',productId:s.sales.selectedId});
 const sold=mapFor(s).pins[0].sold;assert.equal(mapFor(s).pins[0].remaining,0);
 if(M.freeHand(s,s.sales.selectedId)){s=place(s);assert.equal(mapFor(s).pins[0].sold,sold);}
 s=M.transact(s,{type:'next',sample:'smoke',years:20,tier:'standard'});s=place(s);
 const pin=mapFor(s).pins[0],rows=s.sales.products.map(p=>M.productSummary(s,p.id).byShop.find(r=>r.shopId==='bar'));
 assert.equal(pin.sold,rows.reduce((n,r)=>n+r.sold,0));assert.equal(pin.remaining,rows.reduce((n,r)=>n+r.remaining,0));assert.ok(pin.remaining>=5);assert.equal(pin.currentProducts.reduce((n,p)=>n+p.remaining,0),pin.remaining);assert.equal(pin.reportProductId,s.sales.selectedId);assert.equal(pin.reportProduct.sold,0);assert.equal(pin.buyerPositive,null);
 assert.equal(mapFor(s).legend,LEGEND);assert.match(LEGEND,/開始からの累計/);assert.match(LEGEND,/現在/);
});

test('negative-only real purchases never produce a favorable mark, and other stores never inherit their reports',()=>{
 let found=null;
 for(let seed=1;seed<=20&&!found;seed++){
  const trace=visualTrace({seed,shopId:'diner',scenario:'A'});
  found=trace.frames.find(f=>{const p=mapFor(f.session).pins.find(x=>x.id==='diner');return p?.sold>0&&!p.positiveCount;});
 }
 assert.ok(found);const map=mapFor(found.session),pin=map.pins[0];assert.equal(pin.id,'diner');assert.equal(pin.buyerPositive,null);assert.notEqual(pin.marker,'positive');assert.notEqual(pin.change,'好む客');assert.equal(map.pins.some(x=>x.id==='bar'),false);
 const text=JSON.stringify(pin);for(const field of ['ageInterest','priority','target','fit','support','expectationWeight'])assert.equal(Object.hasOwn(pin,field),false,field);assert.ok(text.length>0);
});

test('historical snapshots use only reports and memories available at that release, including revival and long gaps',()=>{
 const trace=visualTrace({seed:42,shopId:'bar',scenario:'D'}),first=trace.frames[0].session,before=M.serialize(first);
 assert.equal(mapFor(first).pins[0].sold,0);assert.equal(mapFor(first).pins[0].pastMemory,null);assert.equal(mapFor(first).pins[0].positiveCount,0);
 const delivery=trace.frames[8].session,pin=mapFor(delivery).pins[0];assert.equal(pin.reportProduct.sold,0);assert.equal(pin.reportProduct.evaluationCount,0);assert.equal(pin.buyerPositive,null);
 if(pin.pastMemory){assert.notEqual(pin.pastMemory.productId,pin.reportProductId);assert.ok(pin.pastMemory.sold>0);assert.ok(pin.pastMemory.lastSale<=delivery.sales.month);}
 for(const e of pin.expectationExamples){const r=delivery.relations.bar.archive.find(r=>r.productId===e.productId);assert.ok(r.sold>0&&r.supportCount>0);}
 const final=trace.state,gap=M.transact(final,{type:'wait',months:120});assert.equal(mapFor(gap).pins[0].sold,mapFor(final).pins[0].sold);assert.equal(mapFor(gap).pins[0].remaining,0);assert.deepEqual(mapFor(gap).pins[0].pastMemory,mapFor(final).pins[0].pastMemory);assert.equal(M.serialize(first),before);
});

test('viewpoint and all three visual choices are read-only, deterministic and preserve native background painting',()=>{
 const session=deepFreeze(visualTrace({seed:42,shopId:'bar',scenario:'D'}).frames[8].session),before=M.serialize(session);
 for(const stage of [2,3]){
  const projection=deepFreeze(mapFor(session,stage));assert.deepEqual(mapFor(session,stage),projection);const native=canvas();renderMap(native.ctx,stage);
  for(const variant of Object.keys(VARIANTS)){
   const c=canvas();assert.equal(paintMap(c,projection,variant,'bar'),stage);assert.equal(c.width,SIZE);assert.equal(c.height,SIZE);assert.deepEqual(c.ops.slice(0,native.ops.length),native.ops);assert.equal(c.ctx.imageSmoothingEnabled,false);
   const html=pinsMarkup(projection,variant,'bar');assert.equal((html.match(/data-map-shop=/g)??[]).length,projection.pins.length);assert.match(html,/data-map-shop="bar"/);assert.equal((html.match(/data-map-badge=/g)??[]).length,variant==='symbols'?0:projection.pins.length);
  }
 }
 assert.equal(M.serialize(session),before);assert.throws(()=>mapFor(session,4));assert.throws(()=>pinsMarkup(mapFor(session),'unknown'));
});

test('native-cell marker centers and percent hit anchors agree, with room for forty-four pixel targets at both sizes',()=>{
 let s=M.create();for(const shop of M.SHOPS){s=M.transact(s,{type:'place',shopId:shop.id,portion:'1'});}s=M.transact(s,{type:'confirm'});
 for(const stage of [2,3]){
  const map=mapFor(s,stage);
  for(const p of map.pins){assert.deepEqual([p.x,p.y],PIN_POSITIONS[stage][p.id]);const outer=markerRects(p)[0];assert.equal(outer.x+outer.w/2,p.x);assert.equal(outer.y+outer.h/2,p.y);for(const r of markerRects(p,true))for(const key of ['x','y','w','h'])assert.equal(r[key]%MAP_CELL,0);}
  for(const width of [216,288])for(const p of map.pins){const x=p.x/SIZE*width,y=p.y/SIZE*width;assert.ok(x-22>=0&&x+22<=width);assert.ok(y-22>=0&&y+22<=width);for(const q of map.pins.filter(q=>q.id!==p.id)){const qx=q.x/SIZE*width,qy=q.y/SIZE*width;assert.ok(Math.abs(x-qx)>=44||Math.abs(y-qy)>=44);}}
 }
});
