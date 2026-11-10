import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAP_SIZE,MAP_CELL,FOCUS_ZOOM,steppedReveal,paintTownContrast,focusViewport} from './focus-view.mjs';
import {SCENARIOS,fixtureState} from './fixtures.mjs';
import {shopRelationshipEvidence} from './relationship-view.mjs';
const evidence=id=>{
 const game=fixtureState(SCENARIOS.find(s=>s.id===id));
 return shopRelationshipEvidence(game,'bar',{mapShopIds:['town-liquor','bar']});
};
test('large stepped openings follow the 2x2-pixel source grid',()=>{
 const strips=steppedReveal({x:94,y:52});
 assert.equal(strips.length,5);
 assert(strips.some(r=>r.w===48));
 for(const r of strips){
  for(const axis of ['x','y','w','h'])assert.equal(r[axis]%MAP_CELL,0);
  assert(r.x>=0&&r.y>=0&&r.x+r.w<=MAP_SIZE&&r.y+r.h<=MAP_SIZE);
 }
});
test('both map edges and bar temporary location stay within authored canvas',()=>{
 for(const point of [{x:36,y:120},{x:0,y:0},{x:144,y:144}]){
  const strips=steppedReveal(point);assert(strips.length>0);
  for(const r of strips)assert(r.x>=0&&r.y>=0&&r.x+r.w<=144&&r.y+r.h<=144);
 }
 assert.deepEqual(steppedReveal(null),[]);
});
test('A dims whole map and opens only the two related locations',()=>{
 const operations=[];
 const ctx={imageSmoothingEnabled:true,set fillStyle(v){operations.push(['color',v])},clearRect(...v){operations.push(['clear',...v])},fillRect(...v){operations.push(['fill',...v])}};
 assert.equal(paintTownContrast(ctx,[{x:94,y:52},{x:36,y:120}]),10);
 assert.deepEqual(operations[0],['clear',0,0,144,144]);
 assert.deepEqual(operations[2],['fill',0,0,144,144]);
 assert.equal(ctx.imageSmoothingEnabled,false);
});
test('no relationship never darkens or changes the base map',()=>{
 let fills=0,clears=0;
 const ctx={clearRect(){clears++},fillRect(){fills++}};
 assert.equal(paintTownContrast(ctx,[]),0);assert.equal(fills,0);assert.equal(clears,1);
});
test('C camera projection stays within pan bounds at iPhone-sized windows',()=>{
 for(const [w,h] of [[300,150],[320,220],[390,300],[430,380]]){
  const v=focusViewport({x:94,y:52},w,h);
  const side=Math.min(w,h);
  assert.equal(v.zoom,FOCUS_ZOOM);
  assert(Math.abs(v.pan.x)<=Math.max(0,(side*v.zoom-w)/2)+1e-7);
  assert(Math.abs(v.pan.y)<=Math.max(0,(side*v.zoom-h)/2)+1e-7);
  assert(v.pan.x<=0&&v.pan.y>=0);
 }
});
test('missing viewport data cannot create invalid CSS values',()=>{
 for(const wh of [[0,0],[NaN,320],[Infinity,200]]){
  const v=focusViewport(null,...wh);
  assert(Number.isFinite(v.zoom)&&Number.isFinite(v.pan.x)&&Number.isFinite(v.pan.y));
 }
});
test('fixed event scenarios preserve the real arrival proof boundary',()=>{
 assert.equal(evidence('before'),null);
 assert.equal(evidence('missing'),null);
 assert.deepEqual(evidence('after')?.proofEventIds,['e4','e3','e2','e1']);
});
test('archived focus calculations remain tested but active Lab no longer uses darkening or auto zoom',()=>{
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('./app.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
 assert.match(html,/id="breath-layer"/);
 assert.match(html,/data-style="together"/);
 assert.match(html,/data-style="reply"/);
 assert.match(html,/data-style="partner"/);
 assert.doesNotMatch(app,/paintTownContrast|focusViewport|renderLine|stroke-dasharray/);
 assert.match(app,/breathParticipants/);
 assert.match(css,/shop-breathe/);
});
