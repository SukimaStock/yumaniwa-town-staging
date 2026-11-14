// Node-only research. Never imported by the product. v8 stays authoritative.
import assert from 'node:assert/strict';
import {loadAdapter,verifyCheckpoint,replayTail,hash,encodeContext} from '../checkpoint-research/prototype.mjs';
import {dependencyFingerprint} from '../checkpoint-persistence/fingerprint.mjs';
import * as D from '../partner-orders.mjs';
import {readSession,serializeSession} from '../development-save.mjs';
import {expandFormalGame,assertFormalSize} from '../save-codec.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
import {advanceRecall} from '../recall/collector.mjs';
import {advanceHistoryRecord} from '../history-record.mjs';
import {advanceRecentLedger} from '../recent-ledger.mjs';
import {reconcileCaskSlots} from '../cask-slots.mjs';
export const options={enabled:true,restore:D.restoreDistillery,serialize:D.serializeDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
export const full=text=>readSession(text,options);
export const wire=s=>serializeSession(s.game,s,options);
export const seal=p=>({...p,integrity:hash(p)});
export function open(e){assert(e&&typeof e==='object','Missing checkpoint');const {integrity,...p}=e;assert.equal(hash(p),integrity,'Envelope integrity');return p;}
export function target(text){const wire=JSON.parse(text);assert.equal(wire.version,8);const raw=expandFormalGame(wire.game);assertFormalSize(raw);return {wire,raw,game:JSON.parse(raw)};}
export const sidecars=w=>Object.fromEntries(Object.entries(w).filter(([k])=>k!=='game'));
export async function fast(text,envelope){
 const times={},start=performance.now();const {raw,wire:w}=target(text);times.decodeMs=performance.now()-start;
 const p=open(envelope);assert.equal(p.format,'ambertime-l100-4b-1/1');assert.equal(p.sourceSHA,hash(text),'v8 binding');assert.equal(p.targetSHA,hash(raw));
 const adapter=await loadAdapter();const t=performance.now();assert.equal(p.codeFingerprint,dependencyFingerprint(adapter.fingerprint),'Dependency fingerprint');
 assert.equal(p.validation,'independent-full-replay-and-official-session');
 assert.equal(p.generationId,p.checkpoint.state.generations?.active.id??null);assert.equal(p.revision,p.checkpoint.nextIndex);
 assert.equal(p.collectorMode,'endpoint-v8-not-prefix');assert.equal(p.collectorDigest,hash(sidecars(w)),'Endpoint collector changed');
 assert.equal(p.prefixLength,p.checkpoint.nextIndex);assert.equal(p.prefixDigest,p.checkpoint.prefixHash);
 assert.deepEqual(p.tail,JSON.parse(raw).operations.slice(p.prefixLength),'Tail mismatch');
 verifyCheckpoint(adapter,p.checkpoint,raw);times.validationMs=performance.now()-t;
 const replay=replayTail(adapter,p.checkpoint,raw);times.tailMs=replay.tailMs;times.contextAndVerifyMs=replay.verifyMs;times.finalizeMs=replay.finalizeMs;times.compareMs=replay.compareMs;
 const s=performance.now();const session=readSession(text,{...options,restore:argument=>{assert.equal(argument,raw);assert.equal(JSON.stringify(replay.state),argument);return replay.state;}});times.collectorAndSessionValidationMs=performance.now()-s;
 times.totalMs=performance.now()-start;
 return {session,context:encodeContext(replay.context),timings:times,replayed:replay.replayed,guarantee:'Creator trust + integrity, original v8 endpoint collector validation. Not independent replay on this load.'};
}
export async function fallback(text,envelope,previous=[]){
 try{return {mode:'checkpoint',...(await fast(text,envelope))};}catch(error){
  const reasons=[error.message];for(const candidate of [text,...previous]){try{return {mode:'formal-fallback',session:full(candidate),sourceSHA:hash(candidate),reasons};}catch(e){reasons.push(e.message);}}
  throw Object.assign(Error('Safe stop: no valid original or previous v8'),{reasons});
 }
}
export function advance(session,operation=s=>D.tickDistillery(s)){
 const game=operation(session.game);return {...session,game,caskSlots:reconcileCaskSlots(game,session.caskSlots),recentLedger:advanceRecentLedger(session.game,game,session.recentLedger),historyRecord:advanceHistoryRecord(session.game,game,session.historyRecord),recallRecord:advanceRecall(session.game,game,session.recallRecord)};
}
