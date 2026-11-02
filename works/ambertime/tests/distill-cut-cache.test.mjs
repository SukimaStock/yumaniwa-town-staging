import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('cut entry and changed drawing dependencies use new versioned module identities',()=>{
 const html=read('index.html'),app=read('shop-app.mjs'),scene=read('canvas-scene.mjs');
 assert.match(html,/shop-app\.mjs\?[^"\s]*daily=panel-countdown-r1/);
 assert.match(app,/canvas-scene\.mjs\?tools=panel-countdown-r1/);
 assert.match(app,/distill-tools-view\.mjs\?v=panel-countdown-r1/);
 assert.match(app,/distill-learning\.mjs\?v=game-guide-r1/);
 assert.match(scene,/cut-bar\.mjs\?v=cut-range-r1/);
 assert.match(scene,/distill-tools-view\.mjs\?v=panel-countdown-r1/);
 assert.match(app,/flavor-color\.mjs\?v=cut-pixel-r1/);
 assert.doesNotMatch(app,/canvas-scene\.mjs\?tools=visual-flow-r2/);
});
