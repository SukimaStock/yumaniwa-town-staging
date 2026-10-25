import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../placement-save.mjs';
const trial={version:20,placement:{version:1,retailByProduct:{}}},legacy={version:20};
const envelope=(game=trial,changes={})=>({version:2,game:structuredClone(game),userPaused:true,elapsed:200,...changes});
const options=(enabled=true,restore=JSON.parse)=>({enabled,restore,monthMs:6000,stepMs:100});
function storage(entries={}){const values=new Map(Object.entries(entries)),writes=[];return {values,writes,getItem(key){return values.has(key)?values.get(key):null;},setItem(key,value){writes.push([key,value]);values.set(key,value);}};}
test('only the explicit placement=1 query requests the trial, with separate stable keys',()=>{
 assert.equal(S.LEGACY_SAVE_KEY,'sukimastock.ambertime.wholesale.v20');assert.equal(S.PLACEMENT_SAVE_KEY,'sukimastock.ambertime.placement-trial.v1');assert.notEqual(S.LEGACY_SAVE_KEY,S.PLACEMENT_SAVE_KEY);
 for(const query of ['', '?placement=0','?placement=true','?preview=1'])assert.equal(S.requested(query),false);
 assert.equal(S.requested('?placement=1'),true);assert.equal(S.requested('?other=keep&placement=1'),true);
});
test('valid envelopes use the injected native restore and preserve pause/time without adding fields',()=>{
 let called=0;const text=JSON.stringify(envelope()),sent=[];const out=S.readSession(text,options(true,raw=>{called++;sent.push(raw);return {...JSON.parse(raw),validated:true};}));
 assert.equal(called,1);assert.equal(sent[0],JSON.stringify(trial));assert.deepEqual(out,{game:{...trial,validated:true},userPaused:true,elapsed:200});assert.equal(text,JSON.stringify(envelope()));
 assert.deepEqual(S.readSession(JSON.stringify(envelope(legacy,{elapsed:0,userPaused:false})),options(false)),{game:legacy,userPaused:false,elapsed:0});
});
test('mode guards reject both wrong-key directions before restore, and after restore',()=>{
 for(const [game,enabled] of [[legacy,true],[trial,false]]){let called=0;assert.throws(()=>S.readSession(JSON.stringify(envelope(game)),options(enabled,()=>{called++;return game;})),/別の方式/);assert.equal(called,0);assert.throws(()=>S.assertMode(game,enabled),/別の方式/);}
 assert.equal(S.assertMode(trial,true),trial);assert.equal(S.assertMode(legacy,false),legacy);assert.throws(()=>S.assertMode(trial,1),/別の方式/);
 assert.throws(()=>S.readSession(JSON.stringify(envelope()),options(true,()=>legacy)),/別の方式/);
});
test('malformed or unknown envelope data never reaches native restore',()=>{
 const invalid=['{','null','[]','7',JSON.stringify({...envelope(),extra:true}),JSON.stringify({...envelope(),version:3}),JSON.stringify({...envelope(),game:{version:19}}),JSON.stringify({...envelope(),userPaused:'true'}),JSON.stringify({version:2,game:trial,userPaused:true,other:0})];
 for(const elapsed of [-1,1,6000,6100,1.5,null,'200'])invalid.push(JSON.stringify(envelope(trial,{elapsed})));
 let called=0;for(const text of invalid)assert.throws(()=>S.readSession(text,options(true,()=>{called++;return trial;})));assert.equal(called,0);
 assert.throws(()=>S.readSession({},options()));assert.throws(()=>S.readSession(JSON.stringify(envelope()),{...options(),monthMs:0}));assert.throws(()=>S.readSession(JSON.stringify(envelope()),{...options(),stepMs:0}));
});
test('restore rejection does not repair, write, or fall back to another saved game',()=>{
 const text=JSON.stringify(envelope()),store=storage({[S.PLACEMENT_SAVE_KEY]:text,[S.LEGACY_SAVE_KEY]:'old canary',unrelated:'keep'}),before=[...store.values];
 assert.throws(()=>S.readSession(store.getItem(S.PLACEMENT_SAVE_KEY),options(true,()=>{throw Error('strict operation mismatch');})),/strict operation mismatch/);
 assert.deepEqual([...store.values],before);assert.deepEqual(store.writes,[]);
});
test('candidate write updates the selected key only and verifies exact text',()=>{
 const store=storage({[S.LEGACY_SAVE_KEY]:'old canary',unrelated:'keep'});assert.equal(S.writeCandidate(store,S.PLACEMENT_SAVE_KEY,null,'candidate'),'candidate');assert.equal(store.getItem(S.PLACEMENT_SAVE_KEY),'candidate');assert.equal(store.getItem(S.LEGACY_SAVE_KEY),'old canary');assert.equal(store.getItem('unrelated'),'keep');assert.deepEqual(store.writes,[[S.PLACEMENT_SAVE_KEY,'candidate']]);
 assert.equal(S.writeCandidate(store,S.PLACEMENT_SAVE_KEY,'candidate','next'),'next');assert.equal(store.getItem(S.PLACEMENT_SAVE_KEY),'next');
});
test('conflict or setItem failure leaves the original save and other keys unchanged',()=>{
 const store=storage({[S.PLACEMENT_SAVE_KEY]:'newer other tab',[S.LEGACY_SAVE_KEY]:'old canary'}),before=[...store.values];assert.throws(()=>S.writeCandidate(store,S.PLACEMENT_SAVE_KEY,'stale','candidate'),/別の画面/);assert.deepEqual([...store.values],before);assert.deepEqual(store.writes,[]);
 const failing=storage({[S.PLACEMENT_SAVE_KEY]:'before',unrelated:'keep'}),snapshot=[...failing.values];failing.setItem=()=>{throw Error('quota');};assert.throws(()=>S.writeCandidate(failing,S.PLACEMENT_SAVE_KEY,'before','candidate'),/quota/);assert.deepEqual([...failing.values],snapshot);
});
test('readback conflict stops without overwriting a concurrent writer or any other key',()=>{
 const store=storage({[S.PLACEMENT_SAVE_KEY]:'before',[S.LEGACY_SAVE_KEY]:'old canary'});store.setItem=function(key,value){this.writes.push([key,value]);this.values.set(key,'concurrent writer');};assert.throws(()=>S.writeCandidate(store,S.PLACEMENT_SAVE_KEY,'before','candidate'),/保存を確認/);assert.equal(store.getItem(S.PLACEMENT_SAVE_KEY),'concurrent writer');assert.equal(store.getItem(S.LEGACY_SAVE_KEY),'old canary');assert.equal(store.writes.length,1);
});
