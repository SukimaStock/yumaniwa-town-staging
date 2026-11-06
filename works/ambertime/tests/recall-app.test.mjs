import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as nativeModel from '../partner-orders.mjs';
import {createObservedModel} from '../recall/operations.mjs';
import {initializeRecall,advanceRecall} from '../recall/collector.mjs';

const source=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
function slice(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a,`Missing app seam: ${start}`);return source.slice(a,b);}

for(const runningSkip of [false,true])test(`recall preparation failure retains the committed state (debug skip ${runningSkip?'active':'idle'})`,()=>{
 const before={operations:[{key:'month'}],still:{phase:'ready'},id:'before'},after={...before,operations:[...before.operations,{key:'generation-notice'}],id:'after'};
 const oldRecall={index:0},newRecall={index:1},status={textContent:''};let recovered=false,stops=0,cancelled=null;
 const session={game:before,userPaused:false,elapsed:0,caskSlots:[null,null,null,null],recentLedger:{},historyRecord:{},recallRecord:oldRecall};
 const context=vm.createContext({...session,debugSkipJob:runningSkip?{timer:123}:null,clearTimeout:id=>{cancelled=id;},pendingRecall:oldRecall,recallPreview:{old:true},committedSession:session,canSave:true,runtimeHalted:false,
  generationState:()=>({id:1,phase:'review',needsNotice:true}),stopClock:()=>stops++,storageNotice:()=>{},$:()=>status,
  recoveryAccess:()=>{recovered=true;},D:{noticeGeneration:()=>after},
  save:()=>{context.recallRecord=context.pendingRecall=newRecall;context.committedSession={...session,game:after,recallRecord:newRecall};return true;},
  prepareRecall:()=>{throw Error('preparation fault');},modal:null
 });
 vm.runInContext(slice('function restoreCommitted(){','function recoveryAccess(){'),context);
 vm.runInContext(slice('function recordSaveError(','const initializeLedger='),context);
 vm.runInContext(slice('function showGeneration(){','function generationCauseText('),context);
 assert.equal(vm.runInContext('showGeneration()',context),false);
 assert.equal(context.game,after);assert.equal(context.game,context.committedSession.game);
 assert.equal(context.pendingRecall,newRecall);assert.equal(context.recallRecord,newRecall);assert.equal(context.recallPreview,null);
 assert.equal(context.debugSkipJob,null);assert.equal(cancelled,runningSkip?123:null);
 assert.equal(context.canSave,false);assert.equal(context.runtimeHalted,true);assert.equal(recovered,true);assert(stops>=2);
 assert.equal(context.lastSaveError.phase,'回想準備');assert.equal(context.lastSaveError.message,'preparation fault');assert.equal(status.textContent,'未保存');
});

test('rendering both barrel choices only probes native operations and leaves live recall untouched',()=>{
 let game=nativeModel.newMarketRulesDistillery(141),recall=initializeRecall(game),observations=0;
 const D=createObservedModel(nativeModel,({before,after})=>{observations++;recall=advanceRecall(before,after,recall);});
 game=D.startRangeDistillation(game);for(let i=0;i<24;i++)game=D.distillStep(game);
 game=D.beginCollection(game);for(let i=0;i<12;i++)game=D.distillStep(game);game=D.stopDistillation(game);
 const before=JSON.stringify({game,recall}),count=observations;
 const expression=slice("choices=['bourbon','refill'].map(",',selected=');
 const context=vm.createContext({game,D,nativeModel,displayReason:x=>x});
 const choices=vm.runInContext('const '+expression+'; choices;',context);
 assert.deepEqual(Array.from(choices,row=>row.type),['bourbon','refill']);assert(choices.every(row=>row.reason===''));
 assert.equal(observations,count);assert.equal(JSON.stringify({game,recall}),before);
});
