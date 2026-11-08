import test from 'node:test';
import assert from 'node:assert/strict';
import {SYMBOLS,drawSymbol,symbolMarkup} from '../pixel-symbols.mjs';

const fixtures={
 map:{width:11,height:11,colors:['#644632','#a0785a','#b69a65','#e7dcc0']},
 handshake:{width:11,height:11,colors:['#f0e6c8']},
 pause:{width:7,height:7,colors:['#f0e6c8']},
 stock:{width:7,height:7,colors:['#f0e6c8']},
 person:{width:7,height:7,colors:['#644632','#f0e6c8']},
 store:{width:11,height:11,colors:['#644632','#b69a65','#e4c58a','#e7dcc0']}
};
for(const [name,fixture] of Object.entries(fixtures)){
 test('Atelier '+name+' preserves exact dimensions and source colors',()=>{
  const glyph=SYMBOLS[name];
  assert.equal(glyph.length,fixture.height);
  assert.ok(glyph.every(row=>row.length===fixture.width&&/^[01]+$/.test(row)));
  const rects=[],ctx={fillStyle:null,fillRect(x,y,w,h){rects.push({x,y,w,h,color:this.fillStyle});}};
  drawSymbol(ctx,name,10,20,3,'#ffffff');
  assert.equal(rects.length,glyph.join('').replaceAll('0','').length);
  const colors=new Set(rects.map(x=>x.color));
  assert.deepEqual([...colors].sort(),fixture.colors.sort());
  assert.ok(rects.every(r=>r.w===3&&r.h===3&&r.x>=10&&r.y>=20));
  const svg=symbolMarkup(name);
  assert.ok(svg.includes('viewBox="0 0 '+fixture.width+' '+fixture.height+'"'));
  assert.equal((svg.match(/<rect /g)||[]).length,rects.length);
 });
}
test('unchanged non-Atelier symbols remain contextual monochrome',()=>{
 for(const name of Object.keys(SYMBOLS).filter(k=>!fixtures[k])){
  const ctx={fillStyle:'',colors:[],fillRect(){this.colors.push(this.fillStyle);}};
  drawSymbol(ctx,name,0,0,3,'#ffffff');
  assert.ok(ctx.colors.every(x=>x==='#ffffff'),name);
  assert.ok(!symbolMarkup(name).includes(' fill="#f0e6c8"'),name);
 }
});
