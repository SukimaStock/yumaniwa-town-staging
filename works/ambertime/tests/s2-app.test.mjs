import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
const slice=(start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a,`review extraction: ${start}`);return source.slice(a,b);};
const ledgerCode=slice('// Normal ledger views','function finishLedgerTasting');
const json=x=>JSON.parse(JSON.stringify(x));
function ledgerHarness(view){
 let reads=0;
 const context=vm.createContext({game:{recipeBook:{entries:[],selectedId:null},notesById:{}},modal:{caskId:37},
  recentLedgerView:()=>{reads++;return view;},P:{casks:{refill:{short:'リフィル'}}},uiText:x=>x,barrel:()=>'<svg/>',esc:String,
  caskSlots:[37,null,42,null],caskSlotMap:slots=>new Map(slots.flatMap((id,i)=>id===null?[]:[[id,i+1]])),
  caskName:id=>'たる'+({37:1,42:3}[id]),pastCaskName:(_id,r)=>r.filledMonth+'月の仕込み',monthLabel:x=>x+'月',ageLabel:x=>x+'か月',
  known:(x,fn=String)=>Number.isFinite(x)?fn(x):'記録なし',extractionMaximum:100,BREWING_CARDS:[],
  copyFacts:rows=>JSON.stringify(rows),ledgerProfile:p=>p?'原酒あり':'原酒なし',FLAVOR_AXES:[],
  button:(label,action,id)=>`<button data-action="${action}" data-id="${id}">${label}</button>`,
  D:{staffStatus:()=>({hired:true}),staffQuote:()=>({ok:true})},
  Worker:class{constructor(){throw Error('normal ledger must not create worker');}},ledgerData:()=>{throw Error('must not project all releases');}
 });
 vm.runInContext(ledgerCode,context);return {context,run:code=>vm.runInContext(code,context),reads:()=>reads};
}
const recipe=(id,extra={})=>({caskId:id,type:'refill',filledMonth:id,stopAt:40,source:{caskId:id,flavorChoice:{start:.2,end:.4,collectionVersion:2}},initialProfile:{wood:0},...extra});
test('old saved recipe remains usable without retained cask and never projects releases',()=>{
 const saved=recipe(7,{id:'recipe-7',name:'好きな製法',saved:true});
 const h=ledgerHarness({recipes:{recent:[recipe(37)],saved:[saved],latestManual:recipe(37)},casks:[],coverage:{complete:true}});
 h.context.modal.caskId=7;const html=h.run('ledgerRecipeDetail()');
 assert.match(html,/好きな製法/);assert.match(html,/data-action="recipe-select" data-id="recipe-7"/);
 assert.match(html,/data-action="ledger-recipe-request" data-id="7"/);assert.match(html,/比べる/);
 assert.doesNotMatch(html,/data-action="ledger-cask-open"/);assert.match(html,/原酒あり/);
});
test('recent and saved references deduplicate, normal lists have no pagination or replay',()=>{
 const recent=Array.from({length:8},(_,i)=>recipe(i+30)),saved=[recipe(31,{id:'saved31',saved:true,name:'重複'}),...Array.from({length:24},(_,i)=>recipe(i+1,{id:'saved'+i,saved:true}))];
 const h=ledgerHarness({recipes:{recent,saved,latestManual:recent.at(-1)},casks:[],coverage:{complete:true}});
 const rows=json(h.run('recipeRows()'));assert.equal(rows.length,32);assert.equal(rows.filter(r=>r.caskId===31).length,1);assert.equal(rows.find(r=>r.caskId===31).savedRecipes.length,1);
 const html=h.run('ledgerRecipeList()');assert.equal((html.match(/data-action="ledger-recipe-open"/g)||[]).length,32);
 assert.doesNotMatch(html,/ledger-list-page|次の20件|記録を読んでいます/);assert.equal(h.reads(),1);
 h.run('caskData(); caskData()');assert.equal(h.reads(),1);
 h.run('recentLedger={changed:true}; caskData()');assert.equal(h.reads(),2);
});
test('current casks follow slot positions while ended casks use provenance',()=>{
 const h=ledgerHarness({recipes:{recent:[],saved:[]},casks:[{...recipe(8),status:'bottled',age:12},{...recipe(42),status:'aging',age:3},{...recipe(37),status:'aging',age:4}],coverage:{complete:true}});
 const html=h.run('ledgerCaskList()');assert(html.indexOf('ledger-cask-37')<html.indexOf('ledger-cask-42'));assert(html.indexOf('ledger-cask-42')<html.indexOf('ledger-cask-8'));
 assert.match(html,/たる1/);assert.match(html,/たる3/);assert.match(html,/8月の仕込み/);assert.doesNotMatch(html,/たる8|ledger-list-page/);
});
test('related release links use stored identities without building the release ledger',()=>{
 const h=ledgerHarness({recipes:{recent:[],saved:[]},casks:[]});const html=h.run("linkedReleases({releaseKeys:['release:3','release:9']})");
 assert.match(html,/data-id="release:3"/);assert.match(html,/data-id="release:9"/);
});
const saveCode=slice('function rememberCommitted()','const displayProductStock');
function savingHarness(){
 const before={operations:[1],tag:'before'},after={operations:[1,2],tag:'after'},facts={tag:'old'},nodes=new Map();let passedBefore,writes=0;
 const context=vm.createContext({game:before,userPaused:false,elapsed:0,caskSlots:[37,null,null,null],recentLedger:facts,committedSession:null,
  preview:false,canSave:true,lastSaveError:null,legacyRecord:null,isCurrentSession:()=>true,lastSavedText:'old',runtimeHalted:false,modal:null,
  $:id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,open:false,textContent:''});return nodes.get(id);},vaultPanels:()=>{},stopClock:()=>{},storageNotice:()=>{},
  advanceRecentLedger:(a,b,old)=>{passedBefore=a;assert.equal(old,facts);return {tag:b.tag};},migrateRecentLedger:next=>({tag:next.tag}),
  reconcileCaskSlots:()=>[37,42,null,null],serializeSession:(g,ui)=>JSON.stringify({game:g,...ui}),D:{},T:{monthMs:1000,distillStepMs:100},
  localStorage:{},SAVE_KEY:'formal',writeCandidate:()=>{writes++;}
 });
 vm.runInContext(saveCode,context);vm.runInContext('rememberCommitted()',context);return {context,before,after,facts,run:code=>vm.runInContext(code,context),passedBefore:()=>passedBefore,writes:()=>writes};
}
test('clock mutation uses committed before and publishes facts only after successful save',()=>{
 const h=savingHarness();h.context.game=h.after;h.context.next=h.after;
 h.context.writer=(_s,_k,expected,text)=>{assert.equal(expected,'old');assert.equal(h.context.recentLedger,h.facts);const value=JSON.parse(text);assert.equal(value.recentLedger.tag,'after');assert.deepEqual(value.caskSlots,[37,42,null,null]);};
 assert.equal(h.run('saveCandidate(next,false,0,writer)'),true);assert.equal(h.passedBefore(),h.before);assert.equal(h.context.recentLedger.tag,'after');
 assert.equal(h.context.committedSession.game,h.after);assert.equal(h.context.committedSession.recentLedger,h.context.recentLedger);
});
test('quota or conflict failure restores game, slots and facts together',()=>{
 for(const message of ['quota','conflict']){
  const h=savingHarness();h.context.game=h.after;h.context.next=h.after;h.context.writer=()=>{throw Error(message);};
  assert.equal(h.run('saveCandidate(next,false,0,writer)'),false);assert.equal(h.context.game,h.before);assert.equal(h.context.recentLedger,h.facts);assert.deepEqual(json(h.context.caskSlots),[37,null,null,null]);assert.equal(h.context.lastSavedText,'old');assert.equal(h.context.canSave,false);assert.equal(h.context.runtimeHalted,true);
 }
});
test('preview advances facts from committed state without storage writes',()=>{
 const h=savingHarness();h.context.preview=true;h.context.game=h.after;
 assert.equal(h.run('save()'),true);assert.equal(h.passedBefore(),h.before);assert.equal(h.context.recentLedger.tag,'after');assert.equal(h.writes(),0);
});
test('boot-upgraded display facts cannot become the starting point of a second candidate transition',()=>{
 for(const fails of [false,true]){
  const h=savingHarness();h.context.game=h.after;h.context.next=h.after;
  // Boot displays an enabled-stage game before the old session's confirmation.
  // Its display facts differ from the durable committed snapshot.
  h.context.recentLedger={tag:'display-upgraded'};
  h.context.writer=()=>{if(fails)throw Error('quota');};
  assert.equal(h.run('saveCandidate(next,false,0,writer)'),!fails);
  assert.equal(h.passedBefore(),h.before);
  if(fails){assert.equal(h.context.game,h.before);assert.equal(h.context.recentLedger,h.facts);}
  else{assert.equal(h.context.recentLedger.tag,'after');assert.equal(h.context.committedSession.recentLedger,h.context.recentLedger);}
 }
});
