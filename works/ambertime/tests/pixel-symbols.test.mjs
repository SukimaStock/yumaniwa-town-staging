import test from 'node:test';
import assert from 'node:assert/strict';
import {SYMBOLS,drawSymbol,symbolMarkup} from '../pixel-symbols.mjs';
function pixels(kind){const rects=[],ctx={fillStyle:null,fillRect(x,y,w,h){rects.push({x,y,w,h,color:this.fillStyle});}};drawSymbol(ctx,kind,10,20,3,'#ffffff');return rects;}
test('store keeps the original 11 by 11 silhouette and changes exactly one roof source cell',()=>{
 assert.deepEqual(SYMBOLS.store,['00000000000','01111111110','01111111110','01100100110','01100100110','01111111110','01100100110','01100100110','01111111110','01111111110','00000000000']);
 const rects=pixels('store'),accent=rects.filter(p=>p.color!=='#ffffff');
 assert.equal(rects.length,SYMBOLS.store.join('').replaceAll('0','').length);
 assert.deepEqual(accent,[{x:25,y:23,w:3,h:3,color:'#bf7950'}]);
 const svg=symbolMarkup('store');assert.ok(svg.includes('viewBox="0 0 11 11"'));
 assert.equal((svg.match(/style="fill:/g)||[]).length,1);
 assert.ok(svg.includes('<rect x="5" y="1" width="1" height="1" style="fill:#bf7950"/>'));
});
test('every other icon remains monochrome in both Canvas and SVG',()=>{
 for(const kind of Object.keys(SYMBOLS).filter(k=>k!=='store')){
  assert.ok(pixels(kind).every(p=>p.color==='#ffffff'),kind);
  assert.ok(!symbolMarkup(kind).includes('style="fill:'),kind);
 }
});
