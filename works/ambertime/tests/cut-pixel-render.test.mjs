import test from 'node:test';
import assert from 'node:assert/strict';
import {drawCutBar,BAR_RENDER_VARIANTS,cutCellColor,streamProfile,colorForProfile} from '../cut-bar.mjs';
import {drawDistillTools} from '../distill-tools-view.mjs';
const geometry=Object.freeze({x:60,y:393,w:240,h:6,current:.74,start:.21,end:.74});
const paint=variant=>{const cells=[];const output=drawCutBar((...cell)=>cells.push(cell),geometry,{malt:'plain',ferment:'long'},{variant});return {cells,output};};
test('all four render candidates deterministic, 3px cells and identical boundary overlays',()=>{
 const baseline=paint('continuous');
 for(const variant of BAR_RENDER_VARIANTS){
  const first=paint(variant);assert.deepEqual(first,paint(variant));
  assert(first.cells.every(c=>c.slice(0,4).every(n=>n%3===0)));
  assert.deepEqual(first.cells.filter(c=>['#f0e6c8','#191a29aa'].includes(c[4])),baseline.cells.filter(c=>['#f0e6c8','#191a29aa'].includes(c[4])));
  assert.equal(first.output.currentX,baseline.output.currentX);assert.equal(first.output.startX,baseline.output.startX);assert.equal(first.output.endX,baseline.output.endX);
 }
 assert.equal(geometry.start,.21);
});
test('columns quantize drawing only and remain profile-dependent, not position buckets',()=>{
 const source=Array.from({length:80},(_,x)=>streamProfile(99*x/80)),bytes=JSON.stringify(source);
 const original=source.map(colorForProfile),adopted=source.map(p=>cutCellColor(p));
 assert(new Set(adopted).size>=5&&new Set(adopted).size<new Set(original).size);
 assert.notDeepEqual(adopted,source.map(p=>cutCellColor({...p,smoke:.74})));
 assert.equal(JSON.stringify(source),bytes);
 assert.equal(paint().output.renderVariant,'columns');
});
test('liquid optional tint changes only interior colors; geometry, fill and neutral fallback identical',()=>{
 const draw=view=>{const cells=[],ctx={fillStyle:'',fillRect(...r){cells.push([...r,this.fillStyle]);}};drawDistillTools(ctx,view);return cells;};
 const view={fill:.7,leverDown:false,showLeverArrow:false,glassArrow:false},before=JSON.stringify(view),neutral=draw(view),color=draw({...view,liquidColor:'#c58fa4',liquidHighlight:'#d1a8ae'});
 assert.equal(JSON.stringify(view),before);assert.deepEqual(neutral.map(c=>c.slice(0,4)),color.map(c=>c.slice(0,4)));
 assert.equal(neutral.filter((c,i)=>c[4]!==color[i][4]).length,2);
 assert.deepEqual(draw({...view,fill:0}),draw({...view,fill:0,liquidColor:'#c58fa4'}));
});
