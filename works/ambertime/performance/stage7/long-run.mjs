// Fresh lawful careers. Heavy correctness work, not a latency benchmark.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {worldOpening,runNativeWorldPolicy} from '../../../ambertime-strategy-lab/world-network.mjs';
import * as D from '../../partner-orders.mjs?world=world-network-v01';
import {sessionFor} from '../../tests/regional-delivery-helpers.mjs';
import {serializeSession,readSession} from '../../development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../../economy-parameters.mjs';
const output=process.argv[2];if(!output)throw Error('Usage: node long-run.mjs OUTPUT_DIRECTORY [SEEDS]');
fs.mkdirSync(output,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
const results=[];
for(const seed of (process.argv[3]??'27,39').split(',').map(Number)){
 const run=runNativeWorldPolicy(worldOpening(seed),{policy:'distant',production:'balanced',intervalMonths:12,localFocus:'town-liquor',continuousFocus:'bar',temporaryRefusal:'wait',months:1200,retainState:true,onCheckpoint:(_s,m)=>console.log('checkpoint',seed,m.month,m.operations,m.generation)});
 const game=run.state;delete run.state;
 if(!run.completed||run.peakCasks>4)throw Error('Career did not complete: '+JSON.stringify(run.stop));
 const raw=D.serializeDistillery(game),rawHash=hash(raw);
 if(seed===27&&rawHash!=='fe6a66973f57ad7ed9758ddfab12cd88e87e8461885ce8f91c8cb7e13feb7d24')throw Error('PR907 career changed');
 fs.writeFileSync(path.join(output,`seed-${seed}-raw.json`),raw);
 const metadata=sessionFor(game),options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
 const formal=serializeSession(game,metadata,options),restored=readSession(formal,options);
 if(serializeSession(restored.game,restored,options)!==formal)throw Error('Formal bytes differ');
 fs.writeFileSync(path.join(output,`seed-${seed}-v8.json`),formal);
 const entry={...run,rawSha256:rawHash,formalSha256:hash(formal),formalBytes:Buffer.byteLength(formal),formalExact:true,conditions:'Public native career, no money/event/contract injection. This duration is not a performance benchmark. Separate fresh-process verification required.'};
 results.push(entry);fs.writeFileSync(path.join(output,'long-results.json'),JSON.stringify(results,null,2)+'\n');
 console.log('complete',seed,run.final.month,rawHash);
}
