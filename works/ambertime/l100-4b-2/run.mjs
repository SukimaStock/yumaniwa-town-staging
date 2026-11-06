import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createTrustManager} from './trust.mjs';
import {hash} from '../checkpoint-research/prototype.mjs';
const [input,out]=process.argv.slice(2),text=readFileSync(input,'utf8'),rows=[];
const native=globalThis.structuredClone;let clones=0,cloneMs=0;globalThis.structuredClone=(...a)=>{let t=performance.now();try{return native(...a)}finally{clones++;cloneMs+=performance.now()-t;}};
const manager=await createTrustManager();
function phase(name,fn){clones=0;cloneMs=0;const n=manager.metrics().applied,t=performance.now(),result=fn();rows.push({name,ms:performance.now()-t,clones,cloneMs,replayed:manager.metrics().applied-n});console.log(JSON.stringify(rows.at(-1)));return result;}
let admitted=phase('full-admission-no-cold-speedup',()=>manager.admit(text));const initial=manager.inspect(admitted.token);
const next=phase('first-month',()=>manager.next(admitted.token));let saved=phase('first-save-after-full-admission',()=>manager.save(admitted.token,next));
const after=phase('second-month',()=>manager.next(saved.token));let second=phase('second-save',()=>manager.save(saved.token,after));
const reloaded=phase('same-process-reload',()=>manager.read(second.token));assert.deepEqual(reloaded,second.session);const future=phase('continued-month',()=>manager.next(second.token));assert.equal(future.game.core.month,next.game.core.month+2);
assert.equal(readFileSync(input,'utf8'),text);globalThis.gc?.();
writeFileSync(out,JSON.stringify({node:process.version,pid:process.pid,input,inputSHA:hash(text),v8Bytes:Buffer.byteLength(text),rows,initial,final:manager.inspect(second.token),firstSaveSHA:hash(saved.text),secondSaveSHA:hash(second.text),secondSaveBytes:Buffer.byteLength(second.text),formalCodeUnits:JSON.stringify(second.session.game).length,formalStateAndCollectorRoundtrip:true,sourcePreserved:true,memory:process.memoryUsage(),maxRSSKiB:process.resourceUsage().maxRSS,coldGate:'NOT PASSED: full replay admission cost remains; no persisted capability',scope:'Fresh process; official code reused with read-only cache diagnostics and apply counter. Internal timings include proof work; no IDB/browser claims; OS cache uncontrolled.'},null,2));
