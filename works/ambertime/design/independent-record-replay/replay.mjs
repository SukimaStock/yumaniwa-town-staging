// Research only. Every-operation record reconstruction is a tested hypothesis,
// NOT a new acceptance rule for existing legitimate v8 save cadences.
import * as native from '../../partner-orders.mjs';
import {initializeRecall,advanceRecall,prepareRecall,collectorVersion} from '../../recall/collector.mjs';
import {initializeHistoryRecord,advanceHistoryRecord} from '../../history-record.mjs';
import {migrateRecentLedger,advanceRecentLedger} from '../../recent-ledger.mjs';
import {readSession} from '../../development-save.mjs';
import {options} from './reference.mjs';
const clone=x=>structuredClone(x),equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function require(ok,message,code='invalid-input'){if(!ok)throw Object.assign(Error(message),{code});}
const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
export function allowedInput(session){
 const g=session.game;
 return {sessionVersion:8,modelVersion:g.version,initializer:'newShopDialogueDistillery',collectorVersions:{recentLedger:session.recentLedger.version,historyRecord:session.historyRecord.version,recallRecord:session.recallRecord.version},seed:g.seed,origin:clone(g.origin),operations:clone(g.operations),auxiliary:{progress:g.still.phase==='distilling'?g.still.distillation.progress:null,tastingId:g.tastingId}};
}
export function replay(input){
 require(exact(input,['sessionVersion','modelVersion','initializer','collectorVersions','seed','origin','operations','auxiliary']),'Unexpected replay input');
 require(input.sessionVersion===8&&input.modelVersion===20&&input.origin===null&&input.initializer==='newShopDialogueDistillery','Unsupported version/origin/initializer','unsupported');
 const initial=native.newShopDialogueDistillery(input.seed),prefix=initial.operations.length;
 require(exact(input.collectorVersions,['recentLedger','historyRecord','recallRecord'])&&input.collectorVersions.recentLedger===1&&input.collectorVersions.historyRecord===1&&input.collectorVersions.recallRecord===collectorVersion,'Unsupported collector version','unsupported');
 require(Array.isArray(input.operations)&&input.operations.length>=prefix&&input.operations.length<=300&&equal(input.operations.slice(0,prefix),initial.operations),'Unsupported initializer prefix or operation budget','unsupported');
 require(exact(input.auxiliary,['progress','tastingId']),'Unexpected auxiliary input');
 let game=initial,recentLedger=migrateRecentLedger(initial,{replay:o=>native.replayDistilleryOperations(initial,o)}),historyRecord=initializeHistoryRecord(initial),recallRecord=initializeRecall(initial);const boundaries=[];
 const scaffold=facts=>Object.assign(native.newDistillery(input.seed),facts);
 native.replayDistilleryOperations({seed:input.seed,origin:null,operations:input.operations},({index,before,after})=>{
  if(index<prefix)return;
  const previous=scaffold(before);previous.origin=null;previous.operations=clone(input.operations.slice(0,index));
  const next=scaffold(after);next.origin=null;next.operations=clone(input.operations.slice(0,index+1));
  require(next.core.month<=36,'Research month budget exceeded');
  recentLedger=advanceRecentLedger(previous,next,recentLedger);
  historyRecord=advanceHistoryRecord(previous,next,historyRecord);
  const prepared=input.operations[index].key==='generation-handover'?prepareRecall(recallRecord,previous,index):null;
  recallRecord=advanceRecall(previous,next,recallRecord,{prepared});game=next;
  boundaries.push({index,key:input.operations[index].key,month:game.core.month});
 });
 game=native.endTasting(game);
 const {progress,tastingId}=input.auxiliary;
 if(progress!==null){
  require(Number.isInteger(progress)&&game.still.phase==='distilling'&&progress>=game.still.distillation.progress&&progress<100,'Invalid partial extraction input');
  require(game.still.distillation.collectionVersion!==2||game.still.distillation.collectStart!==null||progress<=88,'Invalid uncollected extraction');
  const length=game.operations.length;while(game.still.distillation.progress<progress){const next=native.distillStep(game);require(next!==game&&next.operations.length===length&&next.still.phase==='distilling','Invalid partial extraction transition');game=next;}
 }else require(game.still.phase!=='distilling','Missing partial extraction input');
 require(tastingId===null||Number.isSafeInteger(tastingId),'Invalid tasting input');
 if(tastingId!==null){require(game.notesById[tastingId]?.samples.at(-1)?.age===native.currentCask(game,tastingId)?.age,'Missing recorded tasting');const n=game.operations.length;game=native.sampleDistillery(game,tastingId);require(game.operations.length===n,'Tasting auxiliary must not create operation');}
 return {game,recentLedger,historyRecord,recallRecord,boundaries};
}
export function firstDifference(a,b,path='$'){
 if(Object.is(a,b))return null;
 if(typeof a!==typeof b||a===null||b===null||typeof a!=='object')return {path,expected:a,actual:b};
 const ak=Object.keys(a),bk=Object.keys(b);if(!equal(ak,bk))return {path:path+'.<keys>',expected:ak,actual:bk};
 for(const key of ak){const diff=firstDifference(a[key],b[key],`${path}.${key}`);if(diff)return diff;}return null;
}
export function assess(wire){
 // Formal reader is a separate acceptance test, not the replay's initial state.
 const session=readSession(wire,options),input=allowedInput(session),result=replay(input);
 const comparison={};for(const key of ['game','recentLedger','historyRecord','recallRecord'])comparison[key]={equal:equal(session[key],result[key]),firstDifference:firstDifference(session[key],result[key],key)};
 return {session,input,result,comparison,nonDerived:'Validated by unchanged v8 type/range/cask correspondence rules; not independently derived'};
}
