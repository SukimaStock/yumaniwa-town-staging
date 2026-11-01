import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('entry versions every changed retail display dependency without replacing distillation graph',()=>{
 assert.match(read('index.html'),/shop-app\.mjs\?[^"\s]*sales=all-shop-r1/);
 assert.match(read('index.html'),/market\.css\?[^"\s]*fields=all-shop-r1/);
 assert.match(read('shop-app.mjs'),/market-ui\.mjs\?[^'\s]*fields=all-shop-r1/);
 assert.match(read('market-ui.mjs'),/retail-sale-motion\.mjs\?v=all-shop-r1/);
 assert.match(read('shop-app.mjs'),/canvas-scene\.mjs\?tools=cut-range-r1/);
});
