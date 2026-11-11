import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as native from '../partner-orders.mjs';
import {createFreshSession,createSessionEntry,inspectStartRecord} from '../session-entry.mjs';
import {makeEntryDiagnostic,formatEntryDiagnostic} from '../entry-diagnostics.mjs';
import {readSession,serializeSession,writeCandidate,FORMAL_SAVE_KEY} from '../development-save.mjs';
import {commitMarketRulesUpdate} from '../market-ui.mjs';
import {PARALLEL_PARAMETERS as T} from '../economy-parameters.mjs';
const options={enabled:true,serialize:native.serializeDistillery,restore:native.restoreDistillery,monthMs:T.monthMs,stepMs:T.distillStepMs};
const encode=s=>serializeSession(s.game,s,options),raw=encode(createFreshSession(native,41)),prefix=FORMAL_SAVE_KEY+'.before-market-rules.v1.';
const app=readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
const fn=(name,next)=>app.slice(app.indexOf('function '+name+'('),app.indexOf('\nfunction '+next+'(',app.indexOf('function '+name+'(')));
const record=fn('recordEntryFailure','inspectEntry'),paint=fn('paintEntry','showTitle'),enter=app.slice(app.indexOf('async function enterSession('),app.indexOf("\n$('entry-new').addEventListener"));
function harness(fault,{existingBackup=false,continueMode=false}={}){
 const map=new Map([[FORMAL_SAVE_KEY,raw]]),writes=[];let formalWritten=false,backupReads=0;
 const error=()=>Object.assign(Error('Injected '+fault),{name:'Error',code:'fault-'+fault});
 const store={get length(){return map.size;},key:i=>[...map.keys()][i]??null,getItem(key){
  if(key.startsWith(prefix)&&++backupReads>=2&&fault==='backup-readback')return 'unverified backup';
  if(key===FORMAL_SAVE_KEY&&formalWritten&&fault==='formal-readback')return 'unverified formal';
  return map.get(key)??null;
 },setItem(key,value){if(fault==='backup-write'&&key.startsWith(prefix)||fault==='formal-write'&&key===FORMAL_SAVE_KEY)throw error();writes.push([key,value]);map.set(key,value);if(key===FORMAL_SAVE_KEY)formalWritten=true;}};
 if(existingBackup){const seedStore={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};commitMarketRulesUpdate(seedStore,FORMAL_SAVE_KEY,raw,raw);}
 const expected=inspectStartRecord(store),nodes=new Map();const $=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,textContent:'',setAttribute(){}});return nodes.get(id);};
 const ctx={localStorage:store,entryVersions:{appBuild:'entry-diagnostics-20261111-r1'},makeEntryDiagnostic,formatEntryDiagnostic,entryDiagnostic:null,entryOperation:continueMode?'continue':'new-title',entrySnapshot:expected,entryView:'confirm',entryIntent:'new',entryReturn:null,entryMessage:'',sessionActive:false,canSave:false,runtimeHalted:false,stops:0,
  debugEnabled:false,document:{body:{dataset:{}}},$,recordSaveError(){},stopClock(){ctx.stops++;},countdown:{cancel(){}},protectedRecordExports(){},clearEntryDiagnostic(){ctx.entryDiagnostic=null;}};
 const create=()=>{const s=createFreshSession(native,42);if(fault==='candidate-create')throw error();return s;};
 ctx.sessionEntry=createSessionEntry({storage:()=>store,create,encode:s=>{const text=encode(s);if(fault==='candidate-validation')throw error();return text;},read:text=>{const s=readSession(text,options);if(fault==='continue-restore')throw error();return s;},write:writeCandidate,replace:commitMarketRulesUpdate,install(){ctx.sessionActive=true;if(fault==='session-apply')throw error();},yieldTask:()=>Promise.resolve()});
 const context=vm.createContext(ctx);vm.runInContext(record+paint+enter,context);
 return {context,ctx,nodes,map,writes,run:()=>vm.runInContext('enterSession('+JSON.stringify(continueMode?'continue':'new')+')',context)};
}
for(const fault of ['candidate-create','candidate-validation','continue-restore','formal-write','formal-readback','session-apply'])test('actual entry screen reports executed '+fault+' and preserves raw protection',async()=>{
 const h=harness(fault,{continueMode:fault==='continue-restore'});assert.equal(await h.run(),false);
 const d=h.ctx.entryDiagnostic;assert.equal(d.stage,fault);assert.equal(d.exception.name,'Error');
 if(fault!=='backup-readback'&&fault!=='formal-readback')assert.equal(d.exception.code,'fault-'+fault);
 const visible=h.nodes.get('entry-diagnostic-text').textContent;
 assert(visible.includes('['+fault+']'));assert(!visible.includes(raw));assert.equal(h.nodes.get('entry-error-details').hidden,false);assert.equal(h.ctx.sessionActive,false);assert.equal(h.ctx.canSave,false);assert.equal(h.ctx.runtimeHalted,true);
 if(['formal-readback','session-apply'].includes(fault)){assert(!h.writes.some(([key])=>key.startsWith(prefix)));assert.notEqual(h.map.get(FORMAL_SAVE_KEY),raw);}
 else assert.equal(h.map.get(FORMAL_SAVE_KEY),raw);
 if(fault==='session-apply'){assert.equal(d.writeVerified,true);assert.equal(d.formalState,'candidate-verified');assert.match(visible,/新規候補の正式保存検証完了: はい/);}
 if(fault==='continue-restore')assert.match(visible,/継続記録の正式reader検証完了: いいえ/);
 if(fault==='formal-readback')assert.equal(d.formalState,'uncertain');
});
test('normal new start never enters backup faults or changes existing protected records',async()=>{
 for(const fault of ['backup-write','backup-readback']){
  const h=harness(fault);assert.equal(await h.run(),true);assert(!h.writes.some(([key])=>key.startsWith(prefix)));
 }
});
test('cleanup callback cannot erase original failure or reject outside the failure result',async()=>{
 const err=Object.assign(Error('reader failed'),{code:'original'}),data=new Map([[FORMAL_SAVE_KEY,raw]]),store={getItem:k=>data.get(k)??null};
 const e=createSessionEntry({storage:()=>store,create:()=>{},encode:()=>{},read:()=>{throw err;},write:()=>{},replace:()=>{},install:()=>{},phase:p=>{if(p==='idle')throw Error('cleanup');},yieldTask:()=>Promise.resolve()});
 const result=await e.continue(inspectStartRecord(store));assert.equal(result.error,err);assert.equal(result.stage,'continue-restore');assert.equal(e.busy,false);
});

for(const available of [false,true])test('actual diagnostic copy is read-only and remains readable when clipboard '+available,async()=>{
 const h=harness('candidate-create');await h.run();let callback,copied=null;
 const diagnostic=h.ctx.entryDiagnostic,node={addEventListener(_type,fn){callback=fn;}};
 h.ctx.navigator=available?{clipboard:{writeText:async text=>{copied=text;}}}:{};
 const previous=h.ctx.$;h.ctx.$=id=>id==='entry-copy-diagnostic'?node:previous(id);
 const writes=h.writes.length,source=app.slice(app.indexOf("$('entry-copy-diagnostic').addEventListener"),app.indexOf('const backupExport='));
 vm.runInContext(source,h.context);await callback();assert.equal(h.writes.length,writes);assert.deepEqual(h.ctx.entryDiagnostic,diagnostic);
 if(available){assert.equal(copied,formatEntryDiagnostic(diagnostic));assert.equal(previous('entry-copy-status').textContent,'コピーしました。');}
 else{assert.match(previous('entry-copy-status').textContent,/下の詳細/);assert(previous('entry-diagnostic-text').textContent.includes('candidate-create'));}
});

test('verified candidate state is not claimed when another tab changes formal data during failed apply',async()=>{
 const values=new Map([[FORMAL_SAVE_KEY,raw]]),store={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 const entry=createSessionEntry({storage:()=>store,create:()=>createFreshSession(native,42),encode,read:text=>readSession(text,options),write:writeCandidate,replace:commitMarketRulesUpdate,install(){values.set(FORMAL_SAVE_KEY,'another-tab');throw Error('apply fault');},yieldTask:()=>Promise.resolve()});
 const result=await entry.start(inspectStartRecord(store));assert.equal(result.stage,'session-apply');assert.equal(result.writeVerified,true);assert.equal(result.formalState,'uncertain');assert.equal(values.get(FORMAL_SAVE_KEY),'another-tab');assert(![...values].some(([key])=>key.startsWith(prefix)));
});
