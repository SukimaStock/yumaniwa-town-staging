import test from 'node:test';import assert from 'node:assert/strict';
import {retailSalePlan} from '../retail-sale-motion.mjs';
const geometry=Object.freeze({from:Object.freeze({x:273,y:219}),to:Object.freeze({x:63,y:222})});
const translation=frame=>frame.transform.match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.]+)\)/).slice(1).map(Number);
test('one to three sales use one bottle per unit; larger counts have at most four groups',()=>{
 for(const count of [1,2,3,4,5,17,100000,Number.MAX_SAFE_INTEGER]){
  const plans=retailSalePlan(count,geometry);assert.equal(plans.length,Math.min(4,count));
  assert.equal(plans.reduce((n,p)=>n+p.units,0),count);assert(plans.every(p=>Number.isSafeInteger(p.units)&&p.units>0));
  if(count<=3)assert(plans.every(p=>p.units===1));
  for(const p of plans)assert(p.duration>=150&&p.duration<=250);
  const total=Math.max(...plans.map(p=>p.delay+p.duration));
  if(count>=4)assert(total>=500&&total<=700);else assert(total<=350);
 }
});
test('plans are deterministic, input-independent fresh objects with no model side effects',()=>{
 const before=JSON.stringify(geometry),first=retailSalePlan(7,geometry),second=retailSalePlan(7,geometry);
 assert.deepEqual(first,second);assert.notEqual(first[0].frames,second[0].frames);
 first[0].frames[0].opacity=.2;assert.equal(second[0].frames[0].opacity,1);assert.equal(JSON.stringify(geometry),before);
});
test('every frame holds a grid-snapped translation with three shrinking stages and no flash',()=>{
 for(const grid of [3,6])for(const from of [{x:273.4,y:219.2},{x:60,y:220}]){
  const to={x:63.1,y:212.7},plans=retailSalePlan(3,{from,to,grid});
  for(const {frames} of plans){
   assert.deepEqual([...new Set(frames.map(f=>translation(f)[2]))],[1,.75,.5]);
   assert.deepEqual(frames.map(f=>f.offset),[0,.125,.25,.375,.5,.625,.75,.875,1]);
   for(const frame of frames){const [x,y]=translation(frame);assert(Math.abs(x/grid-Math.round(x/grid))<1e-10);assert(Math.abs(y/grid-Math.round(y/grid))<1e-10);assert.equal(frame.easing,'steps(1,end)');}
   assert.deepEqual(translation(frames[0]),[0,0,1]);const [x,y]=translation(frames.at(-1));
   assert(Math.abs(from.x+x-to.x)<=grid/2);assert(Math.abs(from.y+y-to.y)<=grid/2);
   assert.deepEqual(translation(frames.at(-2)),translation(frames.at(-1)),'last visible pose arrives at the shop before disappearing');
   assert(frames.slice(0,-1).every(f=>f.opacity===1));assert.equal(frames.at(-1).opacity,0);
  }
 }
});
test('invalid or zero sales and invalid geometry never create ghosts',()=>{
 for(const count of [0,-1,1.1,NaN,Infinity,'2',Number.MAX_SAFE_INTEGER+1])assert.deepEqual(retailSalePlan(count,geometry),[]);
 for(const options of [undefined,{}, {from:{x:0,y:0},to:{x:NaN,y:2}}, {...geometry,grid:0}, {...geometry,grid:-3}])assert.deepEqual(retailSalePlan(1,options),[]);
});

test('global sale groups preserve product artwork and units without a per-product flight burst',async()=>{
 const {retailSaleGroups}=await import('../retail-sale-motion.mjs');
 for(const sales of [
  [{productId:'a',units:1}],
  [{productId:'a',units:2},{productId:'b',units:1}],
  [{productId:'a',units:4}],
  [{productId:'a',units:27},{productId:'b',units:3}],
  Array.from({length:6},(_,i)=>({productId:`release-${i}`,units:i+1})),
  [{productId:1,units:1000000},{productId:2,units:5000000}]
 ]){
  const bytes=JSON.stringify(sales),groups=retailSaleGroups(sales),total=sales.reduce((n,s)=>n+s.units,0);
  assert.deepEqual(groups,retailSaleGroups(sales));assert.equal(JSON.stringify(sales),bytes);
  assert.equal(groups.length,total<=3?total:Math.max(4,sales.length));
  for(const sale of sales)assert.equal(groups.filter(g=>g.productId===sale.productId).reduce((n,g)=>n+g.units,0),sale.units);
  assert(groups.every(g=>g.units>0&&Number.isSafeInteger(g.units)&&g.duration===210));
  assert.deepEqual(new Set(groups.map(g=>g.productId)),new Set(sales.map(s=>s.productId)));
  assert.equal(groups[0].delay,0);assert.equal(groups.at(-1).delay+210,total<=3?210+45*(total-1):600);
 }
});
test('global allocation filters invalid entries and stays bounded for many sales',async()=>{
 const {retailSaleGroups}=await import('../retail-sale-motion.mjs');
 for(const invalid of [null,{},[],[{productId:'a',units:0}],[{units:3}],[{productId:'a',units:Infinity}]])assert.deepEqual(retailSaleGroups(invalid),[]);
 const sales=[{productId:'valid',units:5},{productId:'bad',units:-1},null],groups=retailSaleGroups(sales);
 assert.equal(groups.length,4);assert(groups.every(g=>g.productId==='valid'));assert.equal(groups.reduce((n,g)=>n+g.units,0),5);
 const many=Array.from({length:100},(_,i)=>({productId:i,units:1000000}));assert.equal(retailSaleGroups(many).length,100);
});
