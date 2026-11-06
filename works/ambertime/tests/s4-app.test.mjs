import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {NODES} from '../town-connection.mjs';
import * as D from '../partner-orders.mjs';
import {PARALLEL_PARAMETERS as T} from '../economy-parameters.mjs';
import {extractionMaximum} from '../ui-details.mjs';
const source=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
function slice(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a,`review extraction ${start}`);return source.slice(a,b);}
const json=x=>JSON.parse(JSON.stringify(x));
function viewHarness(){
 let reads=0;
 const context=vm.createContext({game:{core:{month:24},releases:[],brands:[]},modal:{kind:'history',year:'2028'},
  historyRecordView:(game,record)=>{reads++;return {...record,elapsedMonths:game.core.month};},
  Worker:class{constructor(){throw Error('history must not create a worker');}},D:{replayDistilleryOperations:()=>{throw Error('history must not replay');}},
  monthLabel:m=>`${2026+Math.floor(m/12)}年${m%12+1}月`,generationName:id=>id===1?'初代':`${id}代`,esc:String,
  button:(label,action,id)=>`<button data-action="${action}" data-id="${id}">${label}</button>`,
  historyEventText:e=>e.label,render:()=>{},schedule:()=>{},stopClock:()=>{},rememberLedger:()=>context.modal
 });
 vm.runInContext(slice('// Display reads committed facts','function openHistory()'),context);
 vm.runInContext(slice('function historyYearEvents(year){','function historyBrandView('),context);
 return {context,run:code=>vm.runInContext(code,context),reads:()=>reads};
}
test('opening and reopening history reads committed facts without worker or replay; month and facts invalidate view',()=>{
 const h=viewHarness();h.context.facts={events:[],generations:[],coverage:{complete:true}};h.run('historyRecord=facts; readHistory(); readHistory()');assert.equal(h.reads(),1);
 h.run('game={...game,core:{month:25}};readHistory()');assert.equal(h.reads(),2);assert.equal(h.run('historyData.elapsedMonths'),25);
 h.context.next={...h.context.facts,events:[{id:'new'}]};h.run('historyRecord=next;readHistory()');assert.equal(h.reads(),3);assert.equal(h.run('historyData.events[0].id'),'new');
 assert.doesNotMatch(slice('// Display reads committed facts','function openHistory()'),/new Worker|postMessage|replayDistilleryOperations|snapshot\(/);
 assert.doesNotMatch(source,/history-worker\.mjs|prepareLedgerWorkers/);
});
test('same-month sequence and historical generation remain visible; annual list does not paginate',()=>{
 const h=viewHarness();const events=Array.from({length:55},(_,i)=>({id:`release:${100-i}`,month:24,generationNumber:i<2?1:2,label:`酒${i}`,productId:500+i}));
 h.context.facts={events};h.run('historyRecord=facts;readHistory()');const html=h.run("historyYearEvents('2028')");
 assert.equal((html.match(/data-history-event=/g)||[]).length,55);assert(html.indexOf('release:100')<html.indexOf('release:99'));assert(html.indexOf('release:99')<html.indexOf('release:98'));
 assert.match(html,/2028年1月 · 初代/);assert.match(html,/2028年1月 · 2代/);assert.match(html,/data-action="history-release" data-id="500"/);assert.doesNotMatch(html,/history-page|history-pagination|たる[1-4]/);
});
test('history release navigation uses product identity to locate release and returns to original year and scroll',()=>{
 const branch=source.split("\n").find(line=>line.startsWith(" if(a==='history-release'"));
 const parent={kind:'history',year:'2032',scrollTop:143},nodes={};let focus;
 const context=vm.createContext({game:{releases:[{id:91,productId:37},{id:37,productId:91}]},modal:parent,rememberLedger:()=>parent,render:()=>{},schedule:()=>{},restoreLedger:id=>{focus=id;}});
 vm.runInContext('function open(a,kind,id,b){'+branch+'}\n'+source.split('\n').find(line=>line.startsWith('function closeComparison(){')),context);
 vm.runInContext("open('history-release','history',37,{id:'release-link'})",context);
 assert.equal(context.modal.kind,'ledger-release');assert.equal(context.modal.key,'release:91');assert.equal(context.modal.parent,parent);
 vm.runInContext('closeComparison()',context);assert.equal(context.modal,parent);assert.equal(context.modal.year,'2032');assert.equal(context.modal.scrollTop,143);assert.equal(focus,'release-link');
 vm.runInContext("open('history-release','history',999,{id:'missing'})",context);assert.equal(context.modal,parent);
});
function savingHarness(){
 const before={operations:[1],tag:'before'},after={operations:[1,2],tag:'after'},facts={events:[{id:'founding'}]},nodes=new Map();let saved;
 const c=vm.createContext({game:before,userPaused:false,elapsed:0,caskSlots:[37,null,null,null],recentLedger:{tag:'ledger'},historyRecord:facts,committedSession:null,
  preview:false,canSave:true,lastSaveError:null,legacyRecord:null,isCurrentSession:()=>true,lastSavedText:'old',runtimeHalted:false,modal:null,
  $:id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,open:false,textContent:''});return nodes.get(id);},vaultPanels:()=>{},stopClock:()=>{},storageNotice:()=>{},
  advanceRecentLedger:()=>({tag:'new-ledger'}),migrateRecentLedger:()=>{throw Error('unexpected ledger replay');},
  advanceHistoryRecord:(a,b,old)=>{assert.equal(a,before);assert.equal(b,after);assert.equal(old,facts);return {events:[...old.events,{id:'release:1'}]};},initializeHistoryRecord:()=>{throw Error('unexpected history reconstruction');},
  reconcileCaskSlots:()=>[37,42,null,null],serializeSession:(g,ui)=>JSON.stringify({game:g,...ui}),D:{},T:{monthMs:1000,distillStepMs:100},
  localStorage:{},SAVE_KEY:'formal',writeCandidate:(_s,_k,expected,text)=>{assert.equal(expected,'old');saved=text;}
 });
 vm.runInContext(slice('function rememberCommitted()','const displayProductStock'),c);vm.runInContext('rememberCommitted()',c);
 return {context:c,before,after,facts,run:code=>vm.runInContext(code,c),saved:()=>saved};
}
test('history is published only after the same candidate write as game and notebook',()=>{
 const h=savingHarness();h.context.game=h.after;h.context.next=h.after;
 h.context.writer=(_s,_k,expected,text)=>{assert.equal(expected,'old');assert.equal(h.context.historyRecord,h.facts);assert.equal(JSON.parse(text).historyRecord.events[1].id,'release:1');};
 assert.equal(h.run('saveCandidate(next,false,0,writer)'),true);assert.deepEqual(json(h.context.historyRecord.events.map(e=>e.id)),['founding','release:1']);assert.equal(h.context.committedSession.historyRecord,h.context.historyRecord);
});
test('quota and conflict rollback restore history with game, slots, notebook and clock',()=>{
 for(const code of ['QuotaExceededError','conflict']){
  const h=savingHarness();h.context.game=h.after;h.context.next=h.after;h.context.elapsed=100;
  h.context.writer=()=>{throw Object.assign(Error(code),{code});};
  assert.equal(h.run('saveCandidate(next,false,100,writer)'),false);assert.equal(h.context.game,h.before);assert.equal(h.context.historyRecord,h.facts);assert.equal(h.context.recentLedger.tag,'ledger');assert.equal(h.context.elapsed,0);assert.deepEqual(json(h.context.caskSlots),[37,null,null,null]);assert.equal(h.context.canSave,false);assert.equal(h.context.lastSavedText,'old');
 }
});

test('milestone sentences distinguish first release, age record, first contact and evidenced return',()=>{
 const region=NODES.find(r=>r.level!=='町');assert(region);
 const c=vm.createContext({HISTORY_REGIONS:NODES,generationName:id=>`${id}代`,ageLabel:n=>`${n}か月熟成`,shopName:id=>id==='town-liquor'?'町の酒店':id});
 vm.runInContext(slice('function historyEventText(e){','function historyView(){'),c);
 const text=e=>{c.event=e;return vm.runInContext('historyEventText(event)',c);};
 assert.equal(text({kind:'generation-start'}),'蒸留所を始めた。');
 assert.equal(text({kind:'generation-handover',nextGeneration:2}),'2代へ蒸留所を引き継いだ。');
 assert.equal(text({kind:'distillation'}),'初めての蒸留を終えた。');
 assert.match(text({kind:'bottling',firstRelease:true,longestAge:true,age:12,count:20}),/^初めてのウイスキーを発売した。12か月熟成 · 20本$/);
 assert.match(text({kind:'bottling',firstRelease:false,longestAge:true,brandName:'琥珀',age:24,count:15}),/^琥珀を発売した。24か月熟成 · 15本 · 最長熟成$/);
 assert.equal(text({kind:'shop-start',shopId:'town-liquor'}),'町の酒店で取扱いが始まった。');
 assert.equal(text({kind:'shop-anniversary',shopId:'town-liquor',years:20}),'町の酒店への納品が20年にわたった。');
 assert.equal(text({kind:'region-reached',regionId:region.id}),`${region.name}へ初めて評判が届いた。`);
 for(const kind of ['inquiry','visit']){
  assert.match(text({kind,regionId:region.id,first:true}),/初めて/);
  assert.match(text({kind,regionId:region.id,first:false,afterMonths:120}),/久しぶりに/);
 }
 assert.equal(text({kind:'department-adoption',projectName:'冬の特選'}),'冬の特選に採用された。');
 assert.equal(text({kind:'special-order-fulfilled'}),'特別注文の酒を届けた。');
 // Unknown names are not invented: fallback is the stored identity; persistence validates that identity.
 assert.equal(text({kind:'region-reached',regionId:'test-region'}),'test-regionへ初めて評判が届いた。');
});

function nearCompletion(){
 let game=D.startDistillation(D.newMarketRulesDistillery(81));
 for(let i=0;i<100&&game.still.distillation.progress<36;i++)game=D.distillStep(game);
 game=D.beginCollection(game);
 for(let i=0;i<100&&game.still.distillation.progress<extractionMaximum-1;i++)game=D.distillStep(game);
 assert.equal(game.still.distillation.progress,extractionMaximum-1);return game;
}
function timerHarness({elapsed=T.monthMs-T.distillStepMs,fail=false}={}){
 const initial=nearCompletion(),saves=[],calls=[];let callback;
 const c=vm.createContext({game:initial,elapsed,userPaused:false,T,D:{...D,tickDistillery:(game,month)=>{calls.push('tick');return D.tickDistillery(game,month);}},generation:0,timer:null,
  stopClock:()=>{c.generation++;},blocked:()=>false,hasMonthlyWork:()=>true,setTimeout:fn=>{callback=fn;return 1;},
  wallClock:{delay:()=>0},performance:{now:()=>0},playbackRate:1,manualDistilling:()=>true,
  atExtractionLimit:()=>c.game.still.phase==='distilling'&&!D.collectionState(c.game).fullRange&&c.game.still.distillation.progress>=extractionMaximum,
  heldRange:()=>false,save:()=>c.saveCandidate(c.game,c.userPaused,c.elapsed),saveCandidate:(game,paused,time)=>{calls.push('save');saves.push({game,elapsed:time});if(fail){c.game=initial;c.runtimeHalted=true;return false;}return true;},
  restoreCommitted:()=>{},generationState:()=>D.generationStatus(c.game),runtimeHalted:false,message:()=>{},storageNotice:text=>{throw Error(text);},render:()=>{},renderProgress:()=>{},
  automaticNews:{push:()=>{}},automaticEvents:()=>[],caskName:()=>'',soldOutLabel:()=>'',noteMapReach:()=>{},marketUI:{consume:()=>{}},modal:null,room:'distill'
 });
 vm.runInContext(slice('function schedule(continuing=false){','function act('),c);vm.runInContext('schedule()',c);callback();return {context:c,initial,saves,calls};
}
test('timer saves actual completion month before tick and preserves formal result and elapsed on success',()=>{
 const h=timerHarness(),stopped=D.stopDistillation(D.distillStep(h.initial)),expected=D.tickDistillery(stopped,h.initial.core.month);
 assert.deepEqual(h.calls,['save','tick','save']);assert.equal(h.saves[0].game.still.phase,'filling');assert.equal(h.saves[0].game.core.month,h.initial.core.month);assert.equal(h.saves[0].elapsed,T.monthMs-T.distillStepMs);
 assert.deepEqual(h.context.game,expected);assert.equal(h.context.elapsed,0);assert.equal(h.saves[1].elapsed,0);assert.equal(h.saves[1].game.core.month,expected.core.month);
});
test('failed completion save prevents monthly tick and further clock advancement',()=>{
 const h=timerHarness({fail:true});assert.deepEqual(h.calls,['save']);assert.equal(h.context.game,h.initial);assert.equal(h.context.elapsed,T.monthMs-T.distillStepMs);assert.equal(h.context.runtimeHalted,true);
});

test('completion away from month boundary saves once with the completed-step clock',()=>{
 const h=timerHarness({elapsed:0}),expected=D.stopDistillation(D.distillStep(h.initial));
 assert.deepEqual(h.calls,['save']);assert.deepEqual(h.context.game,expected);assert.equal(h.context.elapsed,T.distillStepMs);assert.equal(h.saves[0].elapsed,h.context.elapsed);assert.equal(h.saves[0].game.core.month,h.initial.core.month);
});
