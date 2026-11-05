import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {restoreOrFallback} from './persistence.mjs';
import {hash,encodeContext} from '../checkpoint-research/prototype.mjs';
const [mode,directory,source]=process.argv.slice(2),start=performance.now();
assert(['checkpoint','official'].includes(mode));
const raw=readFileSync(source,'utf8');globalThis.gc?.();
let output;
if(mode==='official'){
 const {restoreDistillery}=await import('../partner-orders.mjs');const begin=performance.now();const state=restoreDistillery(raw);assert.equal(JSON.stringify(state),raw);output={mode,restoreMs:performance.now()-begin,stateHash:hash(state)};
}else{
 const restored=await restoreOrFallback(directory,raw);
 output=restored.mode==='checkpoint'?{mode:restored.mode,stateHash:hash(restored.result.state),contextHash:hash(encodeContext(restored.result.context)),timings:restored.result.timings,replayed:restored.result.replayed,guarantee:restored.result.guarantee}:{mode:restored.mode,stateHash:hash(restored.state),reason:restored.reason,restoreMs:restored.fullRestoreMs};
}
console.log(JSON.stringify({...output,node:process.version,pid:process.pid,totalMs:performance.now()-start,peakRssBytes:process.resourceUsage().maxRSS*1024,memory:process.memoryUsage()}));
