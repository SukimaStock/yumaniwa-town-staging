import test from 'node:test';
import assert from 'node:assert/strict';
import * as native from '../partner-orders.mjs';
import {DEBUG_SKIP_YEARS,monthsForDebugSkip,debugSkipBarrier,debugSkipMonth} from '../recall/debug-time-skip.mjs';
import {readFileSync} from 'node:fs';

function idle(month=0){
 return {core:{month,spirit:null},still:{phase:'ready'},generations:{active:{phase:'working'}},decisions:[],trade:{offer:null},shop:{offer:null,pendingOffers:[]},usual:{reservation:null},tastingId:null,operations:[]};
}
const model={
 generationStatus:s=>s.generations.active,
 canBeginUsual:()=>({ok:false}),
 tickDistillery(s,month){assert.equal(month,s.core.month);return {...s,core:{...s.core,month:month+1},operations:[...s.operations,{key:'month',month}]};}
};
test('only 10, 20 and 30 years are supported',()=>{
 assert.deepEqual(DEBUG_SKIP_YEARS,[10,20,30]);
 for(const [y,m] of [[10,120],[20,240],[30,360]])assert.equal(monthsForDebugSkip(y),m);
 for(const x of [0,1,5,15,100,'20',-10])assert.throws(()=>monthsForDebugSkip(x));
});
test('one skip step delegates to the one real monthly model operation',()=>{
 let s=idle();
 for(let i=0;i<360;i++){const result=debugSkipMonth(s,model);assert.equal(result.advanced,true);assert.equal(result.reason,null);s=result.next;}
 assert.equal(s.core.month,360);
 assert.equal(s.operations.length,360);
});
test('interactive decisions, active distillation, offers and generations always stop the skip',()=>{
 const states=[
  {...idle(),decisions:[{id:1}]},
  {...idle(),trade:{offer:{id:1}}},
  {...idle(),shop:{offer:{id:1},pendingOffers:[]}},
  {...idle(),shop:{offer:null,pendingOffers:[{id:1}]}},
  {...idle(),still:{phase:'distilling'}},
  {...idle(),core:{month:0,spirit:{id:1}}},
  {...idle(),tastingId:1},
  {...idle(),generations:{active:{phase:'last-batch'}}},
  {...idle(),generations:{active:{phase:'review'}}},
  {...idle(),usual:{reservation:{status:'queued'}}}
 ];
 for(const state of states){
  let called=0;
  const guarded={...model,tickDistillery:()=>{called++;throw Error('must not run');}};
  const result=debugSkipMonth(state,guarded);
  assert.equal(result.next,state);assert.equal(result.advanced,false);assert.ok(result.reason);assert.equal(called,0);
 }
 const hired={...model,canBeginUsual:()=>({ok:true})};
 assert.match(debugSkipBarrier(idle(),hired),/担当者/);
});
test('stalled month and impossible multi-operation result do not silently fast forward',()=>{
 const state=idle(42);
 const halted=debugSkipMonth(state,{...model,tickDistillery:s=>({...s,operations:[...s.operations,{key:'stalled'}]})});
 assert.equal(halted.advanced,false);assert.match(halted.reason,/月が進みません/);
 assert.throws(()=>debugSkipMonth(state,{...model,tickDistillery:s=>({...s,core:{month:43},operations:[{key:'month'},{key:'month'}]})}),/正式操作/);
 assert.throws(()=>debugSkipMonth(state,{...model,tickDistillery:s=>({...s,core:{month:45},operations:[{key:'month'}]})}),/増分/);
});
test('actual AmberTime one-month tick preserves native model validation and operation history',()=>{
 const s=native.newMarketRulesDistillery(1357),before=JSON.stringify(s);
 const result=debugSkipMonth(s,native);
 assert.equal(result.advanced,true);
 assert.equal(result.next.core.month,s.core.month+1);
 assert.equal(result.next.operations.length,s.operations.length+1);
 assert.equal(native.validateDistillery(result.next),true);
 assert.equal(JSON.stringify(s),before);
});
test('app exposes skip only from the debug menu, with confirmation and one saved month per step',()=>{
 const source=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
 assert.match(source,/if\(a==='debug-skip'&&debugEnabled&&kind==='settings'/);
 assert.match(source,/if\(!debugEnabled\|\|preview\|\|!game\|\|!canSave/);
 assert.match(source,/confirm\(years\+'年進めます。/);
 assert.match(source,/debugSkipMonth\(game,D\)/);
 assert.match(source,/saveCandidate\(result.next,true,elapsed\)/);
 assert.match(source,/if\(document.hidden\).*finishDebugSkip/);
});
