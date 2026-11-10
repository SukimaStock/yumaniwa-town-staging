import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REACTION_STEPS,REACTION_KINDS,drawableShop,reactionPatches,paintReaction} from './pixel-reaction.mjs';
const rect=shop=>shop==='town-liquor'?[86,44,16,16]:[98,92,16,16];

test('exact three distinct architectural reactions are supported',()=>{
 assert.deepEqual(REACTION_KINDS.map(k=>k.id),['eaves','window','door']);
 assert.equal(REACTION_STEPS,6);
});
test('only existing authored shop sprites can be changed',()=>{
 assert.equal(drawableShop('town-liquor'),true);
 assert.equal(drawableShop('supermarket'),true);
 for(const id of ['bar','retail','department','diner',null,'']){
  assert.equal(drawableShop(id),false);
  assert.deepEqual(reactionPatches('window',id,6),[]);
 }
});
test('all patches are aligned on 2x2 grid and remain within existing 16x16 shop sprite',()=>{
 for(const id of ['town-liquor','supermarket']){
  const [x,y,w,h]=rect(id);
  for(const type of REACTION_KINDS){
   for(let step=0;step<=REACTION_STEPS;step++){
    for(const p of reactionPatches(type.id,id,step)){
     for(const q of ['x','y','w','h']) assert.equal(p[q]%2,0,JSON.stringify({id,type,step,p}));
     assert(p.x>=x&&p.y>=y&&p.x+p.w<=x+w&&p.y+p.h<=y+h);
     assert.match(p.color,/^#[0-9a-f]{6}$/i);
    }
   }
  }
 }
});
test('eaves recolor forms one continuous solid strip, not a dotted line',()=>{
 for(let i=1;i<=6;i++){
  const p=reactionPatches('eaves','town-liquor',i)[0];
  assert.equal(p.x,88);assert.equal(p.w,i*2);assert.equal(p.h,2);
 }
});
test('effects settle into one final appearance with no blinking or repeated pulse',()=>{
 for(const kind of REACTION_KINDS){
  assert.deepEqual(reactionPatches(kind.id,'town-liquor',0),[]);
  assert.deepEqual(reactionPatches(kind.id,'town-liquor',6),reactionPatches(kind.id,'town-liquor',99));
 }
});
test('overlay paint clears the native 144x144 source without drawing unsupported shops',()=>{
 let fill=[],cleared=0;
 const ctx={imageSmoothingEnabled:true,clearRect(x,y,w,h){assert.deepEqual([x,y,w,h],[0,0,144,144]);cleared++;},fillRect(x,y,w,h){fill.push({x,y,w,h})},set fillStyle(value){assert.match(value,/^#/);}};
 assert.equal(paintReaction(ctx,'window','town-liquor',6),5);
 assert.equal(fill.length,5);assert.equal(ctx.imageSmoothingEnabled,false);
 assert.equal(paintReaction(ctx,'window','bar',6),0);assert.equal(cleared,2);
});
test('archived pixel art options stay unit-tested while the Lab replaces their UI',()=>{
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('./app.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
 // Historical A/B/C patches remain here as regressions, but the tiny
 // reactions were not visible enough on an actual iPhone; the active UI is new.
 assert.match(html,/<canvas id="focus-mask" width="144" height="144"/);
 assert.doesNotMatch(html,/line-layer|pixel-layer/);
 assert.doesNotMatch(js,/renderLine|stroke-dasharray|setInterval|paintReaction/);
 assert.match(js,/paintTownContrast/);
 assert.match(js,/focusViewport/);
 assert.match(css,/#focus-mask\{pointer-events:none\}/);
 assert.deepEqual(['contrast','focus'].map(id=>html.includes('data-style="'+id+'"')),[true,true]);
});
