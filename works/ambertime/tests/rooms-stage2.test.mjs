import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import *as D from '../partner-orders.mjs';import {rangeRestartAvailable,distillToolsView,leverGuideOffset} from '../distill-tools-view.mjs';import {SYMBOLS,drawSymbol,symbolMarkup,disclosureSymbols} from '../pixel-symbols.mjs';
const step=(s,n)=>{while(s.still.distillation.progress<n)s=D.distillStep(s);return s;};
const expired=step(D.startRangeDistillation(D.newMarketRulesDistillery(42)),88);
const project=(s,extra={})=>distillToolsView({phase:s.still.phase,available:true,collection:D.collectionState(s),prepared:true,canStart:D.canStart(s).ok,canRestart:rangeRestartAvailable(s),completedRuns:7,...extra});
test('recovery eligibility matches the existing restart transaction without charging or mutating',()=>{
 const no=(change)=>Object.assign(structuredClone(expired),change);
 const candidates=[expired,step(D.startRangeDistillation(D.newMarketRulesDistillery(42)),87),step(D.beginCollection(D.startRangeDistillation(D.newMarketRulesDistillery(42))),99),no({tastingId:2}),no({decisions:[{}]}),no({trade:{...expired.trade,offer:{}}}),no({usual:{...expired.usual,reservation:{status:'active'}}}),no({core:{...expired.core,cash:0}})];
 for(const s of candidates){const raw=JSON.stringify(s);let actual=false;try{D.restartRangeDistillation(s);actual=true;}catch{}assert.equal(rangeRestartAvailable(s),actual);assert.equal(JSON.stringify(s),raw);}
 const raw=D.serializeDistillery(expired),next=D.restartRangeDistillation(expired);assert.equal(next.core.cash,expired.core.cash);assert.equal(next.still.distillation.progress,0);assert.equal(D.serializeDistillery(expired),raw);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw);
});
test('recovery cue is separate from first-three tutorial and never suggests blocked recovery',()=>{
 let v=project(expired);assert(v.leverEnabled&&v.showLeverArrow&&v.arrow);assert.equal(v.guideLevel,'recovery');assert.equal(v.guideDistance,9);assert(!v.glassArrow);assert(!v.glassEnabled);
 for(const completedRuns of [0,1,2,3,8]){v=project(D.newMarketRulesDistillery(42),{completedRuns});assert.equal(v.showLeverArrow,completedRuns<3);assert.equal(v.guideDistance,completedRuns===0?9:completedRuns<3?6:0);}
 for(const extra of [{available:false},{automatic:true},{countdown:true},{canRestart:false}]){v=project(expired,extra);assert(!v.arrow);assert(!v.leverEnabled);}
 assert.equal(leverGuideOffset({now:360,enabled:true,completedRuns:0}),9);assert.equal(leverGuideOffset({now:360,enabled:true,reduced:true}),0);assert.equal(leverGuideOffset({now:360,enabled:true,touching:true}),0);
});
test('shared chevrons are authored integer cells, identical SVG and Canvas patterns',()=>{
 for(const kind of ['chevronRight','chevronDown','close']){const cells=[],ctx={fillRect:(...r)=>cells.push(r)};drawSymbol(ctx,kind,0,0);assert(cells.every(r=>r.every(n=>Number.isInteger(n)&&n%3===0)));assert.equal(cells.length,[...SYMBOLS[kind].join('')].filter(x=>x==='1').length);assert.equal((symbolMarkup(kind).match(/<rect /g)||[]).length,cells.length);assert(symbolMarkup(kind).includes('aria-hidden="true"'));}
 let calls=0;const marker={querySelector:()=>calls>0,insertAdjacentHTML:()=>{calls++;}};disclosureSymbols({querySelectorAll:()=>[marker]});disclosureSymbols({querySelectorAll:()=>[marker]});assert.equal(calls,1);
});
test('presentation scope keeps formal source and critical notices; cache dependencies are complete',()=>{
 const read=n=>fs.readFileSync(new URL('../'+n,import.meta.url),'utf8'),app=read('shop-app.mjs'),canvas=read('canvas-scene.mjs');
 assert(!app.includes("phaseSummary:collection.expired?'採取できる範囲を過ぎました。'"));assert(app.includes('以前の蒸留を続けています。'));assert(app.includes('保存できません。最後の正常な記録を残して停止しています。'));assert(app.includes("guide.textContent=tools.hint??''"));assert(canvas.includes("if(item.selected&&v.room!=='warehouse')"));
 for(const name of ['index.html','shop-app.mjs','canvas-scene.mjs','market-ui.mjs'])assert(read(name).includes('stage2-r1'));
 assert(app.includes("pixel-symbols.mjs?v=rooms-stage2-r1"));assert(canvas.includes("pixel-symbols.mjs?v=rooms-stage2-r1"));assert(read('market-ui.mjs').includes("pixel-symbols.mjs?v=rooms-stage2-r1"));
});
