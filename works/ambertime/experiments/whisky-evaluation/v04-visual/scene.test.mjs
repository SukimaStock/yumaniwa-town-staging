import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../v03/model.mjs';
import {traceScenario} from '../v03/scenarios.mjs';
import {codeaBottle} from '../../../codea-object-art.mjs';
import {sceneFor,renderScene,VARIANTS} from './scene.mjs';

const act=(s,...actions)=>actions.reduce((state,a)=>M.transact(state,a),s);
const deliver=(s,shopId='bar')=>act(s,{type:'place',shopId,portion:'all'},{type:'confirm'});
const purchased=()=>act(deliver(M.create()),{type:'advance',months:3});
const countKind=(html,kind)=>(html.match(new RegExp(`data-kind="${kind}"`,'g'))??[]).length;

test('draft and actual inventory have separate sources; cancelled or unconsumed deliveries create no positive record',()=>{
 let s=M.create();let scene=sceneFor(s);assert.equal(scene.stockCount,0);assert.equal(scene.memories.length,0);
 s=act(s,{type:'place',shopId:'bar',portion:'all'});scene=sceneFor(s);assert.equal(scene.stockCount,0);assert.equal(scene.draftCount,5);assert.equal(scene.memories.length,0);
 assert.equal(countKind(renderScene(scene),'current'),0);assert.equal(countKind(renderScene(scene),'draft'),5);
 s=act(s,{type:'cancel'});assert.equal(sceneFor(s).draftCount,0);
 s=deliver(s);scene=sceneFor(s);assert.equal(scene.stockCount,5);assert.equal(scene.current.length,5);assert.equal(scene.draftCount,0);assert.equal(scene.memories.length,0);assert.equal(countKind(renderScene(scene),'current'),5);
});

test('sales and recalls remove real bottles exactly without removing archived positive evidence',()=>{
 let s=deliver(M.create());s=act(s,{type:'advance',months:1});let scene=sceneFor(s),p=s.sales.products[0];
 assert.equal(scene.stockCount,p.shops.bar);assert.equal(scene.stockCount+p.sold,5);
 if(p.shops.bar)s=act(s,{type:'recall',productId:p.id,shopId:'bar'});
 scene=sceneFor(s);assert.equal(scene.stockCount,0);assert.equal(countKind(renderScene(scene),'current'),0);
 assert.equal(scene.memories.length,s.relations.bar.archive.filter(r=>r.supportCount>0&&r.sold>0).length);
});

test('all products contribute real bottles; draft shares free slots without overlapping stock',()=>{
 let s=act(deliver(M.create({seed:1}),'diner'),{type:'advance',months:1},{type:'next',sample:'smoke',years:20,tier:'high'});
 s=act(s,{type:'place',shopId:'diner',portion:'all'});const scene=sceneFor(s,'diner');
 assert.equal(scene.stockCount,s.sales.products.reduce((n,p)=>n+p.shops.diner,0));assert.equal(scene.draftCount,5);
 assert.ok(scene.visibleCurrent.length+scene.visibleDraft.length<=10);
 s=act(s,{type:'confirm'});const next=sceneFor(s,'diner');assert.equal(next.stockCount,scene.stockCount+5);assert.equal(next.draftCount,0);
});

test('memory cards cite actual positive purchases only and stay independent between stores',()=>{
 const s=purchased(),scene=sceneFor(s);assert.ok(scene.memories.length>0);
 for(const memory of scene.memories){const record=s.relations.bar.archive.find(r=>r.productId===memory.productId);assert.ok(record.sold>0&&record.supportCount>0);assert.equal(memory.supportCount,record.supportCount);}
 for(const id of ['diner','specialist']){const untouched=sceneFor(s,id);assert.equal(untouched.stockCount,0);assert.equal(untouched.memories.length,0);}
 const html=renderScene(scene);assert.match(html,/現物在庫ではありません/);assert.match(html,/data-kind="memory"[^>]*data-bottle-count="0"/);
});

test('a bad or neutral-only real purchase is never promoted into a positive memory',()=>{
 let checked=0;
 for(let seed=1;seed<=25;seed++){
  let s=act(M.create({seed}),{type:'advance',months:1},{type:'next',sample:'smoke',years:20,tier:'standard'});
  s=act(deliver(s,'diner'),{type:'advance',months:6});const scene=sceneFor(s,'diner');
  for(const record of s.relations.diner.archive.filter(r=>r.sold>0&&r.supportCount===0)){checked++;assert.ok(!scene.memories.some(m=>m.productId===record.productId));}
 }
 assert.ok(checked>0,'real fixed seeds must include non-positive purchases');
});

test('matching old positive recipe connects only after a new bottle is staged or stocked',()=>{
 let s=purchased();s=act(s,{type:'next',sample:'balanced',years:8,tier:'standard'});
 assert.equal(sceneFor(s).links.length,0);
 s=act(s,{type:'place',shopId:'bar',portion:'all'});let scene=sceneFor(s);assert.equal(scene.links.length,1);assert.equal(scene.links[0].productId,2);assert.equal(scene.links[0].priorProductId,1);
 s=act(s,{type:'confirm'});scene=sceneFor(s);assert.equal(scene.links.length,1);
 for(const variant of Object.keys(VARIANTS))assert.match(renderScene(scene,variant),/data-prior-product-id="1"/);
});

test('all three bar alternatives use the same state and native bottle SVG without changing the model or save',()=>{
 const s=deliver(M.create()),before=M.serialize(s),scene=sceneFor(s),strings=Object.keys(VARIANTS).map(v=>renderScene(scene,v));
 assert.equal(new Set(strings).size,3);for(const html of strings){assert.equal(countKind(html,'current'),5);assert.equal(countKind(html,'memory'),0);assert.ok(html.includes(codeaBottle('standard',{label:'cream',priceTier:'standard'})));assert.match(html,/shape-rendering="crispEdges"/);}
 assert.equal(M.serialize(s),before);assert.deepEqual(sceneFor(M.restore(before)),scene);assert.equal(renderScene(scene),renderScene(sceneFor(s)));
});

test('years without trade fade current expectation marks while permanent positive record facts remain',()=>{
 let s=purchased();for(const p of s.sales.products)if(p.shops.bar)s=act(s,{type:'recall',productId:p.id,shopId:'bar'});
 const before=sceneFor(s);s=act(s,{type:'wait',months:120});const after=sceneFor(s);
 assert.ok(after.expectationStrength<before.expectationStrength);assert.equal(after.stockCount,0);
 assert.deepEqual(after.memories.map(({expectationWeight,...facts})=>facts),before.memories.map(({expectationWeight,...facts})=>facts));
 assert.ok(after.visibleMemories[0].connectionStrength<before.visibleMemories[0].connectionStrength);
});

test('all four fixed scenario histories reproduce scene facts, cap records explicitly and keep intrinsic data untouched',()=>{
 for(const scenario of ['A','B','C','D']){
  const s=traceScenario({seed:42,shopId:'bar',scenario}).state,before=JSON.stringify(s),scene=sceneFor(s);
  assert.equal(scene.visibleMemories.length+scene.hiddenMemoryCount,scene.memories.length);assert.ok(scene.visibleMemories.length<=3);
  for(const v of Object.keys(VARIANTS)){const html=renderScene(scene,v);assert.equal(countKind(html,'current'),scene.visibleCurrent.length);assert.equal(countKind(html,'memory'),scene.visibleMemories.length);if(scene.hiddenMemoryCount)assert.match(html,new RegExp(`ほか${scene.hiddenMemoryCount}件`));}
  assert.equal(JSON.stringify(s),before);assert.deepEqual(sceneFor(M.restore(M.serialize(s))),scene);
 }
});

test('each store has distinct furniture composition in all three alternatives with intact stock and record facts',()=>{
 const variants=Object.keys(VARIANTS),rendered=new Map();
 for(const shopId of ['diner','bar','specialist']){
  let s=deliver(M.create({seed:42}),shopId),scene=sceneFor(s,shopId);
  for(const variant of variants){
   const html=renderScene(scene,variant);rendered.set(shopId+variant,html);
   assert.equal(countKind(html,'current'),5);assert.equal(countKind(html,'memory'),0);assert.match(html,new RegExp(`data-shop="${shopId}"`));
   for(const match of html.matchAll(/data-kind="(?:current|draft|memory)"[^>]*transform="translate\((\d+) (\d+)\)"/g)){
    const [x,y]=match.slice(1).map(Number);assert.ok(x>=0&&x+12<=160);assert.ok(y>=0&&y+12<=54);
   }
  }
  s=act(s,{type:'advance',months:6});scene=sceneFor(s,shopId);
  for(const variant of variants){const html=renderScene(scene,variant);assert.equal(countKind(html,'current'),scene.stockCount);assert.equal(countKind(html,'memory'),scene.visibleMemories.length);}
 }
 for(const variant of variants){const three=['diner','bar','specialist'].map(id=>rendered.get(id+variant).replace(/data-shop="[^"]*"/g,'').replace(/aria-label="[^"]*"/g,''));assert.equal(new Set(three).size,3);}
});
