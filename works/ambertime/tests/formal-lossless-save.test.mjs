import test from 'node:test';import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';import {naturalDeliveryFixture,sessionFor,months} from './regional-delivery-helpers.mjs';
import {readSession,serializeSession,isCurrentSession,SUPPORTED_FORMAL_VERSIONS} from '../development-save.mjs';
import {encodeExactJSON,decodeExactJSON} from '../lossless-json.mjs';import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
const opts={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
test('legacy8 stays byte-identical/default; explicit9 fully restores original game and every sidecar',()=>{
 const game=naturalDeliveryFixture(),s=sessionFor(game),old=serializeSession(game,s,opts),packed=serializeSession(game,s,{...opts,encoding:'lossless-v1'});
 assert.equal(JSON.parse(old).version,8);assert.equal(JSON.parse(packed).version,9);assert.deepEqual(SUPPORTED_FORMAL_VERSIONS,[8,9]);assert(isCurrentSession(old)&&isCurrentSession(packed));
 const expected=JSON.stringify({...s,game}),restored=readSession(packed,opts);assert.equal(JSON.stringify({...s,...restored}),expected);
 assert.equal(serializeSession(restored.game,restored,opts),old);assert.equal(serializeSession(restored.game,restored,{...opts,encoding:'lossless-v1'}),packed);
 const next=months(restored.game,1),ns=sessionFor(next),p2=serializeSession(next,ns,{...opts,encoding:'lossless-v1'});assert.deepEqual(readSession(p2,opts),{...ns,game:next});
});
test('native compressed reader retains full replay and rejects money tampering',()=>{
 const s=naturalDeliveryFixture(),raw=D.serializeDistillery(s),p=encodeExactJSON(raw,'native');assert.equal(D.serializeDistillery(D.restoreDistillery(p)),raw);
 const bad=JSON.parse(raw);bad.core.cash++;assert.throws(()=>D.restoreDistillery(encodeExactJSON(JSON.stringify(bad),'native')));
});
test('v9 retains all session constraints and rejects sidecar/elapsed corruption',()=>{
 const game=naturalDeliveryFixture(),s=sessionFor(game),p=serializeSession(game,s,{...opts,encoding:'lossless-v1'});
 for(const f of [x=>x.elapsed=-1,x=>x.userPaused='yes',x=>x.historyRecord=null,x=>x.recallRecord=null,x=>x.recentLedger=null,x=>x.extra=1]){
  const outer=JSON.parse(p),logical=JSON.parse(decodeExactJSON(JSON.stringify(outer.data),'session'));f(logical);outer.data=JSON.parse(encodeExactJSON(JSON.stringify(logical),'session'));assert.throws(()=>readSession(JSON.stringify(outer),opts));
 }
 assert.throws(()=>serializeSession(game,s,{...opts,encoding:'unknown'}));
});
test('v9 cold child process reconstructs independent pre-encoding original and first resave',async()=>{
 const {execFileSync}=await import('node:child_process');const game=naturalDeliveryFixture(),s=sessionFor(game),raw=serializeSession(game,s,{...opts,encoding:'lossless-v1'});
 const program=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};import {readSession,serializeSession} from ${JSON.stringify(new URL('../development-save.mjs',import.meta.url).href)};const o={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:${P.monthMs},stepMs:${P.distillStepMs},encoding:'lossless-v1'};const text=fs.readFileSync(0,'utf8'),s=readSession(text,o);if(serializeSession(s.game,s,o)!==text)throw Error('first resave differs');process.stdout.write(JSON.stringify(s));`;
 const expected={game,userPaused:s.userPaused,elapsed:s.elapsed,caskSlots:s.caskSlots,recentLedger:s.recentLedger,historyRecord:s.historyRecord,recallRecord:s.recallRecord};
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',program],{input:raw,encoding:'utf8',maxBuffer:32e6}),JSON.stringify(expected));
});
