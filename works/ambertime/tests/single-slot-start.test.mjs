import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as native from '../partner-orders.mjs';
import {createFreshSession,createSessionEntry,inspectStartRecord,LEGACY_SAVE_KEYS} from '../session-entry.mjs';
import {serializeSession,readSession,writeCandidate,FORMAL_SAVE_KEY} from '../development-save.mjs';
import {commitMarketRulesUpdate} from '../market-ui.mjs';
import {advanceRecall} from '../recall/collector.mjs';
import {advanceHistoryRecord} from '../history-record.mjs';
import {advanceRecentLedger} from '../recent-ledger.mjs';
import {reconcileCaskSlots} from '../cask-slots.mjs';
import {PARALLEL_PARAMETERS as T} from '../economy-parameters.mjs';
const options={enabled:true,serialize:native.serializeDistillery,restore:native.restoreDistillery,monthMs:T.monthMs,stepMs:T.distillStepMs};
const encode=s=>serializeSession(s.game,s,options),prefix=FORMAL_SAVE_KEY+'.before-market-rules.v1.';

// A public-operation career, not padding or an altered envelope. Its real
// releases, history, ledger and recall produce an approximately 900k v8 record.
function largeCareer(){
 let s=createFreshSession(native,42);
 const op=fn=>{const before=s.game,after=fn(before);s={...s,game:after,recallRecord:advanceRecall(before,after,s.recallRecord),historyRecord:advanceHistoryRecord(before,after,s.historyRecord),recentLedger:advanceRecentLedger(before,after,s.recentLedger),caskSlots:reconcileCaskSlots(after,s.caskSlots)};};
 function resolve(){
  while(s.game.decisions.length){const d=s.game.decisions[0],o=d.pending.options.find(o=>o.id==='wait')??d.pending.options.find(o=>o.id==='last');op(g=>native.chooseDistillery(g,d.caskId,o.id));}
  if(s.game.generations.active.phase==='review')op(g=>native.handoverGeneration(g,g.generations.active.id));
  if(s.game.trade.offer)op(native.declineOffer);
  while(s.game.shop.offer){const offer=s.game.shop.offer;op(g=>native.declineShop(g,offer.shopId,offer.id));}
 }
 const months=n=>{for(let i=0;i<n;i++){resolve();op(native.tickDistillery);}};
 for(let batch=0;batch<10;batch++){
  resolve();op(native.startDistillation);
  while(s.game.still.distillation.progress<45)op(native.distillStep);
  op(native.beginCollection);while(s.game.still.distillation.progress<65)op(native.distillStep);
  op(native.stopDistillation);op(g=>native.fillBarrel(g,'refill'));months(6);
  op(g=>native.bottleBranded(g,g.core.casks.at(-1).id,{}));
  op(g=>native.setMarketRetail(g,{productId:g.result.productId,count:g.core.products.find(p=>p.id===g.result.productId).stock}));months(20);
 }
 return s;
}
function constrainedStorage(raw){
 const values=new Map([[FORMAL_SAVE_KEY,raw],[LEGACY_SAVE_KEYS[0],'L'.repeat(77280)],[prefix+'400000.a','A'.repeat(400000)],[prefix+'200000.b','B'.repeat(200000)],[prefix+'92004.c','C'.repeat(92004)],['other-work.save','untouched']]);
 const original=new Map(values),writes=[];
 const size=()=>[...values.values()].reduce((n,s)=>n+s.length,0),limit=size()+16;
 return {values,original,writes,get length(){return values.size;},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem(k,v){
  // Storage API's failure atomicity is modeled: refusal happens before mutation.
  const next=size()-(values.get(k)?.length??0)+v.length;if(next>limit)throw Object.assign(Error('The quota has been exceeded.'),{name:'QuotaExceededError',code:22});
  writes.push(k);values.set(k,v);
 }};
}
function entryFor(store,install,create=()=>createFreshSession(native,42)){
 return createSessionEntry({storage:()=>store,create,encode,read:raw=>readSession(raw,options),write:writeCandidate,replace:()=>assert.fail('normal new start must not create a backup'),install,yieldTask:()=>Promise.resolve()});
}
async function replaceUnderPressure(raw,old){
 const store=constrainedStorage(raw),fresh=createFreshSession(native,old.game.seed),nextText=encode(fresh),oldRecall=JSON.stringify(old.recallRecord),oldState=JSON.stringify(old);
 // The previous mandatory-backup path really fails against the same budget.
 assert.throws(()=>commitMarketRulesUpdate(store,FORMAL_SAVE_KEY,raw,nextText),{name:'QuotaExceededError',code:22});
 assert.equal(store.getItem(FORMAL_SAVE_KEY),raw);assert.deepEqual(store.writes,[]);
 let installed=null;const entry=entryFor(store,(session,details)=>{assert.equal(store.getItem(FORMAL_SAVE_KEY),details.text);assert.deepEqual(readSession(details.text,options),session);installed=session;},()=>createFreshSession(native,old.game.seed));
 assert.deepEqual(await entry.start(inspectStartRecord(store)),{ok:true});assert.deepEqual(installed,fresh);
 assert.deepEqual(store.writes,[FORMAL_SAVE_KEY]);assert.equal(store.values.size,store.original.size);
 for(const [key,value] of store.original)if(key!==FORMAL_SAVE_KEY)assert.equal(store.getItem(key),value);
 assert.equal(JSON.stringify(old),oldState);assert.equal(JSON.stringify(old.recallRecord),oldRecall);
 assert.equal(installed.recallRecord.completed.length,0);assert.equal(installed.historyRecord.generations.length,1);
 assert.equal(installed.game.operations.length,createFreshSession(native,old.game.seed).game.operations.length);
 // A new controller after restart must use the actual reader, never the creator.
 const restarted=entryFor(store,(session,details)=>{assert.equal(details.fresh,false);assert.deepEqual(session,fresh);},()=>assert.fail('continue must not create'));
 assert.deepEqual(await restarted.continue(inspectStartRecord(store)),{ok:true});assert.deepEqual(store.writes,[FORMAL_SAVE_KEY]);
 return {store,fresh};
}
test('real approximately 900k v8 with old recall and three backups starts under pressure without a new backup, then cold continues',async()=>{
 const old=largeCareer(),raw=encode(old);assert(raw.length>=850000&&raw.length<=1050000,'fixture must stay near 900k');
 assert.equal(JSON.parse(raw).version,8);assert.deepEqual(readSession(raw,options),old);
 assert(old.game.operations.length>300);assert(old.recallRecord.observer.index>300);
 await replaceUnderPressure(raw,old);
});
test('provided private v8 can be replaced and cold continued in isolated test storage', {skip:!process.env.AMBER_PRIVATE_START_SAVE},async()=>{
 const raw=readFileSync(process.env.AMBER_PRIVATE_START_SAVE,'utf8'),old=readSession(raw,options);
 assert.equal(JSON.parse(raw).version,8);await replaceUnderPressure(raw,old);
});
