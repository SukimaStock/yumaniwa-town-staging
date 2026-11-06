import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as D from '../partner-orders.mjs';
import {PARALLEL_PARAMETERS as T} from '../economy-parameters.mjs';
import {readSession,serializeSession,isCurrentSession,writeCandidate,FORMAL_SAVE_KEY} from '../development-save.mjs';
import {initializeCaskSlots,reconcileCaskSlots} from '../cask-slots.mjs';
import {migrateRecentLedger,advanceRecentLedger} from '../recent-ledger.mjs';
import {initializeHistoryRecord,advanceHistoryRecord} from '../history-record.mjs';
const source=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
function slice(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a,start);return source.slice(a,b);}
const code=slice('function rememberCommitted()','const displayProductStock')+'\n'+slice('function installSession(','window.amberPlacement=');
function harness(raw=null){
 const data=new Map([['unrelated-work','keep']]);if(raw!==null)data.set(FORMAL_SAVE_KEY,raw);
 const nodes=new Map();let writes=0,quota=false,approved=true,renders=0;
 const storage={getItem:key=>data.get(key)??null,setItem(key,value){if(quota)throw Object.assign(Error('full'),{name:'QuotaExceededError'});writes++;data.set(key,value);}};
 const noop=()=>{},reset={reset:noop},context=vm.createContext({
  D,T,readSession,serializeSession,isCurrentSession,writeCandidate,initializeCaskSlots,reconcileCaskSlots,migrateRecentLedger,advanceRecentLedger,initializeHistoryRecord,advanceHistoryRecord,
  game:null,userPaused:false,elapsed:0,caskSlots:[null,null,null,null],recentLedger:null,historyRecord:null,historyData:null,historySnapshot:null,historyFactsSnapshot:null,committedSession:null,lastSavedText:null,lastSaveError:null,legacyRecord:null,
  preview:false,debugEnabled:true,canSave:false,runtimeHalted:false,modal:null,localStorage:storage,SAVE_KEY:FORMAL_SAVE_KEY,
  sessionOptions:{restore:D.restoreDistillery,monthMs:T.monthMs,stepMs:T.distillStepMs},newNativeGame:()=>D.newMarketRulesDistillery(81),
  $:id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,open:false,textContent:'',addEventListener:noop,click:noop});return nodes.get(id);},
  confirm:()=>approved,vaultPanels:noop,stopClock:noop,storageNotice:text=>{context.notice=text;},render:()=>{renders++;},schedule:noop,
  countdown:{cancel:noop},distillRoom:reset,scene:{resetMotion:noop},marketUI:reset,placementUI:reset,feedbackComments:reset,automaticNews:reset,
  manualDistilling:()=>false,warehouseRoom:{selectedId:null,select(id){this.selectedId=id;}},mapUIStorage:()=>null,mapNoticeSave:noop,mapNoticeLoad:noop,MAP_VIEW_KEY:'map',
  exportRaw:noop,query:new URLSearchParams(),fetch:()=>{throw Error('unexpected fetch');}
 });
 vm.runInContext(code,context);
 return {context,data,nodes,run:text=>vm.runInContext(text,context),writes:()=>writes,renders:()=>renders,setQuota:value=>{quota=value;},approve:value=>{approved=value;}};
}
for(const raw of ['{broken',JSON.stringify({version:6}),JSON.stringify({version:5}),JSON.stringify({version:4}),JSON.stringify({version:3}),JSON.stringify({version:2})]){
 test(`unsupported/corrupt boot preserves original and permits confirmed restart: ${raw}`,async()=>{
  const h=harness(raw);await h.run('boot()');assert.equal(h.context.game,null);assert.equal(h.context.canSave,false);assert.equal(h.writes(),0);assert.equal(h.data.get(FORMAL_SAVE_KEY),raw);assert.equal(h.nodes.get('recovery').hidden,false);
  assert.equal(h.run('startNew()'),true);assert.equal(h.context.canSave,true);assert.equal(h.context.runtimeHalted,false);assert.equal(JSON.parse(h.data.get(FORMAL_SAVE_KEY)).version,7);assert.equal(h.data.get('unrelated-work'),'keep');
  assert.deepEqual(Array.from(h.context.caskSlots),[null,null,null,null]);assert.equal(h.context.elapsed,0);assert.equal(h.nodes.get('recovery').hidden,true);
 });
}
test('new game autosaves and a cold boot restores exact state, slots, ledger and clock',async()=>{
 const h=harness();await h.run('boot()');assert.equal(h.context.canSave,true);h.context.elapsed=T.distillStepMs;h.context.userPaused=true;assert.equal(h.run('save()'),true);
 const raw=h.data.get(FORMAL_SAVE_KEY),cold=harness(raw);await cold.run('boot()');assert.equal(cold.writes(),0);assert.equal(JSON.stringify(cold.context.game),JSON.stringify(h.context.game));assert.equal(cold.context.elapsed,T.distillStepMs);assert.equal(cold.context.userPaused,true);assert.equal(JSON.stringify(cold.context.recentLedger),JSON.stringify(h.context.recentLedger));assert.equal(JSON.stringify(cold.context.historyRecord),JSON.stringify(h.context.historyRecord));
});
test('cancel restart makes no changes even when saving is blocked',async()=>{
 const h=harness('old');await h.run('boot()');h.approve(false);assert.equal(h.run('startNew()'),false);assert.equal(h.writes(),0);assert.equal(h.data.get(FORMAL_SAVE_KEY),'old');assert.equal(h.context.game,null);assert.equal(h.context.canSave,false);
});
test('quota failure preserves committed game; confirmed restart succeeds once storage is available',async()=>{
 const h=harness();await h.run('boot()');const game=h.context.game,raw=h.data.get(FORMAL_SAVE_KEY);h.setQuota(true);assert.equal(h.run('save()'),false);assert.equal(h.context.canSave,false);assert.equal(h.run('startNew()'),false);assert.equal(h.context.game,game);assert.equal(h.data.get(FORMAL_SAVE_KEY),raw);assert.equal(h.context.lastSaveError.code,'QuotaExceededError');assert.equal(h.nodes.get('save-status').textContent,'未保存');
 h.setQuota(false);assert.equal(h.run('startNew()'),true);assert.equal(h.context.canSave,true);assert.equal(h.context.lastSaveError,null);
});
test('quota failure from corrupt boot does not erase original or claim success',async()=>{
 const h=harness('broken');await h.run('boot()');h.setQuota(true);assert.equal(h.run('startNew()'),false);assert.equal(h.context.game,null);assert.equal(h.data.get(FORMAL_SAVE_KEY),'broken');assert.equal(h.context.canSave,false);
});
test('restart never overwrites another tab after this tab observed its save',async()=>{
 const h=harness();await h.run('boot()');const game=h.context.game;h.data.set(FORMAL_SAVE_KEY,'other-tab');assert.equal(h.run('startNew()'),false);assert.equal(h.data.get(FORMAL_SAVE_KEY),'other-tab');assert.equal(h.context.game,game);assert.equal(h.context.lastSaveError.code,'conflict');
});
for(const text of ['broken',JSON.stringify({version:5})])test('invalid debug import leaves a healthy game usable: '+text,async()=>{
 const h=harness();await h.run('boot()');const game=h.context.game,raw=h.data.get(FORMAL_SAVE_KEY);h.context.file={text:async()=>text};assert.equal(await h.run('importRecord(file)'),false);assert.equal(h.context.game,game);assert.equal(h.context.canSave,true);assert.equal(h.context.runtimeHalted,false);assert.equal(h.data.get(FORMAL_SAVE_KEY),raw);assert.equal(h.run('save()'),true);
});
test('debug import is inaccessible outside debug mode',async()=>{
 const h=harness();await h.run('boot()');h.context.debugEnabled=false;h.context.file={text:()=>{throw Error('must not read');}};assert.equal(await h.run('importRecord(file)'),false);
});

for(const key of ['sukimastock.ambertime.placement-trial.v1','sukimastock.ambertime.wholesale.v20'])test('legacy key is exportable, never auto-converted or deleted: '+key,async()=>{
 const h=harness();h.data.set(key,'original legacy');await h.run('boot()');assert.equal(h.context.game,null);assert.equal(h.writes(),0);assert.equal(h.nodes.get('recovery-export').hidden,false);assert.equal(h.context.legacyRecord.raw,'original legacy');
 assert.equal(h.run('startNew()'),true);assert.equal(h.data.get(key),'original legacy');assert.equal(h.context.legacyRecord,null);assert.equal(JSON.parse(h.data.get(FORMAL_SAVE_KEY)).version,7);
});
test('legacy-key concurrent change prevents confirmed replacement',async()=>{
 const h=harness(),key='sukimastock.ambertime.placement-trial.v1';h.data.set(key,'old');await h.run('boot()');h.data.set(key,'new from other tab');assert.equal(h.run('startNew()'),false);assert.equal(h.data.has(FORMAL_SAVE_KEY),false);assert.equal(h.data.get(key),'new from other tab');assert.equal(h.context.lastSaveError.code,'conflict');
});
