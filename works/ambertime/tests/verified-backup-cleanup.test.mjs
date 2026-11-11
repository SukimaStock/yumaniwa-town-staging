import test from 'node:test';
import assert from 'node:assert/strict';
import {createVerifiedBackupCleanup,isProtectedBackupKey,appendVerifiedBackupCleanup} from '../verified-backup-cleanup.mjs';
import {FORMAL_SAVE_KEY,readSession,serializeSession,writeCandidate} from '../development-save.mjs';
import {createFreshSession,createSessionEntry,inspectStartRecord,LEGACY_SAVE_KEYS} from '../session-entry.mjs';
import {commitMarketRulesUpdate} from '../market-ui.mjs';
import * as native from '../partner-orders.mjs';
import {PARALLEL_PARAMETERS as T} from '../economy-parameters.mjs';

const prefix=FORMAL_SAVE_KEY+'.before-market-rules.v1.',key=prefix+'8.abcdef',raw='raw\r\n原文';
const file=text=>({text:async()=>text});
function memory(entries=[[key,raw]]){
 const values=new Map(entries),removed=[];
 return {values,removed,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem(k){removed.push(k);values.delete(k);}};
}

test('cleanup rejects formal, legacy and other-work keys without reading or removing',()=>{
 for(const k of [FORMAL_SAVE_KEY,...LEGACY_SAVE_KEYS,'other-work.save',prefix,prefix+'1.zz',prefix+'1.abc.extra']){
  assert.equal(isProtectedBackupKey(k),false);
  assert.throws(()=>createVerifiedBackupCleanup({storage:{getItem(){assert.fail('must not read');}},key:k}),/整理対象/);
 }
});
test('exact externally selected original and separate confirmation remove only the chosen backup',async()=>{
 const store=memory([[key,raw],[FORMAL_SAVE_KEY,'formal'],[LEGACY_SAVE_KEYS[0],'legacy'],[prefix+'9.def','another backup'],['other-work.save','other']]);
 const before=new Map(store.values),c=createVerifiedBackupCleanup({storage:store,key});
 assert.equal(c.characters,raw.length);assert.equal(c.verified,false);assert.deepEqual(store.removed,[]);
 assert.throws(()=>c.remove(()=>true),/先に確認/);
 const external=raw;assert.equal(await c.verify(file(external)),true);assert.equal(c.verified,true);assert.deepEqual(store.removed,[]);
 let confirmations=0;assert.equal(c.remove(message=>{confirmations++;assert.match(message,/正式保存は変更しません/);return true;}),true);
 assert.equal(confirmations,1);assert.equal(store.getItem(key),null);assert.equal(external,raw);assert.deepEqual(store.removed,[key]);
 before.delete(key);assert.deepEqual(store.values,before);assert.throws(()=>c.remove(()=>true),/先に確認/);
});
test('wrong file including newline normalization cannot authorize cleanup',async()=>{
 for(const text of ['',raw+' ',raw.replace('\r\n','\n')]){
  const store=memory(),c=createVerifiedBackupCleanup({storage:store,key});
  await assert.rejects(c.verify(file(text)),/一致しません/);assert.equal(c.verified,false);
  assert.throws(()=>c.remove(()=>true),/先に確認/);assert.equal(store.getItem(key),raw);assert.deepEqual(store.removed,[]);
 }
});
test('confirmation cancellation and explicit controller cancellation preserve original',async()=>{
 const store=memory(),c=createVerifiedBackupCleanup({storage:store,key});await c.verify(file(raw));
 assert.equal(c.remove(()=>false),false);assert.equal(store.getItem(key),raw);assert.deepEqual(store.removed,[]);
 c.cancel();assert.equal(c.verified,false);assert.throws(()=>c.remove(()=>true),/先に確認/);
});
test('cancelled or superseded async file reads cannot re-enable removal',async()=>{
 const store=memory(),c=createVerifiedBackupCleanup({storage:store,key});let finish;
 const pending=c.verify({text:()=>new Promise(resolve=>{finish=resolve;})});c.cancel();finish(raw);
 assert.equal(await pending,false);assert.equal(c.verified,false);
 const old=c.verify({text:()=>new Promise(resolve=>{finish=resolve;})});await c.verify(file(raw));finish('wrong');
 assert.equal(await old,false);assert.equal(c.verified,true);assert.deepEqual(store.removed,[]);
});
test('another tab replacing backup during verification or before/during confirmation is preserved',async()=>{
 for(const phase of ['file','before-confirm','during-confirm']){
  const store=memory(),c=createVerifiedBackupCleanup({storage:store,key});
  if(phase==='file'){
   await assert.rejects(c.verify({text:async()=>{store.values.set(key,'other tab');return raw;}}),/変わりました/);
  }else{
   await c.verify(file(raw));if(phase==='before-confirm')store.values.set(key,'other tab');
   assert.throws(()=>c.remove(()=>{store.values.set(key,'other tab');return true;}),/変わりました/);
  }
  assert.equal(store.getItem(key),'other tab');assert.deepEqual(store.removed,[]);
 }
});
test('storage access and deletion errors never remove a different record or claim success',async()=>{
 const denied=Object.assign(Error('denied'),{name:'SecurityError'});
 assert.throws(()=>createVerifiedBackupCleanup({storage:{getItem(){throw denied;}},key}),e=>e===denied);
 for(const phase of ['verify','remove-read','remove-write','readback']){
  const store=memory(),c=createVerifiedBackupCleanup({storage:store,key}),get=store.getItem;
  if(phase==='verify'){store.getItem=()=>{throw denied;};await assert.rejects(c.verify(file(raw)),e=>e===denied);}
  else{
   await c.verify(file(raw));
   if(phase==='remove-read')store.getItem=()=>{throw denied;};
   if(phase==='remove-write')store.removeItem=()=>{throw denied;};
   if(phase==='readback')store.removeItem=()=>{};
   assert.throws(()=>c.remove(()=>true));
  }
  assert.equal(get(key),raw);assert.deepEqual(store.removed,[]);
 }
});

// Synthetic character budget, not a measurement of Safari's quota. The opaque
// old raw intentionally makes no claim that the author's formal reader accepts it.
test('supplied character counts reproduce backup-write quota; verified explicit cleanup allows unchanged safe transaction',async()=>{
 const original='o'.repeat(891435),legacy='l'.repeat(77280),oldBackup='b'.repeat(230668);
 const entries=[[FORMAL_SAVE_KEY,original],[LEGACY_SAVE_KEYS[0],legacy],...[1,2,3].map(i=>[prefix+'230668.'+i,oldBackup])];
 const store=memory(entries);const limit=2400000,ordinarySet=store.setItem;
 store.setItem=(k,v)=>{let total=v.length;for(const [existing,value] of store.values)if(existing!==k)total+=value.length;if(total>limit)throw Object.assign(Error('The quota has been exceeded.'),{name:'QuotaExceededError',code:22});ordinarySet(k,v);};
 const options={enabled:true,serialize:native.serializeDistillery,restore:native.restoreDistillery,monthMs:T.monthMs,stepMs:T.distillStepMs};
 const installed=[];const entry=createSessionEntry({storage:()=>store,create:()=>createFreshSession(native,43),encode:s=>serializeSession(s.game,s,options),read:text=>readSession(text,options),write:writeCandidate,replace:commitMarketRulesUpdate,install:s=>installed.push(s),yieldTask:()=>Promise.resolve()});
 const failed=await entry.start(inspectStartRecord(store));assert.equal(failed.stage,'backup-write');assert.equal(failed.error.name,'QuotaExceededError');assert.equal(failed.error.code,22);assert.equal(failed.formalState,'unchanged');assert.equal(installed.length,0);assert.equal(store.getItem(FORMAL_SAVE_KEY),original);
 const cleanup=createVerifiedBackupCleanup({storage:store,key:prefix+'230668.1'});await cleanup.verify(file(oldBackup));assert.equal(cleanup.remove(()=>true),true);
 assert.deepEqual(await entry.start(inspectStartRecord(store)),{ok:true});assert.equal(installed.length,1);
 assert.deepEqual(readSession(store.getItem(FORMAL_SAVE_KEY),options),installed[0]);assert.equal(store.getItem(LEGACY_SAVE_KEYS[0]),legacy);
 const durable=[...store.values].find(([k,v])=>k.startsWith(prefix)&&v===original);assert(durable);assert.equal(durable[1],original);
 const cold=memory([...store.values]);assert.equal(cold.getItem(durable[0]),original);assert.equal(store.getItem(prefix+'230668.2'),oldBackup);assert.equal(store.getItem(prefix+'230668.3'),oldBackup);
});

test('insufficient freed capacity retains formal bytes and all unselected backups',async()=>{
 const store=memory([[FORMAL_SAVE_KEY,'old'],[key,raw],[prefix+'9.a','keep']]),c=createVerifiedBackupCleanup({storage:store,key});
 await c.verify(file(raw));c.remove(()=>true);store.setItem=()=>{throw Object.assign(Error('quota'),{name:'QuotaExceededError'});};
 assert.throws(()=>commitMarketRulesUpdate(store,FORMAL_SAVE_KEY,'old','candidate'),{name:'QuotaExceededError'});
 assert.equal(store.getItem(FORMAL_SAVE_KEY),'old');assert.equal(store.getItem(prefix+'9.a'),'keep');assert.deepEqual(store.removed,[key]);
});

test('existing byte-identical backup is reused without another backup write under quota pressure',()=>{
 const store=memory([[FORMAL_SAVE_KEY,raw]]);commitMarketRulesUpdate(store,FORMAL_SAVE_KEY,raw,raw);
 const protectedKey=[...store.values.keys()].find(k=>k.startsWith(prefix));assert(protectedKey);
 const attempts=[],set=store.setItem;store.setItem=(k,v)=>{attempts.push(k);if(k!==FORMAL_SAVE_KEY)throw Object.assign(Error('quota'),{name:'QuotaExceededError'});set(k,v);};
 commitMarketRulesUpdate(store,FORMAL_SAVE_KEY,raw,'new');assert.deepEqual(attempts,[FORMAL_SAVE_KEY]);assert.equal(store.getItem(protectedKey),raw);assert.equal(store.getItem(FORMAL_SAVE_KEY),'new');assert.deepEqual(store.removed,[]);
});
test('uncertain cleanup readback preserves verified external bytes and never rolls back storage',async()=>{
 const store=memory(),c=createVerifiedBackupCleanup({storage:store,key}),external=raw;await c.verify(file(external));
 const remove=store.removeItem;store.removeItem=k=>{remove(k);store.getItem=()=>{throw Error('read unavailable');};};
 assert.throws(()=>c.remove(()=>true),/read unavailable/);assert.equal(store.values.has(key),false);assert.equal(external,raw);assert.deepEqual(store.removed,[key]);assert.equal(c.verified,false);
});

function element(){return {children:[],events:{},disabled:false,open:true,textContent:'',append(...nodes){this.children.push(...nodes);},setAttribute(){},addEventListener(type,fn){this.events[type]=fn;},click(){this.clicked=true;}};}
test('UI starts disabled, verifies selected file, closing invalidates permission, and never removes legacy',async()=>{
 const store=memory(),parent=element(),doc={createElement:element};
 assert.equal(appendVerifiedBackupCleanup({document:doc,parent,storage:store,key:LEGACY_SAVE_KEYS[0],confirm:()=>true}),null);
 const ui=appendVerifiedBackupCleanup({document:doc,parent,storage:store,key,confirm:()=>true});assert.equal(ui.remove.disabled,true);
 ui.choose.events.click();assert.equal(ui.input.clicked,true);
 ui.input.files=[file(raw)];await ui.input.events.change();assert.equal(ui.remove.disabled,false);assert.match(ui.status.textContent,/一致しました/);assert.deepEqual(store.removed,[]);
 ui.details.open=false;ui.details.events.toggle();assert.equal(ui.remove.disabled,true);assert.equal(ui.controller.verified,false);
 ui.input.files=[file(raw)];await ui.input.events.change();ui.remove.events.click();assert.deepEqual(store.removed,[key]);assert.equal(ui.remove.disabled,true);assert.equal(ui.choose.disabled,true);
});
