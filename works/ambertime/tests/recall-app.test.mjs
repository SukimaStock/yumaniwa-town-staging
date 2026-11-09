import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as nativeModel from '../partner-orders.mjs';
import {createObservedModel} from '../recall/operations.mjs';
import {initializeRecall,advanceRecall} from '../recall/collector.mjs';

const source=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
function slice(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a,`Missing app seam: ${start}`);return source.slice(a,b);}

test('mounted generation acknowledgement retains committed game and collector if recall preparation fails',()=>{
 const before={operations:[{key:'month'}],still:{phase:'ready'},id:'before'},after={...before,operations:[...before.operations,{key:'generation-notice'}],id:'after'};
 const oldRecall={index:0},newRecall={index:1},status={textContent:''},dialog={open:false,dataset:{kind:'generation-review'}};let recovered=false,stops=0,writes=0,prepares=0;
 const session={game:before,userPaused:true,elapsed:0,caskSlots:[null,null,null,null],recentLedger:{},historyRecord:{},recallRecord:oldRecall};
 const context=vm.createContext({...session,pendingRecall:oldRecall,recallPreview:{old:true},committedSession:session,canSave:true,runtimeHalted:false,debugSkipJob:null,
  document:{hidden:false},m0:{isOpen:true},room:'sales',dialogueNotice:{reset(){}},
  generationState:()=>({id:1,phase:'review',needsNotice:true}),stopClock:()=>stops++,storageNotice:()=>{},$:id=>id==='action-dialog'?dialog:status,
  recoveryAccess:()=>{recovered=true;},D:{noticeGeneration:()=>after},
  saveCandidate:next=>{writes++;assert.equal(dialog.open,true);assert.equal(next,after);context.recallRecord=context.pendingRecall=newRecall;context.committedSession={...session,game:after,recallRecord:newRecall};return true;},
  prepareRecall:(record,game,index)=>{prepares++;assert.equal(record,newRecall);assert.equal(game,after);assert.equal(index,after.operations.length);throw Error('preparation fault');},modal:null
 });
 vm.runInContext(slice('function restoreCommitted(){','function recoveryAccess(){'),context);
 vm.runInContext(slice('function recordSaveError(','const initializeLedger='),context);
 vm.runInContext(slice('function showGeneration(){','function generationCauseText('),context);
 assert.equal(vm.runInContext('showGeneration()',context),true);
 assert.equal(context.modal.noticePending,true);assert.equal(context.modal.preparePending,true);assert.equal(context.modal.returnRoom,'sales');
 vm.runInContext('acknowledgeDecisionNotice()',context);
 assert.equal(writes,0);assert.equal(prepares,0);assert.equal(context.game,before);assert.equal(context.pendingRecall,oldRecall);
 dialog.open=true;
 vm.runInContext('acknowledgeDecisionNotice()',context);
 assert.equal(writes,1);assert.equal(prepares,1);
 assert.equal(context.game,after);assert.equal(context.game,context.committedSession.game);
 assert.equal(context.pendingRecall,newRecall);assert.equal(context.recallRecord,newRecall);assert.equal(context.recallPreview,null);
 assert.equal(context.userPaused,true);assert.equal(context.canSave,false);assert.equal(context.runtimeHalted,true);assert.equal(recovered,true);assert(stops>=2);
 assert.equal(context.lastSaveError.phase,'重要連絡');assert.equal(context.lastSaveError.message,'preparation fault');assert.equal(status.textContent,'未保存');
});

test('important notice acknowledgement requires mounted visible dialog and successful save in all 24 boundary combinations',()=>{
 let checked=0;
 for(const kind of ['shop-offer','generation-notice','generation-review'])for(const hidden of [false,true])for(const opened of [false,true])for(const saved of [false,true]){
  const label=JSON.stringify({kind,hidden,opened,saved});
  const before={operations:[],shop:{offer:{id:9,shopId:'bar',notified:false}}},after={...before,operations:[{key:'notice'}]};
  const target={kind,noticePending:true,id:1,shopId:'bar',offerId:9};let calls=0,writes=0;
  const context=vm.createContext({modal:target,game:before,userPaused:true,document:{hidden},$:()=>({open:opened,dataset:{kind}}),
   D:{noticeShopOffer:(game,shopId,id)=>{calls++;assert.equal(game,before);assert.equal(shopId,'bar');assert.equal(id,9);return after;},noticeGeneration:(game,id)=>{calls++;assert.equal(game,before);assert.equal(id,1);return after;}},
   saveCandidate:next=>{writes++;assert.equal(next,after);return saved;},saveFailure:()=>assert.fail('Unexpected acknowledgement exception: '+label)
  });
  vm.runInContext(slice('function acknowledgeDecisionNotice(){','function generationCauseText('),context);
  vm.runInContext('acknowledgeDecisionNotice()',context);
  const mayAttempt=!hidden&&opened,committed=mayAttempt&&saved;
  assert.equal(calls,mayAttempt?1:0,label);assert.equal(writes,mayAttempt?1:0,label);
  assert.equal(target.noticePending,!committed,label);assert.equal(context.game,committed?after:before,label);
  assert.equal(context.userPaused,true,label);assert.equal(before.shop.offer.notified,false,label);
  if(committed){vm.runInContext('acknowledgeDecisionNotice()',context);assert.equal(writes,1,'No duplicate formal notice: '+label);}
  checked++;
 }
 assert.equal(checked,24);
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
