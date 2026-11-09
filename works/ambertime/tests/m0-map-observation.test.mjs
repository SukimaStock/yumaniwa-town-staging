import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mapSquare,mapPanBounds,m0ShopCategory,m0ShopGlyph} from '../m0-observation.mjs';
import {mapObservationBounds} from '../world-map-view.mjs';
import {SHOPS} from '../shop-model.mjs';

test('M0 keeps a square local map at every viewport aspect',()=>{
 for(const [w,h] of [[360,568],[390,680],[430,740],[900,740],[324,156]]){
  const q=mapSquare(w,h);
  assert.equal(q.side,Math.min(w,h));
  assert.equal(q.left*2+q.side,w);
  assert.equal(q.top*2+q.side,h);
 }
});

test('M0 pan is bounded and does not move the map at native zoom',()=>{
 assert.deepEqual(mapPanBounds(330,210,1),{x:0,y:0});
 assert.deepEqual(mapPanBounds(330,210,2),{x:45,y:105});
 assert.deepEqual(mapPanBounds(210,330,2),{x:105,y:45});
});

test('M0 local hit bounds follow the authored stage-2/3 buildings',()=>{
 const near=mapObservationBounds(2),town=mapObservationBounds(3);
 assert.deepEqual(near.retail,[26,72,24,24]);
 assert.deepEqual(near['town-liquor'],[90,34,24,24]);
 assert.deepEqual(near.supermarket,[102,94,24,24]);
 assert.deepEqual(town.retail,[46,62,16,16]);
 assert.deepEqual(town['town-liquor'],[86,44,16,16]);
 assert.deepEqual(town.supermarket,[98,92,16,16]);
 for(const stage of [1,2,3])for(const rect of Object.values(mapObservationBounds(stage))){
  const [x,y,w,h]=rect;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=144&&y+h<=144);
 }
});

test('M0 names use canonical shops; department remains a special handling path',()=>{
 assert.equal(SHOPS.find(s=>s.id==='supermarket').name,'町のスーパー');
 assert.equal(SHOPS.find(s=>s.id==='bar').name,'路地裏のバー');
 assert.ok(!Object.hasOwn(mapObservationBounds(3),'department'));
});
test('M0 drawer uses reversible sheet positions and respects reduced motion',()=>{
 const css=readFileSync(new URL('../m0-observation.css',import.meta.url),'utf8');
 const js=readFileSync(new URL('../m0-observation.mjs',import.meta.url),'utf8');
 assert.match(css,/transition:top 240ms steps\(4,end\)/);
 assert.match(css,/\[data-mode=closed\] \.m0-drawer\{top:100%\}/);
 assert.match(css,/\[data-mode=full\] \.m0-drawer\{top:0\}/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(js,/if\(closing\)hideTimer=setTimeout\(finishClose,DRAWER_TWEEN_MS\+80\)/);
 assert.match(js,/const tween=!reduced.matches&&!doc.hidden/);
});

test('M0.9 uses icon-only shop rows and canonical full names in the lower report',()=>{
 const js=readFileSync(new URL('../m0-observation.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('../m0-observation.css',import.meta.url),'utf8');
 assert.equal(m0ShopCategory('bar'),'bar');
 assert.equal(m0ShopCategory('town-liquor'),'liquor');
 assert.equal(m0ShopCategory('supermarket'),'supermarket');
 assert.equal(m0ShopCategory('new-shop'),'department');
 for(const shopId of ['retail','town-liquor','supermarket','bar','department']){
  const svg=m0ShopGlyph(shopId);
  assert.match(svg,/viewBox="0 0 11 11"/);
  assert.match(svg,/aria-hidden="true"/);
 }
 assert.notEqual(m0ShopGlyph('bar'),m0ShopGlyph('town-liquor'));
 assert.match(css,/\.market-shop-title\{display:none!important\}/);
 assert.match(js,/shopNames\.get\(selected\)/);
 assert.doesNotMatch(js,/empty\.textContent='取扱店なし'/);
});

test('M0.9 map controls, corners, toggle and modal suspend/restore stay consistent',()=>{
 const js=readFileSync(new URL('../m0-observation.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('../m0-observation.css',import.meta.url),'utf8');
 const app=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
 const scene=readFileSync(new URL('../canvas-scene.mjs',import.meta.url),'utf8');
 assert.ok(js.indexOf('data-m0="zoom-in"')<js.indexOf('data-m0="zoom-out"'));
 assert.match(js,/data-m0="advance" aria-label="地図を全画面にする"/);
 assert.match(css,/\.m0-window-icon/);
 assert.match(css,/\.m0-pin\[aria-pressed=true\]\{color:#f6cd70\}/);
 assert.doesNotMatch(css,/\.m0-pin\[aria-pressed=true\]::after\{[^}]*box-shadow/);
 assert.match(app,/m0\.toggle\(\)/);
 assert.match(app,/if\(m0\.mode==='full'\)m0\.setMode\('half'\)/);
 assert.match(scene,/a\.node\.getAttribute\('aria-pressed'\)==='true'/);
 assert.match(js,/suspendedMode=mode/);
 assert.match(js,/mode=suspendedMode;suspendedMode=null/);
 assert.match(js,/get isOpen\(\)/);
 assert.match(css,/transition:top 240ms steps\(4,end\)/);
 const roomStyle=readFileSync(new URL('../room-scene.css',import.meta.url),'utf8');
 assert.match(roomStyle,/first-bottle-proceed\{[^}]*box-shadow:none\}/);
});
