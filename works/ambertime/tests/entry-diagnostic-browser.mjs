// Test host only: it runs the actual index/app, with storage isolated before any
// application import. The production app has no fault URL or global test hook.
import * as native from '../partner-orders.mjs';
import {createFreshSession} from '../session-entry.mjs';
import {advanceRecall} from '../recall/collector.mjs';
import {advanceHistoryRecord} from '../history-record.mjs';
import {advanceRecentLedger} from '../recent-ledger.mjs';
import {reconcileCaskSlots} from '../cask-slots.mjs';
import {serializeSession,readSession,FORMAL_SAVE_KEY} from '../development-save.mjs';
import {commitMarketRulesUpdate} from '../market-ui.mjs';
import {PARALLEL_PARAMETERS as T} from '../economy-parameters.mjs';

const frame=document.getElementById('frame'),status=document.getElementById('status'),base=new URL('../',import.meta.url),backupPrefix=FORMAL_SAVE_KEY+'.before-market-rules.v1.';
const options={enabled:true,serialize:native.serializeDistillery,restore:native.restoreDistillery,monthMs:T.monthMs,stepMs:T.distillStepMs};
const encode=session=>serializeSession(session.game,session,options);
let epoch=0,appBlob=null,bootstrapBlob=null;
const [indexResponse]=await Promise.all([fetch(new URL('index.html',base))]);
if(!indexResponse.ok)throw Error('本編HTMLを開けません。');
const index=await indexResponse.text(),documentCopy=new DOMParser().parseFromString(index,'text/html'),script=documentCopy.querySelector('script[src*="shop-app.mjs"]');
if(!script)throw Error('本編入口を確認できません。');
const appURL=new URL(script.getAttribute('src'),base),sourceResponse=await fetch(appURL);
if(!sourceResponse.ok)throw Error('本編スクリプトを開けません。');
const source=await sourceResponse.text();
function memory(){const values=new Map();return {values,getItem:key=>values.get(key)??null,setItem:(key,raw)=>values.set(key,String(raw)),removeItem:key=>values.delete(key),key:index=>[...values.keys()][index]??null,get length(){return values.size;}};}
function progressed(){
 let session=createFreshSession(native,20261015);
 for(let i=0;i<8;i++){
  const before=session.game,after=native.tickDistillery(before);
  session={...session,game:after,recallRecord:advanceRecall(before,after,session.recallRecord),historyRecord:advanceHistoryRecord(before,after,session.historyRecord),recentLedger:advanceRecentLedger(before,after,session.recentLedger),caskSlots:reconcileCaskSlots(after,session.caskSlots)};
 }
 session.userPaused=true;
 // The same official reader verifies the prepared browser record.
 return readSession(encode(session),options);
}
function fixture(scenario){
 const store=memory();if(scenario==='empty')return store;
 if(scenario==='quota'){
  // Supplied lengths, synthetic opaque bytes. This reproduces capacity refusal,
  // not Safari's actual quota or acceptance of the author's previous record.
  store.setItem(FORMAL_SAVE_KEY,'Q'.repeat(891435));
  store.setItem('sukimastock.ambertime.wholesale.v20','L'.repeat(77280));
  for(const [size,char] of [[400000,'A'],[200000,'B'],[92004,'C']]){
   const raw=char.repeat(size);let hash=2166136261;
   for(let i=0;i<raw.length;i++){hash^=raw.charCodeAt(i);hash=Math.imul(hash,16777619)>>>0;}
   store.setItem(backupPrefix+raw.length+'.'+hash.toString(16),raw);
  }
  return store;
 }
 const session=scenario==='normal'?createFreshSession(native,20261015):progressed();session.userPaused=true;
 const current=encode(session);store.setItem(FORMAL_SAVE_KEY,current);
 if(scenario==='backups'){
  const first=encode(createFreshSession(native,20261016)),second=encode(createFreshSession(native,20261017));
  commitMarketRulesUpdate(store,FORMAL_SAVE_KEY,current,first);
  commitMarketRulesUpdate(store,FORMAL_SAVE_KEY,first,second);
  commitMarketRulesUpdate(store,FORMAL_SAVE_KEY,second,current);
 }
 return store;
}
function replaceOnce(text,from,to){if(!text.includes(from))throw Error('本編接続の検証位置が変わりました。');return text.replace(from,to);}
function instrumentApp(){
 // The imported public controller is wrapped at its dependency boundary. Real
 // native creation/encoding/reading executes before the matching injected error.
 let found=false,result=source.replace(/import \{([^}]+)\} from (['"][^'"]*session-entry\.mjs[^'"]*['"]);/,(_all,names,url)=>{
  const parts=names.split(',').map(name=>name.trim());if(!parts.includes('createSessionEntry'))throw Error('本編起動接続を確認できません。');found=true;
  return 'import {'+parts.map(name=>name==='createSessionEntry'?'createSessionEntry as observedSessionEntry':name).join(',')+'} from '+url+';';
 });
 if(!found)throw Error('本編起動接続を確認できません。');
 result=result.replace(/((?:from\s*|import\s*)['"])(\.\.?\/[^'"]+)(['"])/g,(_all,start,rel,end)=>start+new URL(rel,appURL).href+end);
 result=result.replaceAll('import.meta.url',JSON.stringify(appURL.href));
 return result+`\n`;
}
// Declarations precede the original module body, so its controller uses the
// wrappers while every model and all presentation remain the actual imports.
const wrapper=`const createSessionEntry=options=>observedSessionEntry({...options,
 create:()=>{const value=options.create();window.__amberEntryQA.inject('candidate-create');return value;},
 encode:value=>{const text=options.encode(value);window.__amberEntryQA.inject('candidate-validation');return text;},
 read:raw=>{const value=options.read(raw);window.__amberEntryQA.inject('continue-restore');return value;},
 install:(...args)=>{window.__amberEntryQA.inject('session-apply');return options.install(...args);},
 phase:value=>{window.__amberEntryQA.phase=value;return options.phase?.(value);}
});\n`;
async function reset(){
 const own=++epoch,scenario=document.getElementById('scenario').value,fault=document.getElementById('fault').value;
 status.textContent='検証を準備しています。';
 const store=fixture(scenario),initial=store.getItem(FORMAL_SAVE_KEY),entries=[...store.values];
 if(own!==epoch)return;
 if(appBlob)URL.revokeObjectURL(appBlob);if(bootstrapBlob)URL.revokeObjectURL(bootstrapBlob);
 appBlob=URL.createObjectURL(new Blob([wrapper,instrumentApp()],{type:'text/javascript'}));
 const bootstrap=`const values=new Map(${JSON.stringify(entries)}),initial=${JSON.stringify(initial)},prefix=${JSON.stringify(backupPrefix)},formal=${JSON.stringify(FORMAL_SAVE_KEY)},fault=${JSON.stringify(fault)},scenario=${JSON.stringify(scenario)};
 let fired=false,formalWritten=false,quotaRefusals=0,removedBackups=0;const reads=new Map();
 const qa={phase:'idle',inject(stage){if(!fired&&fault===stage){fired=true;throw Object.assign(Error('Injected entry failure: '+stage),{name:'InjectedEntryError',code:'QA_'+stage.toUpperCase().replaceAll('-','_')});}}};
 Object.defineProperty(window,'__amberEntryQA',{value:qa});
 const report=()=>parent.postMessage({amberEntryReport:{scenario,fault,fired,phase:qa.phase,formalSame:values.get(formal)===initial,formalCharacters:values.get(formal)?.length??0,quotaRefusals,removedBackups,totalCharacters:[...values.values()].reduce((n,v)=>n+v.length,0),legacySame:scenario!=='quota'||values.get('sukimastock.ambertime.wholesale.v20')==='L'.repeat(77280),backupCount:[...values.keys()].filter(k=>k.startsWith(prefix)).length,oldRawProtected:[...values].some(([k,v])=>k.startsWith(prefix)&&v===initial),detailVisible:!document.getElementById('entry-error-details')?.hidden}},location.origin==='null'?'*':location.origin);
 const storage={get length(){return values.size;},key:i=>[...values.keys()][i]??null,getItem(key){
  if(qa.phase==='writing'&&key.startsWith(prefix)){const n=(reads.get(key)??0)+1;reads.set(key,n);if(!fired&&fault==='backup-readback'&&n===2){fired=true;return 'qa-readback-mismatch';}}
  if(qa.phase==='writing'&&key===formal&&formalWritten&&!fired&&fault==='formal-readback'){fired=true;return 'qa-readback-mismatch';}
  return values.get(key)??null;
 },setItem(key,raw){if(qa.phase==='writing'&&key.startsWith(prefix))qa.inject('backup-write');if(qa.phase==='writing'&&key===formal)qa.inject('formal-write');if(scenario==='quota'){
   const total=[...values].reduce((n,[k,v])=>n+(k===key?0:v.length),0)+String(raw).length;
   if(total>2400000){quotaRefusals++;throw new DOMException('The quota has been exceeded.','QuotaExceededError');}
  }values.set(key,String(raw));if(key===formal)formalWritten=true;queueMicrotask(report);},removeItem(key){const removed=values.delete(key);if(removed&&key.startsWith(prefix))removedBackups++;queueMicrotask(report);}};
 const sessionValues=new Map(),session={get length(){return sessionValues.size;},key:i=>[...sessionValues.keys()][i]??null,getItem:k=>sessionValues.get(k)??null,setItem:(k,v)=>sessionValues.set(k,String(v)),removeItem:k=>sessionValues.delete(k)};
 Object.defineProperty(window,'localStorage',{value:storage});Object.defineProperty(window,'sessionStorage',{value:session});
 window.addEventListener('message',event=>{if(event.source===parent&&event.data?.amberEntryMeasure)report();});
 await import(${JSON.stringify(appBlob)});
 new MutationObserver(report).observe(document.getElementById('entry-screen'),{subtree:true,attributes:true,childList:true,characterData:true});report();`;
 bootstrapBlob=URL.createObjectURL(new Blob([bootstrap],{type:'text/javascript'}));
 const copy=new DOMParser().parseFromString(index,'text/html');copy.querySelector('script[src*="shop-app.mjs"]').remove();
 const baseNode=copy.createElement('base');baseNode.href=base.href;copy.head.prepend(baseNode);
 const module=copy.createElement('script');module.type='module';module.src=bootstrapBlob;copy.body.append(module);
 frame.srcdoc='<!doctype html>'+copy.documentElement.outerHTML;
}
for(const button of document.querySelectorAll('[data-size]'))button.addEventListener('click',()=>{const [w,h]=button.dataset.size.split(',');frame.style.width=w+'px';frame.style.height=h+'px';});
document.getElementById('reset').addEventListener('click',()=>reset().catch(error=>{status.textContent=error.message;}));
document.getElementById('measure').addEventListener('click',()=>frame.contentWindow.postMessage({amberEntryMeasure:true},location.origin));
window.addEventListener('message',event=>{if(event.source===frame.contentWindow&&event.data?.amberEntryReport)status.textContent=JSON.stringify(event.data.amberEntryReport,null,2);});
await reset();
