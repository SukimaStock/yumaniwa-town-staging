// Node-only, isolated research. No product module imports this file.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hash,encodeContext,loadAdapter} from '../checkpoint-research/prototype.mjs';
import {dependencyFingerprint} from '../checkpoint-persistence/fingerprint.mjs';
import {readSession,serializeSession} from '../development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
import {advanceRecall} from '../recall/collector.mjs';
import {advanceHistoryRecord} from '../history-record.mjs';
import {advanceRecentLedger} from '../recent-ledger.mjs';
import {reconcileCaskSlots} from '../cask-slots.mjs';
let serial=0;
const sourceHash='ea8f40410bacebcfb8a1c16ec921af095511de6db3732ee3d6f4cf2e9e32346b';
export async function createTrustManager(){
 const url=new URL('../partner-orders.mjs',import.meta.url),original=readFileSync(url,'utf8');assert.equal(hash(original),sourceHash);
 const adapter=await loadAdapter(),fingerprint=dependencyFingerprint(adapter.fingerprint);
 // Only diagnostics are added; no cache setter, validation branch, or game calculation changes.
 let source=original.replace(/from '([.][^']+)'/gu,(_,p)=>'from '+JSON.stringify(new URL(p,url).href));
 assert.equal(source.split('function apply(s,o,context,index){').length,2);
 source=source.replace('function apply(s,o,context,index){','function apply(s,o,context,index){ __applied++;');
 source+=`\nlet __applied=0;export const __research={snapshot:()=>structuredClone(checkpoint),applied:()=>__applied}; // private diagnostics instance ${++serial}\n`;
 const model=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const options={enabled:true,restore:model.restoreDistillery,serialize:model.serializeDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
 const tokens=new WeakMap();
 const currentFingerprint=()=>dependencyFingerprint(adapter.fingerprint);
 function check(token){const r=token&&tokens.get(token);assert(r,'Unknown or persisted capability: full formal admission required');assert.equal(currentFingerprint(),fingerprint,'Model/dependency fingerprint changed');return r;}
 function mint(session,text,rootSHA,previous){
  const cached=model.__research.snapshot();assert(cached,'No verified official cache');
  assert.equal(cached.operations,JSON.stringify(session.game.operations));
  const token=Object.freeze({});tokens.set(token,{text,rootSHA,previous,session:structuredClone(session),context:encodeContext(cached.context),prefix:cached.operations,origin:cached.originText,seed:cached.seed});return token;
 }
 return Object.freeze({
  // A self-hashed receipt is never accepted here; this always uses the unchanged formal reader.
  admit(text){assert.equal(currentFingerprint(),fingerprint);const s=readSession(text,options);return {token:mint(s,text,hash(text),null),session:structuredClone(s)};},
  next(token){const r=check(token),s=structuredClone(r.session),game=model.tickDistillery(s.game);return {...s,game,caskSlots:reconcileCaskSlots(game,s.caskSlots),recentLedger:advanceRecentLedger(s.game,game,s.recentLedger),historyRecord:advanceHistoryRecord(s.game,game,s.historyRecord),recallRecord:advanceRecall(s.game,game,s.recallRecord)};},
  save(token,candidate){const r=check(token);assert.equal(candidate.game.seed,r.seed);assert.equal(JSON.stringify(candidate.game.origin),r.origin);const prefix=JSON.parse(r.prefix);assert.equal(JSON.stringify(candidate.game.operations.slice(0,prefix.length)),r.prefix,'Verified prefix changed');
   const text=serializeSession(candidate.game,candidate,options);const s=readSession(text,options);assert.deepEqual(s,candidate);return {token:mint(s,text,r.rootSHA,hash(r.text)),session:structuredClone(s),text};},
  read(token){const r=check(token);return readSession(r.text,options);},
  inspect(token){const r=check(token);return {sourceSHA:hash(r.text),rootSHA:r.rootSHA,previousSHA:r.previous,prefixLength:r.session.game.operations.length,prefixDigest:hash(JSON.parse(r.prefix)),context:structuredClone(r.context),contextSHA:hash(r.context),sessionSHA:hash(r.session),fingerprint};},
  receipt(token){const d=this.inspect(token);return {...d,integrity:hash(d),guarantee:'diagnostic only; cannot reconstitute a capability'};},
  metrics(){return {applied:model.__research.applied(),fingerprint};}
 });
}
