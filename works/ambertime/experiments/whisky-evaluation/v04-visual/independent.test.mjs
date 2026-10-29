import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../v03/model.mjs';
import {sceneFor,renderScene,VARIANTS} from './scene.mjs';
import {visualTrace} from './timeline.mjs';

const step=(s,a)=>M.transact(s,a);
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const part of Object.values(value))freeze(part);}return value;};

test('independent review: dense stock remains fully accounted for beyond the finite drawing area',()=>{
 let s=M.create({seed:42});
 for(let i=0;i<3;i++){s=step(s,{type:'advance',months:1});s=step(s,{type:'next',sample:i===0?'smoke':i===1?'deep':'sweet',years:8,tier:'standard'});}
 // No bottles have been delivered yet, so all four physical lots can be stocked
 // together without inventing extra stock or making intermediate purchases.
 for(const p of s.sales.products){s=step(s,{type:'select',productId:p.id});s=step(s,{type:'place',shopId:'specialist',portion:'all'});s=step(s,{type:'confirm'});}
 const before=M.serialize(s),scene=sceneFor(s,'specialist');
 assert.equal(scene.stockCount,20);assert.equal(scene.current.length,20);
 assert.equal(scene.visibleCurrent.length,10);assert.equal(scene.hiddenStock,10);
 assert.deepEqual([...new Set(scene.current.map(x=>x.productId))],s.sales.products.map(x=>x.id));
 for(const variant of Object.keys(VARIANTS)){
  const markup=renderScene(scene,variant);
  assert.equal((markup.match(/data-kind="current"/g)??[]).length,10);
  assert.match(markup,/店頭 20本（描画10本・ほか10本）/);
  assert.match(markup,/data-stock-count="20"/);
  assert.equal((markup.match(/data-kind="memory"/g)??[]).length,0);
 }
 assert.equal(M.serialize(s),before);
});

test('independent review: all shop and visual projections accept frozen canonical replay states',()=>{
 const trace=visualTrace({seed:42,shopId:'bar',scenario:'D'});
 const s=freeze(trace.frames[8].session),before=M.serialize(s);
 for(const shop of M.SHOPS){
  const scene=freeze(sceneFor(s,shop.id));
  for(const variant of Object.keys(VARIANTS)){
   const markup=renderScene(scene,variant);
   for(const memory of scene.visibleMemories){
    const archived=s.relations[shop.id].archive.find(r=>r.productId===memory.productId);
    assert.ok(archived.sold>0&&archived.supportCount>0);
    assert.equal(memory.supportCount,archived.supportCount);
   }
   assert.match(markup,new RegExp(`data-shop="${shop.id}"`));
  }
 }
 assert.equal(M.serialize(s),before);
 assert.deepEqual(sceneFor(M.restore(before),'bar'),sceneFor(s,'bar'));
});
