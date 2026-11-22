import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as native from '../partner-orders.mjs';
import {createFreshSession,inspectStartRecord,createSessionEntry} from '../session-entry.mjs';
import {serializeSession,readSession,writeCandidate,FORMAL_SAVE_KEY} from '../development-save.mjs';
import {commitMarketRulesUpdate} from '../market-ui.mjs';
import {PARALLEL_PARAMETERS as T} from '../economy-parameters.mjs';

const app=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
const source=(begin,end)=>app.slice(app.indexOf(begin),app.indexOf(end,app.indexOf(begin)));
const options={enabled:true,serialize:native.serializeDistillery,restore:native.restoreDistillery,monthMs:T.monthMs,stepMs:T.distillStepMs};
const encode=session=>serializeSession(session.game,session,options);
const injected=where=>Object.assign(Error('injected '+where+' failure'),{name:'InjectedApplyError',code:'apply-'+where});

function harness({kind='new',failure='before-game',createFailure=false,encodeFailure=false}={}){
 const old=readSession(encode(createFreshSession(native,41)),options),oldRaw=encode(old),values=new Map([[FORMAL_SAVE_KEY,oldRaw]]),writes=[];
 const storage={getItem:key=>values.get(key)??null,setItem(key,text){writes.push({key,text});values.set(key,text);}};
 const counters={save:0,stop:0,countdown:0},errors=[],diagnostics=[];
 const context={runtimeStarting:false,runtimeEpoch:0,commitBoundary:null,offerPresentation:{reset(){}},sessionEpoch:0,sessionActive:false,canSave:true,runtimeHalted:false,entryView:'title',entryReturn:{modal:{kind:'aux-panel'}},entryIntent:null,entryOperation:'new',entrySnapshot:inspectStartRecord(storage),entryMessage:'',lastSavedText:oldRaw,game:old.game,
  pendingRecall:old.recallRecord,recallRecord:old.recallRecord,recallPreview:null,
  userPaused:old.userPaused,elapsed:old.elapsed,caskSlots:old.caskSlots,recentLedger:old.recentLedger,historyRecord:old.historyRecord,
  recallScenePlayer:{close(){if(failure==='before-game')throw injected('before-game');}},
  scene:{cancelDistillCompletion(){},resetMotion(){if(failure==='after-game')throw injected('after-game');}},
  paintEntry(){},recordSaveError(error,phase){errors.push({error,phase});},recordEntryFailure(...args){diagnostics.push(args);},clearEntryDiagnostic(){},protectedRecordExports(){},
  marketUI:{cancel(){},reset(){}},placementUI:null,countdown:{cancel(){counters.countdown++;}},stopClock(){counters.stop++;},manualDistilling:()=>false,debugSkipJob:null,debugSkipFeedback:'',
  historyData:null,historySnapshot:null,historyFactsSnapshot:null,deliveryNotice:'',roomFeedback:null,selectedProductId:null,rackKey:'',shelfKey:'',barrelKey:'',shadowObserver:null,
  dialogueNotice:{reset(){}},dialogueProjection:{reset(){}},distillRoom:{reset(){}},preview:false,
  // This is intentionally dangerous: if the actual lifecycle reaches save,
  // the old game is valid and the app's newly updated expected raw authorizes
  // overwriting the candidate. The failure fence must prevent the call.
  save(){counters.save++;writeCandidate(storage,FORMAL_SAVE_KEY,context.lastSavedText,oldRaw);},render(){},
 };
 vm.createContext(context);
 vm.runInContext(source('async function installSession(','\nlet newGameBackupKey='),context);
 vm.runInContext(source('function suspend(){','\nasync function resume(){'),context);
 context.sessionEntry=createSessionEntry({storage:()=>storage,
  create:()=>{if(createFailure)throw injected('create');return createFreshSession(native,42);},
  encode:session=>{if(encodeFailure)throw injected('encode');return encode(session);},
  read:raw=>readSession(raw,options),write:writeCandidate,replace:commitMarketRulesUpdate,
  async install(session,details){context.lastSavedText=details.text;context.session=session;context.fresh=details.fresh;await vm.runInContext('installSession(session,{fresh})',context);},
 });
 vm.runInContext(source('async function enterSession(',"\n$('entry-new')"),context);
 return {context,old,oldRaw,storage,values,writes,counters,errors,diagnostics,
  enter:()=>vm.runInContext(`enterSession('${kind}')`,context),suspend:()=>vm.runInContext('suspend()',context)};
}

test('actual continue application failure stays on title and cannot autosave an uninstalled game',async()=>{
 const h=harness({kind:'continue'}),old=JSON.stringify(h.old);
 assert.equal(await h.enter(),false);
 assert.equal(h.context.entryView,'error');assert.equal(h.context.sessionActive,false);assert.equal(h.context.canSave,false);assert.equal(h.context.runtimeHalted,true);
 assert.equal(h.storage.getItem(FORMAL_SAVE_KEY),h.oldRaw);assert.equal(JSON.stringify(h.old),old);assert.equal(h.writes.length,0);
 h.suspend();assert.equal(h.counters.save,0);assert.equal(h.storage.getItem(FORMAL_SAVE_KEY),h.oldRaw);
 assert(h.counters.stop>0);assert(h.counters.countdown>0);
 assert.equal(h.diagnostics.length,1);assert.equal(h.diagnostics[0][1].stage,'session-apply');assert.equal(h.diagnostics[0][0].code,'apply-before-game');
});

for(const failure of ['before-game','after-game'])test(`actual new-game application ${failure} failure preserves committed candidate without lifecycle rollback or mandatory backup`,async()=>{
 const h=harness({failure}),old=JSON.stringify(h.old),oldRecall=JSON.stringify(h.context.pendingRecall);
 assert.equal(await h.enter(),false);
 const candidateRaw=h.storage.getItem(FORMAL_SAVE_KEY),candidate=readSession(candidateRaw,options);
 assert.notEqual(candidateRaw,h.oldRaw);assert.equal(candidate.game.seed,42);
 const backupRows=[...h.values].filter(([key])=>key.startsWith(FORMAL_SAVE_KEY+'.before-market-rules.v1.'));
 assert.equal(backupRows.length,0);
 assert.equal(h.context.entryView,'error');assert.equal(h.context.sessionActive,false);assert.equal(h.context.canSave,false);assert.equal(h.context.runtimeHalted,true);
 assert.equal(h.diagnostics.length,1);assert.equal(h.diagnostics[0][1].stage,'session-apply');assert.equal(h.diagnostics[0][0].code,'apply-'+failure);
 assert.equal(JSON.stringify(h.old),old);
 if(failure==='before-game')assert.equal(JSON.stringify(h.context.pendingRecall),oldRecall);
 else assert.equal(h.context.pendingRecall.seed,42);
 const writesBefore=h.writes.length;h.suspend();h.suspend();
 assert.equal(h.counters.save,0);assert.equal(h.writes.length,writesBefore);assert.equal(h.storage.getItem(FORMAL_SAVE_KEY),candidateRaw);
 // A reload can use the committed candidate; old raw is intentionally replaced.
 // no failed-UI rollback may decide which record wins after the error.
 assert.equal(readSession(h.storage.getItem(FORMAL_SAVE_KEY),options).game.seed,42);
});

for(const failure of ['create','encode'])test(`actual candidate ${failure} failure does not touch old game, recall or formal bytes`,async()=>{
 const h=harness({failure:null,createFailure:failure==='create',encodeFailure:failure==='encode'}),old=JSON.stringify(h.old),recall=JSON.stringify(h.context.pendingRecall);
 assert.equal(await h.enter(),false);assert.equal(h.context.entryView,'error');assert.equal(h.context.sessionActive,false);
 assert.equal(JSON.stringify(h.old),old);assert.equal(JSON.stringify(h.context.pendingRecall),recall);assert.equal(h.storage.getItem(FORMAL_SAVE_KEY),h.oldRaw);assert.equal(h.writes.length,0);
 assert.equal(h.diagnostics.length,1);assert.equal(h.diagnostics[0][1].stage,failure==='create'?'candidate-create':'candidate-validation');
 h.suspend();assert.equal(h.counters.save,0);assert.equal(h.writes.length,0);
});
