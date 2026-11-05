// Fresh-process diagnostic of the exact browser import identities; no model changes.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [file,mode,output]=process.argv.slice(2);
assert(['before','shared'].includes(mode));
const raw=readFileSync(file,'utf8'),sha=x=>createHash('sha256').update(x).digest('hex');
const D=await import('../partner-orders.mjs?v=market-rules-r1'+(mode==='before'?'&touch=1':''));
const {createCaskSerials}=await import('../cask-serials.mjs?v=market-rules-r1');
const times={},measure=(name,fn)=>{const start=performance.now();const value=fn();times[name]=performance.now()-start;return value;};
const started=performance.now();
let state=measure('formalReaderMs',()=>D.restoreDistillery(raw));
state=measure('bootEnableMs',()=>D.enableStoreMarket(D.enableStage4(state)));
const serials=createCaskSerials(),numbers=measure('firstSerialMs',()=>serials(state));
measure('sameStateSerialMs',()=>serials(state));
assert.equal(JSON.stringify(state),raw);
const result={schema:'ambertime-h1-c1-replay-timing/1',mode,input:file.split('/').at(-1),inputSha256:sha(raw),node:process.version,times,totalMs:performance.now()-started,peakRssBytes:process.resourceUsage().maxRSS*1024,serialSha256:sha(JSON.stringify([...numbers])),stateSha256:sha(JSON.stringify(state)),fingerprint:sha(['partner-orders.mjs','cask-serials.mjs'].map(p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')).join('\n'))};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
