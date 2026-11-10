import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as D from '../partner-orders.mjs';
import {createObserver,createShadow,advanceShadow} from './adapter.mjs';
import {createReadSwitch} from './read-switch.mjs';
import {shopRemark} from '../shop-remarks.mjs';
import {buildReleaseLedger} from '../ledger-view.mjs';
import {buildShopLedger} from '../shop-ledger.mjs';
const all={remarks:true,releaseLedger:true,storeLedger:true,oldWineDialogue:true};
const fresh=()=>D.newStoreMarketDistillery(42);
test('enabled remark returns compact key/text to exact existing display; disabled returns native object',()=>{
 const s=fresh(),legacy=shopRemark(s,'town-liquor'),o=createObserver({features:all});o.start(s);
 assert.deepEqual(o.read('remarks',s,legacy,{shopId:'town-liquor'}),{key:legacy.key,text:legacy.text});
 assert.equal(o.readReport().counters.remarks.compact,1);
 const off=createObserver();off.start(s);assert.equal(off.read('remarks',s,legacy),legacy);assert.equal(off.readReport().reads,0);
});
test('feature flags independent; inactive/restart/old save and uncommitted objects fail closed with cause',()=>{
 const s=fresh(),o=createObserver({features:{remarks:true}}),legacy=shopRemark(s,'town-liquor');
 assert.equal(o.read('remarks',s,legacy),legacy);assert.match(o.readReport().events.at(-1).reason,/inactive/);
 o.start(s);assert.equal(o.read('storeLedger',s,[]).length,0);assert.equal(o.readReport().counters.storeLedger.compact,0);
 assert.equal(o.read('remarks',structuredClone(s),legacy,{shopId:'town-liquor'}),legacy);assert.match(o.readReport().events.at(-1).reason,/unconfirmed/);
 o.reset();assert.equal(o.read('remarks',s,legacy),legacy);
 o.start(D.startRangeDistillation(s));assert.equal(o.read('remarks',s,legacy),legacy);assert.match(o.readReport().events.at(-1).reason,/fresh-session/);
});
test('missing IDs, mismatch, exceptions and bounded diagnostics preserve native results',()=>{
 const s=fresh(),state=createShadow(s),snapshot=()=>({state,status:'active',last:s});
 for(const projectRead of [()=>{throw Error('missing-release-id');},()=>({key:'wrong',text:'wrong'})]){
  const r=createReadSwitch({features:all,snapshot,projectRead}),legacy=shopRemark(s,'town-liquor');
  for(let n=0;n<40;n++)assert.equal(r.read('remarks',s,legacy),legacy);
  assert.equal(r.report().events.length,32);assert.equal(r.report().counters.remarks.fallback,40);assert(r.report().events.every(e=>e.reason));
 }
 const o=createObserver({features:all});o.start(s);const ledger={entries:[{kind:'release',releaseId:999}]};
 assert.equal(o.read('releaseLedger',s,ledger),ledger);assert.match(o.readReport().events.at(-1).reason,/release/);
});
test('observer exception and source/time budgets do not expose last good snapshot as current',()=>{
 for(const options of [{update(){throw Error('shadow-injected');}},{maxOperations:0},{maxMilliseconds:0,clock:(()=>{let t=0;return ()=>++t;})()}]){
  const s=fresh(),next=D.startRangeDistillation(s),o=createObserver({...options,features:all});o.start(s);o.observe(s,next);
  const legacy=shopRemark(next,'town-liquor');assert.equal(o.read('remarks',next,legacy),legacy);assert(o.readReport().events.at(-1).reason);
 }
});
test('all four display sources compare throughout native replay including release and store aggregates',()=>{
 const raw=JSON.parse(fs.readFileSync(new URL('../tests/fixtures/placement-established-six.json',import.meta.url))).raw;
 const s=D.restoreDistillery(raw);let previous=null,shadow=null,read=null;let count=0;
 D.replayDistilleryOperations(s,({index,after})=>{
  const next={...after,operations:s.operations.slice(0,index+1)};
  if(shadow)shadow=advanceShadow(shadow,previous,next);else if(next.releases&&next.shop)shadow=createShadow(next);
  previous=next;if(!shadow)return;
  read=createReadSwitch({features:all,snapshot:()=>({state:shadow,status:'active',last:next})});
  for(const shopId of ['town-liquor','supermarket','bar','department']){const native=shopRemark(next,shopId);const result=read.read('remarks',next,native,{shopId});if(next.brands.some(b=>b.id===1))assert.deepEqual(result,{key:native.key,text:native.text});else{assert.equal(result,native);assert.equal(read.report().events.at(-1).reason,'remark-information-missing');}}
  const releases=buildReleaseLedger(next),stores=buildShopLedger(next);
  assert.deepEqual(read.read('releaseLedger',next,releases),releases);assert.deepEqual(read.read('storeLedger',next,stores),stores);
  assert.equal(read.report().counters.storeLedger.compact,1);count++;
 });assert(count>10);
});
test('already selected dialogue is reused exactly; absent historical selection never generated',()=>{
 const s=fresh(),o=createObserver({features:all});o.start(s);
 const entry={id:'chosen-0',month:0,shopId:'bar',key:'old',kind:'memory',text:'確定した台詞',releaseId:1};
 assert.equal(o.read('oldWineDialogue',s,entry),entry);assert.match(o.readReport().events.at(-1).reason,/not-observed/);
 o.recordDialogue(entry);assert.deepEqual(o.read('oldWineDialogue',s,entry),entry);assert.equal(o.readReport().counters.oldWineDialogue.compact,1);
 const changed={...entry,text:'変更'};assert.equal(o.read('oldWineDialogue',s,changed),changed);assert.match(o.readReport().events.at(-1).reason,/mismatch/);
});
test('same confirmed state save does not reapply and stale failed candidate never reads',()=>{
 const s=fresh(),o=createObserver({features:all});o.start(s);o.observe(s,s);assert.equal(o.report().state.commits,0);
 const failed=D.startRangeDistillation(s),legacy=shopRemark(failed,'town-liquor');assert.equal(o.read('remarks',failed,legacy,{shopId:'town-liquor'}),legacy);
 assert.deepEqual(o.read('remarks',s,shopRemark(s,'town-liquor'),{shopId:'town-liquor'}),{key:'neutral',text:'いらっしゃいませ。'});
});
test('actual display wrapper isolates unexpected reader throw and ordinary mode',()=>{
 const source=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8'),body=source.slice(source.indexOf('function displayRead('),source.indexOf('\nconst startShadow='));
 const legacy={key:'old'},ctx={shadowObserver:null,shadowLoadError:null};vm.createContext(ctx);vm.runInContext(body,ctx);
 assert.equal(ctx.displayRead('remarks',{},legacy),legacy);
 ctx.shadowObserver={read(){throw Error('unexpected-reader');}};assert.equal(ctx.displayRead('remarks',{},legacy),legacy);assert.equal(ctx.shadowLoadError,'unexpected-reader');assert.equal(ctx.shadowObserver,null);
 assert.match(source,/read-remarks/);assert.match(source,/displayRead\('remarks',game,shopRemark/);
});

test('nonempty live release ledger uses compact aggregates with native coverage; unknown remains fallback',()=>{
 let s=fresh(),o=createObserver({features:all});o.start(s);
 let next=D.beginCollection(D.startRangeDistillation(s));while(next.still.distillation.progress<65)next=D.distillStep(next);
 next=D.fillBarrel(D.stopDistillation(next),'refill');o.observe(s,next);s=next;
 next=D.bottleBranded(s,s.core.casks[0].id,{},5);o.observe(s,next);s=next;
 const unknown=buildReleaseLedger(s);assert.equal(o.read('releaseLedger',s,unknown),unknown);assert.equal(o.readReport().events.at(-1).reason,'read-result-mismatch');
 const facts=D.nearbyComparisonFacts(s,{productIds:s.releases.map(r=>r.productId),caskIds:s.releases.map(r=>r.caskId)}),native=buildReleaseLedger(s,{facts});
 const selected=o.read('releaseLedger',s,native);assert.deepEqual(selected,native);assert.notEqual(selected,native);assert.equal(o.readReport().counters.releaseLedger.compact,1);assert(selected.entries.length>0);
});
