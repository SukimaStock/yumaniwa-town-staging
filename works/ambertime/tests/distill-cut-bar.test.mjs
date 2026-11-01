import test from 'node:test';import assert from 'node:assert/strict';
import {streamProfile,colorForProfile,drawCutBar} from '../cut-bar.mjs';
import {streamProfile as labStream,colorForProfile as labColor} from '../../ambertime-cut-lab/projection.mjs';
import * as D from '../partner-orders.mjs';
import {collectionGeometry} from '../canvas-layout.mjs';
test('work-local color-only projection exactly matches adopted Lab for every grid position/condition',()=>{
 for(const malt of ['plain','peat'])for(const ferment of ['short','long'])for(let position=0;position<=99;position++){
  const p=streamProfile(position,{malt,ferment});assert.deepEqual(p,labStream(position,{malt,ferment}));assert.equal(colorForProfile(p),labColor(p));
 }
});
test('C bar preserves read-only boundaries, shape markers and continuous semantic colors',()=>{
 let state=D.startRangeDistillation(D.newMarketRulesDistillery(42));while(state.still.distillation.progress<24)state=D.distillStep(state);state=D.beginCollection(state);while(state.still.distillation.progress<52)state=D.distillStep(state);
 const bytes=D.serializeDistillery(state),g=collectionGeometry(D.collectionState(state)),cells=[];
 const painted=drawCutBar((...cell)=>cells.push(cell),{...g,fullRange:true},{malt:'plain',ferment:'long'});
 assert.equal(painted.currentX,186);assert.equal(painted.startX,117);assert.equal(painted.endX,null);assert.equal(painted.palette,'family-mixture');
 assert(new Set(cells.slice(0,80).map(x=>x[4])).size>20);assert(cells.some(c=>c[4]==='#191a29aa'));assert(cells.some(c=>c[1]===g.y+g.h+6));assert(cells.every(c=>c.slice(0,4).every(n=>n%3===0)));assert.equal(D.serializeDistillery(state),bytes);
 const finish=D.stopDistillation(state),final=drawCutBar(()=>{},collectionGeometry(D.collectionState(finish)));assert.equal(final.endX,painted.currentX);assert.equal(final.startX,painted.startX);
});

test('old collection coordinates already normalize the flavor cut; palette does not shift them again',()=>{
 const g=collectionGeometry({current:.7,start:.2,end:null}),full=[],legacy=[];
 drawCutBar((...c)=>full.push(c),{...g,fullRange:true},{malt:'peat',ferment:'short'});
 drawCutBar((...c)=>legacy.push(c),{...g,fullRange:false},{malt:'peat',ferment:'short'});
 assert.deepEqual(legacy,full);
});
