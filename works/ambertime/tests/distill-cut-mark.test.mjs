import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import {drawCutBar} from '../cut-bar.mjs';
test('gauge omits vertical strokes but retains position caps and selected underline',()=>{
 const g={x:60,y:393,w:240,h:6,current:.74,start:.21,end:.74},cells=[];
 const r=drawCutBar((...c)=>cells.push(c),g);
 const marks=cells.filter(c=>c[4]==='#f0e6c8');
 assert(marks.length>3);assert(marks.every(c=>c[3]===3));
 assert(marks.some(c=>c[0]===r.currentX-3&&c[1]===g.y-6));
 assert(marks.some(c=>c[0]===r.startX-3&&c[1]===g.y+g.h+6));
 assert(marks.some(c=>c[0]===r.endX-3&&c[1]===g.y-9));
 assert(marks.some(c=>c[1]===g.y+g.h+3&&c[2]>9));
});
test('confirmed flavor swatch is adjacent to aroma phrase, not volume',()=>{
 const s=fs.readFileSync(new URL('../canvas-scene.mjs',import.meta.url),'utf8');
 assert(s.includes('this.pixelRect(36,Math.round((y-12)/3)*3,12,12,tint)'));
 assert(s.includes('this.lines(p.phrase,tint?54:36,y,tint?270:288,16,1)'));
 assert(!s.includes('this.pixelRect(318,153+spiritOffset,6,6'));
});
