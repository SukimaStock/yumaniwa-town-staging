import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {writeCandidate} from '../placement-save.mjs';
import {createMarketUI,savedMarketSales,visibleMarketRows,compactReleaseDate} from '../market-ui.mjs';
const fixture=()=>({core:{month:4,products:[{id:7,stock:5,flavor:{primary:'fruit',label:'果実香が強い'}},{id:9,stock:4,flavor:{primary:'smoke',label:'煙の香り'}}]},releases:[{id:3,productId:7,brandId:1,bottledMonth:2},{id:4,productId:9,brandId:1,bottledMonth:3}],brands:[{id:1,name:'AmberTime'}],productsById:{},shop:{relations:[{shopId:'town-liquor',brandId:1}]},retail:{7:1,9:0},assigned:{7:2,9:1}});
const model={
 storeMarketInventory:(s,id)=>({hand:s.core.products.find(p=>p.id===id).stock-(s.retail[id]??0)-(s.assigned[id]??0)-(s.held?.[id]??0),retail:s.retail[id]??0,shops:{'town-liquor':s.assigned[id]??0,supermarket:0}}),
 storeMarketRows:(s,shop)=>shop==='town-liquor'?Object.entries(s.assigned).filter(([,n])=>n>0).map(([id,count])=>({productId:Number(id),count})):[],
 storeMarketQuote:()=>({ok:true}),
 assignStoreProduct:(s,{productId,count})=>({...s,assigned:{...s.assigned,[productId]:(s.assigned[productId]??0)+count}}),
 returnStoreProduct:(s,{productId})=>({...s,assigned:{...s.assigned,[productId]:0}}),
 setMarketRetail:(s,{productId,count})=>({...s,retail:{...s.retail,[productId]:count}})
};
test('all real release rows remain independent of current selection; sold-out receipts have bounded display rows',()=>{
 const s=fixture();assert.deepEqual(visibleMarketRows(s,model,'town-liquor').map(x=>[x.productId,x.count]),[[7,2],[9,1]]);
 const next={...s,assigned:{7:0,9:1}};const receipts=[{shopId:'town-liquor',productId:7,count:2}];
 assert.deepEqual(visibleMarketRows(next,model,'town-liquor',receipts).map(x=>[x.productId,x.count,x.sold]),[[7,0,2],[9,1,0]]);
 assert.deepEqual(visibleMarketRows(next,model,'town-liquor').map(x=>x.productId),[9]);
 assert.deepEqual(visibleMarketRows(s,model,'retail').map(x=>[x.productId,x.count]),[[7,1]]);
});
test('sale feedback accepts only a newly persisted month and ordinary channels, never department deliveries or reload',()=>{
 const before=fixture(),after=structuredClone(before);after.core.month=5;after.core.lastMonth={month:5,sales:[{id:7,sold:1,revenue:12},{id:9,sold:2,revenue:25,channel:'stockist',shopId:'town-liquor'},{id:7,sold:1,revenue:16,channel:'stockist',shopId:'department'},{id:9,sold:0,revenue:0,channel:'stockist',shopId:'supermarket'}]};
 assert.deepEqual(savedMarketSales(before,after),[{productId:7,shopId:'retail',count:1,revenue:12,month:5},{productId:9,shopId:'town-liquor',count:2,revenue:25,month:5}]);
 assert.deepEqual(savedMarketSales(after,after),[]);assert.deepEqual(savedMarketSales(null,after),[]);
});
function harness({saved=true,geometry=false}={}){
 globalThis.matchMedia=()=>({matches:true,addEventListener(){}});globalThis.window={addEventListener(){}};
 let current=fixture(),editing=false;const notices=[],savedNotices=[],opened=[],listeners=new Map();
 const root={hidden:true,style:{setProperty(){}},scrollTop:0,innerHTML:'',contains:()=>true,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(type,fn,capture=false)=>listeners.set(type+(capture?':capture':''),fn)};
 const scene={dataset:{viewport:JSON.stringify({scale:1,offsetX:0,offsetY:0})}};
 const overlays=[],history=[],box={left:10,right:340,top:100,bottom:500,width:330,height:400};
 if(geometry){
  const anchor={getBoundingClientRect:()=>({left:100,right:130,top:150,bottom:174,width:30,height:24})};
  const bottle={getBoundingClientRect:()=>({left:70,right:94,top:150,bottom:182,width:24,height:32}),innerHTML:'<svg></svg>'};
  root.getBoundingClientRect=()=>box;root.append=el=>{overlays.push(el);history.push(el);};
  root.querySelector=selector=>selector.includes('market-release=')?(selector.includes('market-count')?(model.storeMarketInventory(current,Number(selector.match(/market-release="(\d+)/)?.[1])).hand>0?anchor:null):bottle):null;
  root.querySelectorAll=selector=>selector.includes('market-delta')?[...overlays]:[];
  root.stockRow={closest:()=>null,querySelector:selector=>selector==='.market-count'?anchor:null};
 }
 const doc={hidden:false,activeElement:null,body:{append:node=>assert.equal(node,root)},getElementById:id=>id==='market-board'?root:id==='scene-root'?scene:geometry&&id.startsWith('market-stock-')?root.stockRow:null,createElement(){return {style:{},dataset:{},setAttribute(){},getBoundingClientRect:()=>({width:28,height:24}),remove(){const index=overlays.indexOf(this);if(index>=0)overlays.splice(index,1);}};},addEventListener(){}};
 const ui=createMarketUI({document:doc,model,state:()=>current,art:()=>'<svg></svg>',act:fn=>{const next=fn(current);if(saved)current=next;return saved;},openProduct(){},openStockist:id=>opened.push(id),announce:t=>notices.push(t),announceSaved:t=>savedNotices.push(t),setEditing:v=>editing=v});
 function click(dataset){listeners.get('click')({target:{closest:()=>({dataset,disabled:false})}});}
 return {ui,root,scene,click,overlays,history,read:()=>current,editing:()=>editing,notices,savedNotices,opened,listeners};
}
test('a failed transaction does not create a placement success; a valid return uses its own action channel',()=>{
 const failed=harness({saved:false});failed.ui.update({visible:true});failed.click({marketPlace:'town-liquor'});assert.equal(failed.read().assigned[7],2);assert.deepEqual(failed.notices,[]);assert.equal(failed.ui.diagnostics().motions,0);
 const h=harness();h.ui.update({visible:true});h.click({marketStock:'town-liquor:9'});assert(h.editing());assert.equal(h.ui.diagnostics().editing.productId,9);h.click({marketConfirm:'return'});assert.equal(h.read().assigned[9],0);assert.equal(h.read().assigned[7],2);assert.equal(h.ui.diagnostics().selected,7);assert(!h.editing());assert.match(h.notices.at(-1),/1本/);
});
test('hidden board ignores stale actions and drag capture suppresses the synthetic placement click',()=>{
 const h=harness();h.ui.update({visible:false});h.click({marketPlace:'town-liquor'});assert.equal(h.read().assigned[7],2);
 h.ui.update({visible:true});h.listeners.get('pointerdown')({pointerId:1,clientX:50,clientY:50,isPrimary:true});h.listeners.get('pointermove')({pointerId:1,clientX:10,clientY:50});h.listeners.get('pointerup')({pointerId:1});let stopped=false;
 h.listeners.get('click:capture')({detail:1,preventDefault(){},stopImmediatePropagation(){stopped=true;}});assert(stopped);assert.equal(h.read().assigned[7],2);
});

test('interrupted sale flight still expires its receipt rows instead of retaining sold-out placeholders',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const h=harness();h.ui.update({visible:true});const before=fixture(),after=structuredClone(before);after.core.month=5;after.core.lastMonth={month:5,sales:[{id:7,sold:2,revenue:24,channel:'stockist',shopId:'town-liquor'}]};
 h.ui.consume(before,after);h.ui.cancel();assert.equal(h.ui.diagnostics().feedback.length,1);
 await Promise.resolve();await Promise.resolve();t.mock.timers.tick(2401);
 assert.equal(h.ui.diagnostics().feedback.length,0);assert.equal(h.ui.diagnostics().motions,0);
});

test('published Canvas viewport realigns a paused board after window or visual viewport changes',()=>{
 let callback,watched,options;
 const previous=globalThis.MutationObserver;
 globalThis.MutationObserver=class{constructor(fn){callback=fn;}observe(node,opts){watched=node;options=opts;}};
 try{
  const h=harness();h.ui.update({visible:true});assert.equal(h.root.style.left,'12px');assert.equal(watched,h.scene);assert.deepEqual(options.attributeFilter,['data-viewport']);
  // Canvas updates after the board's window listener and also publishes visual
  // viewport-only changes, without any game operation or clock tick.
  h.scene.dataset.viewport=JSON.stringify({scale:2,offsetX:30,offsetY:14});callback();
  assert.equal(h.root.style.left,'54px');assert.equal(h.root.style.top,'212px');assert.equal(h.root.style.width,'672px');assert.equal(h.root.style.height,'auto');assert.equal(h.root.style.maxHeight,'834px');
 }finally{if(previous===undefined)delete globalThis.MutationObserver;else globalThis.MutationObserver=previous;}
});

test('persistent funds and generation notices render above operable shelves and clear on the next root notice',()=>{
 const h=harness();h.ui.update({visible:true,notice:'資金を残して停止しています。<案内>'});
 assert.match(h.root.innerHTML,/class="market-notice" role="status"/);assert.match(h.root.innerHTML,/停止しています。&lt;案内&gt;/);
 assert(h.root.innerHTML.indexOf('market-notice')<h.root.innerHTML.indexOf('market-releases'));
 assert.match(h.root.innerHTML,/data-market-place="town-liquor"/);
 h.ui.update({visible:true,notice:''});assert.doesNotMatch(h.root.innerHTML,/class="market-notice"/);
});


test('hand bottles use real release dates without brand select, serials, locked badges or special footer',()=>{
 const h=harness();h.ui.update({visible:true});
 assert.match(h.root.innerHTML,/data-market-release="7"/);assert.match(h.root.innerHTML,/class="market-date">2026\/3/);
 assert.equal((h.root.innerHTML.match(/data-market-portion=/g)||[]).length,3);
 assert.doesNotMatch(h.root.innerHTML,/<select|#\d|第\d+回|取扱前|デパート|瓶詰めした一本が並びます/);
 assert.match(h.root.innerHTML,/data-market-details="retail"/);
 h.click({marketRelease:'9'});assert.equal(h.ui.diagnostics().selected,9);
 h.click({marketRelease:'999'});assert.equal(h.ui.diagnostics().selected,9);
 h.click({marketStock:'town-liquor:7'});assert.match(h.root.innerHTML,/class="market-content" inert/);
 h.click({marketRelease:'7'});assert.equal(h.ui.diagnostics().selected,9);
 h.click({marketCancel:'return'});assert.doesNotMatch(h.root.innerHTML,/class="market-content" inert/);
});

test('placing all targets the original bottle even when the hand selection moves, and return restores it independently',()=>{
 const h=harness();h.ui.update({visible:true});h.click({marketPortion:'all'});h.click({marketPlace:'town-liquor'});
 assert.equal(h.read().assigned[7],4);assert.equal(h.read().assigned[9],1);assert.equal(h.ui.diagnostics().selected,9);
 assert.doesNotMatch(h.root.innerHTML,/data-market-release="7"/);assert.match(h.root.innerHTML,/data-market-stock="town-liquor:7"/);
 h.click({marketStock:'town-liquor:7'});h.click({marketConfirm:'return'});assert.match(h.root.innerHTML,/data-market-release="7"/);assert.equal(h.read().assigned[9],1);
});

test('releasing a department hold repaints direct hand bottles even when owned stock and ordinary shelves do not change',()=>{
 const h=harness();h.read().held={7:2,9:3};h.ui.update({visible:true});
 assert.doesNotMatch(h.root.innerHTML,/data-market-release=/);assert.match(h.root.innerHTML,/<span class="market-hand">手元<\/span>/);
 h.read().held[7]=0;h.ui.update({visible:true});assert.match(h.root.innerHTML,/data-market-release="7"/);assert.match(h.root.innerHTML,/手元2本/);
 assert.equal(h.read().core.products[0].stock,5);assert.equal(h.read().assigned[7],2);
});

test('sale quantities do not replace recorded remaining inventory and use saved announcement',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const h=harness();h.ui.update({visible:true});
 const before=fixture(),after=structuredClone(before);after.core.month=5;after.core.lastMonth={month:5,sales:[{id:7,sold:1,revenue:12.8,channel:'stockist',shopId:'town-liquor'}]};
 h.ui.consume(before,after);assert.doesNotMatch(h.root.innerHTML,/class="market-sale-notice"/);assert.deepEqual(h.savedNotices,['町の酒店で1本売れました。']);assert.match(h.root.innerHTML,/class="market-count">2本/);assert.doesNotMatch(h.root.innerHTML,/−1本/);assert.match(h.root.innerHTML,/残り2本 1本売れた/);
 assert.equal(h.read().assigned[7],2);await Promise.resolve();await Promise.resolve();t.mock.timers.tick(2401);
 assert.doesNotMatch(h.root.innerHTML,/class="market-sale-notice"/);assert.equal(h.read().assigned[7],2);
});


function nativeTransaction({failWrite=false,conflict=false,invalid=false}={}){
 const source=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
 const start=source.indexOf('function actMarket(fn){'),end=source.indexOf('function commitPlacement(',start);
 const old={id:'before'},next={id:'after'},calls={writes:0,receipts:0,news:0,renders:0},saveStatus={textContent:'保存済み'};
 let stored=conflict?'another-tab':'old';
 const context={game:old,modal:null,preview:false,canSave:true,userPaused:false,elapsed:0,lastSavedText:'old',runtimeHalted:false,SAVE_KEY:'main',
  D:{serializeDistillery:g=>{if(invalid)throw Error('invalid state');return JSON.stringify(g);}},
  countdown:{cancel(){}},stopClock(){},writeCandidate,
  localStorage:{getItem:()=>stored,setItem:(key,value)=>{calls.writes++;if(failWrite)throw Error('quota');stored=value;}},
  automaticNews:{push(){calls.news++;}},automaticEvents:()=>[],caskName:()=>'',soldOutLabel:()=>'',noteMapReach(){},
  marketUI:{consume(before,after){assert.equal(before,old);assert.equal(after,next);calls.receipts++;}},
  $:()=>saveStatus,storageNotice(){},render(){calls.renders++;},schedule(){}}
 const sandbox=vm.createContext(context);vm.runInContext(source.slice(start,end),sandbox);
 return {old,next,calls,context,stored:()=>stored,run:()=>context.actMarket(()=>next)};
}
test('native market commits live state and receipt presentation only after exact conditional save',()=>{
 const h=nativeTransaction();assert.equal(h.run(),true);assert.equal(h.context.game,h.next);assert.equal(h.calls.writes,1);assert.equal(h.calls.receipts,1);assert.equal(h.calls.news,1);assert.equal(JSON.parse(h.stored()).game.id,'after');
});
test('quota, conflict and invalid state never publish market inventory or success receipts',()=>{
 for(const options of [{failWrite:true},{conflict:true},{invalid:true}]){
  const h=nativeTransaction(options);assert.equal(h.run(),false);assert.equal(h.context.game,h.old);assert.equal(h.calls.receipts,0);assert.equal(h.calls.news,0);
  if(!options.invalid)assert.equal(h.context.canSave,false);
  assert.equal(h.stored(),options.conflict?'another-tab':'old');
 }
});

// Accepted product decisions: keep these across future Lab/main adoptions.
test('unavailable and offer-only shops are absent; actual contracts reveal only their own shelf',()=>{
 const h=harness();h.read().shop.relations=[];h.read().shop.offer={shopId:'supermarket'};h.ui.update({visible:true});assert.equal((h.root.innerHTML.match(/data-market-shop=/g)||[]).length,1);assert.match(h.root.innerHTML,/data-market-shop="retail"/);assert.doesNotMatch(h.root.innerHTML,/data-market-shop="(?:town-liquor|supermarket)"/);
 h.click({marketPlace:'supermarket'});h.click({marketDetails:'town-liquor'});assert.deepEqual(h.opened,[]);assert.equal(h.read().assigned[7],2);
 h.read().shop.relations=[{shopId:'town-liquor',brandId:1}];h.ui.update({visible:true});assert.equal((h.root.innerHTML.match(/data-market-shop=/g)||[]).length,2);assert.doesNotMatch(h.root.innerHTML,/data-market-shop="supermarket"/);
 h.read().shop.relations.push({shopId:'supermarket',brandId:2});h.ui.update({visible:true});assert.equal((h.root.innerHTML.match(/data-market-shop=/g)||[]).length,3);
});
test('four sold retains accessible history while the bottle always shows one actually remaining',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const h=harness();h.read().core.products[0].stock=10;h.read().assigned[7]=5;h.ui.update({visible:true});const before=structuredClone(h.read());h.read().core.month++;h.read().assigned[7]=1;h.read().core.products[0].stock-=4;h.read().core.lastMonth={month:h.read().core.month,sales:[{id:7,sold:4,revenue:64,channel:'stockist',shopId:'town-liquor'}]};h.ui.consume(before,h.read());assert.doesNotMatch(h.root.innerHTML,/class="market-sale-notice"/);assert.deepEqual(h.savedNotices,['町の酒店で4本売れました。']);assert.match(h.root.innerHTML,/残り1本 4本売れた/);assert.doesNotMatch(h.root.innerHTML,/−4本|-4本|market-sold/);assert.match(h.root.innerHTML,/class="market-count">1本/);await Promise.resolve();await Promise.resolve();t.mock.timers.tick(2401);assert.doesNotMatch(h.root.innerHTML,/4本売れた/);assert.equal(h.read().assigned[7],1);
});
test('empty placement fields alone show a hint and preserve minimal bottle controls',()=>{const h=harness();h.ui.update({visible:true});assert.doesNotMatch(h.root.innerHTML,/class="market-place-label"/);h.read().retail={};h.ui.update({visible:true});assert.equal((h.root.innerHTML.match(/class="market-place-label"/g)||[]).length,1);assert.match(h.root.innerHTML,/ここに置く/);assert.doesNotMatch(h.root.innerHTML,/置く →|market-preference|少量ずつ|煙・厚み|麦・果実/);assert.equal((h.root.innerHTML.match(/data-market-portion=/g)||[]).length,3);assert.doesNotMatch(h.root.innerHTML,/<select|取扱前|デパート|#\d+|第\d+回/);});


test('hand heading avoids duplicate aggregate and successful saved placement uses accessible status only',()=>{
 const h=harness();h.ui.update({visible:true});assert.match(h.root.innerHTML,/<span class="market-hand">手元<\/span>/);assert.match(h.root.innerHTML,/class="market-count">2本/);assert.doesNotMatch(h.root.innerHTML,/<span>5本<\/span>/);
 h.click({marketPlace:'town-liquor'});assert.deepEqual(h.notices,[]);assert.deepEqual(h.savedNotices,['町の酒店に1本置きました。']);assert.equal(h.read().assigned[7],3);
 const failed=harness({saved:false});failed.ui.update({visible:true});failed.click({marketPlace:'town-liquor'});assert.deepEqual(failed.savedNotices,[]);assert.deepEqual(failed.notices,[]);
});
test('normal placement targets stay neutral and the saved status has a dedicated hidden live region',()=>{
 const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'),css=read('market.css'),app=read('shop-app.mjs'),html=read('index.html');
 const targetRule=css.match(/#market-board \.market-target\{([^}]+)\}/)[1];assert.doesNotMatch(targetRule,/#e4bc66|#57472e/);assert.match(css,/button\[aria-pressed=true\][^}]+#e4bc66/);assert.match(css,/market-shop[^}]+border:[^}]+#858995/);
 assert.match(html,/id="market-action-status" class="sr-only" role="status" aria-live="polite"/);assert.match(app,/announceSaved:text=>/);assert.match(app,/document.body.append\(\$\('automatic-news'\),\$\('market-action-status'\)\)/);
});


test('venue information is explicitly named and content-sized panel reveals the native room below',()=>{
 const h=harness();h.ui.update({visible:true});assert.equal((h.root.innerHTML.match(/class="market-shop-name"/g)||[]).length,2);assert.doesNotMatch(h.root.innerHTML,/>店情報 ›<\/button>/);assert.match(h.root.innerHTML,/class="market-shop-title">町の酒店/);assert.doesNotMatch(h.root.innerHTML,/>…<\/button>/);assert.equal(h.root.style.height,'auto');assert.equal(h.root.style.maxHeight,'417px');
 const css=fs.readFileSync(new URL('../market.css',import.meta.url),'utf8');assert.match(css,/market-content[^}]*height:auto/);assert.match(css,/market-shops[^}]*flex:none/);
});

// The current author request replaces visible sale sentences with quantity
// overlays; actual remaining inventory and saved transaction rules stay intact.
test('saved placement pairs deltas with the original release even when all leaves hand empty',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const h=harness({geometry:true});h.ui.update({visible:true});h.click({marketPortion:'all'});h.click({marketPlace:'town-liquor'});
 assert.equal(h.ui.diagnostics().selected,9);assert.deepEqual(h.overlays.map(el=>[el.textContent,el.dataset.productId,el.dataset.shopId]),[['+2','7','town-liquor'],['−2','7','hand']]);
 assert.equal(h.overlays[1].style.top,'150px');assert.equal(h.read().assigned[7],4);t.mock.timers.tick(651);assert.equal(h.overlays.length,0);
 const failed=harness({geometry:true,saved:false});failed.ui.update({visible:true});failed.click({marketPlace:'town-liquor'});assert.equal(failed.overlays.length,0);
});
test('saved sale decrements appear once with reduced motion and cancel without stale overlays',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const h=harness({geometry:true});h.ui.update({visible:true});const before=structuredClone(h.read());h.read().core.month++;h.read().assigned[7]=1;h.read().core.lastMonth={month:h.read().core.month,sales:[{id:7,sold:1,revenue:12,channel:'stockist',shopId:'town-liquor'}]};
 h.ui.consume(before,h.read());await Promise.resolve();await Promise.resolve();assert.deepEqual(h.overlays.map(el=>[el.textContent,el.dataset.kind,el.dataset.shopId]),[['−1','sale','town-liquor']]);
 h.ui.consume(before,h.read());h.ui.update({visible:true});assert.equal(h.history.length,1);assert.equal(h.read().assigned[7],1);
 h.ui.cancel();assert.equal(h.overlays.length,0);t.mock.timers.tick(3000);await Promise.resolve();assert.equal(h.history.length,1);assert.equal(h.ui.diagnostics().feedback.length,0);
});

test('large all-placement reserves space for full signed quantity without reducing fonts',()=>{
 const h=harness();h.read().core.products[0].stock=1000;h.ui.update({visible:true});assert.match(h.root.innerHTML,/--market-delta-space:calc\(6 \* var\(--uniform-font-size,16px\)\)/);
 h.click({marketPortion:'all'});h.click({marketPlace:'town-liquor'});assert.equal(h.read().assigned[7],999);assert.match(h.root.innerHTML,/class="market-count">999本/);
});


test('compact shelf dates remain unambiguous across centuries and retain full accessible dates',()=>{
 const s=fixture(),before=JSON.stringify(s);assert.equal(compactReleaseDate(s,7),'26/3');assert.equal(JSON.stringify(s),before);
 s.releases.find(r=>r.productId===9).bottledMonth=1202;assert.equal(compactReleaseDate(s,7),'2026/3');assert.equal(compactReleaseDate(s,9),'2126/3');
 const h=harness();h.ui.update({visible:true});assert.match(h.root.innerHTML,/title="2026\/3">26\/3/);assert.match(h.root.innerHTML,/2026\/3.*残り2本/);
});
