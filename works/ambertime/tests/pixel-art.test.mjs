import test from 'node:test';
import assert from 'node:assert/strict';
import {barrel,glass} from '../cask-glass-art.mjs';
import {glass as originalGlass} from '../art.mjs';

test('pixel glass preserves the original liquid-color boundary behavior',()=>{
 const values=[undefined,NaN,-1,0,.1,.10000001,.3,.30000001,.65,.65000001,1.35,Infinity];
 for(let i=0;i<=135;i++)values.push(i/100);
 for(const wood of values){
  // This is the original liquid body, rather than the glass outline/shadow.
  const original=originalGlass(wood).match(/fill="(#[a-f0-9]+)" fill-opacity="\.82"/)[1];
  const next=glass(wood,{sample:true});
  assert(next.includes('fill="'+original+'"'),String(wood));
  assert(next.includes('fill-opacity=".82"'));
  assert(next.includes('class="sample-liquid"'));
 }
});

test('object geometry uses whole grid cells, no smoothed paths or painted background',()=>{
 for(const object of [barrel('bourbon'),barrel('refill'),glass(0),glass(1)]){
  assert(object.includes('shape-rendering="crispEdges"'));
  assert(object.includes('aria-hidden="true" focusable="false"'));
  assert(!/<(?:path|circle|ellipse|image|filter|linearGradient|text)\b/.test(object));
  const [,w,h]=object.match(/viewBox="0 0 (\d+) (\d+)"/).map(Number);
  const cells=[...object.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g)];
  assert(cells.length>0);
  for(const r of cells){const[x,y,rw,rh]=r.slice(1).map(Number);assert(x>=0&&y>=0&&rw>0&&rh>0&&x+rw<=w&&y+rh<=h);assert(rw<w||rh<h);}
 }
});

test('two existing casks remain distinguishable and sample animation is opt-in',()=>{
 assert.notEqual(barrel('bourbon'),barrel('refill'));
 assert.equal(barrel(),barrel('bourbon'));
 assert(!glass(.4).includes('class="sample-liquid"'));
 assert(glass(.4,{sample:true}).includes('class="sample-liquid"'));
 assert.equal(barrel('bourbon'),barrel('bourbon'));
});
