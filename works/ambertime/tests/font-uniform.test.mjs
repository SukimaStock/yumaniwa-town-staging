import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {BODY_SIZE,pixelTypography,textRuns} from '../text-metrics.mjs';
import {uniformRequested,uniformMetrics,installUniformTypography} from '../font-uniform.mjs';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
function renderer(){const source=read('canvas-scene.mjs').replace(/^import.*\n/gm,'').replace('export class CanvasScene','class CanvasScene');return vm.runInNewContext(source+'\nCanvasScene;',{BODY_SIZE,pixelTypography,textRuns,document:{documentElement:{dataset:{fontState:'ready'}}}}).prototype;}
test('current main defaults to uniform; exact 0 keeps the former comparison without persistence',()=>{
 assert.equal(uniformRequested('?font-uniform=0'),false);assert.equal(installUniformTypography('?font-uniform=0',null),null);
 for(const s of ['', '?placement=1','?font-uniform=1','?font-uniform=true','?font-uniform=2'])assert.equal(uniformRequested(s),true);
 const vars={},root={dataset:{},style:{setProperty:(k,v)=>vars[k]=v}},ui=installUniformTypography('',root);ui.resize({scale:1,dpr:3});assert.equal(root.dataset.fontUniform,'1');assert.equal(vars['--uniform-font-size'],64/3+'px');assert.equal(vars['--uniform-line-height'],80/3+'px');ui.resize({scale:1,dpr:2});assert.equal(vars['--uniform-font-size'],'20px');
});
test('Canvas body is sole size authority; DOM uses identical integer physical glyph dots',()=>{
 for(const width of [320,360,375,390,768])for(const dpr of [1,2,3]){const viewport={scale:Math.min(width/360,844/640),dpr},m=uniformMetrics(viewport),body=pixelTypography(BODY_SIZE,viewport.scale*dpr);assert.equal(m.pixels,body.pixels);assert.equal(m.cssSize*dpr,body.pixels);assert(Number.isInteger(m.dot));assert.equal(m.cssLine*dpr,m.dot*10);assert(Math.abs(m.lineLogical*viewport.scale*dpr-m.dot*10)<1e-9);}
});
test('uniform sizes include small labels/countdown and measure matches draw metrics, normal sizes unchanged',()=>{
 const p=renderer(),view={viewport:{scale:1,dpr:3},uniformTypography:null};
 for(const size of [8,16,20,24,28,48])assert.deepEqual(JSON.parse(JSON.stringify(p.textMetrics.call(view,size))),pixelTypography(size,3));
 view.uniformTypography={metrics:uniformMetrics(view.viewport)};for(const size of [8,16,20,24,28,48])assert.equal(p.textMetrics.call(view,size).pixels,64);
 const source=read('canvas-scene.mjs');assert.match(source,/while\(!this.uniformTypography&&headerSize>8/);assert.match(source,/if\(this.uniformTypography\)size=BODY_SIZE/);assert.match(source,/this.uniformTypography\?this.uniformTypography.metrics.lineLogical/);
});
test('CSS is attribute-scoped, handles every live text root and leaves sprite/icon geometry untouched',()=>{
 const css=read('font-uniform.css');
 assert(css.includes('html[data-font-uniform="1"]'));for(const id of ['action-dialog','dialog-body','dialog-actions','dialog-title','save-choice','automatic-news','storage-notice','recovery','settings-source'])assert(css.includes('#'+id));
 assert(css.includes(':not(svg,svg *)'));assert(!/(?:^|[;{]\s*)(width|height|padding|margin|transform|display|border|color|background)\s*:/.test(css));assert(css.includes('font-size:var(--uniform-font-size)!important'));assert(css.includes('AmberMisaki'));
 const helper=read('font-uniform.mjs');assert(!/localStorage|sessionStorage|setTimeout|requestAnimationFrame|serialize|saveKey/.test(helper));
 assert(read('index.html').includes('id="font-uniform-style"'));assert(read('canvas-scene.mjs').includes("$('font-uniform-style')?installUniformTypography(location.search,document.documentElement):null"));assert(read('index.html').includes('./font-uniform.css?v=font-uniform-r1'));assert(read('shop-app.mjs').includes('./canvas-scene.mjs?v=visual14-r1'));
});
