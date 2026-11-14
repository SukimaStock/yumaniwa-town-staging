import {readFileSync,writeFileSync,mkdirSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createReference,cadencePair,options} from './reference.mjs';
import {assess,firstDifference} from './replay.mjs';
import {readSession} from '../../development-save.mjs';
const here=dirname(fileURLToPath(import.meta.url)),out=resolve(process.argv[2]??`${here}/evidence/run-final`);
const sha=value=>createHash('sha256').update(value).digest('hex'),git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const originalPath=process.env.AMBERTIME_NORMAL_V8?resolve(process.env.AMBERTIME_NORMAL_V8):null;
const originalBytes=originalPath?readFileSync(originalPath):null;
if(originalBytes&&sha(originalBytes)!=='48751764f194f0e9909abd1186db79fa9d50b832ecbb14a776b5b8eb94198693')throw Error('Unexpected original v8');
const names=['cadence-per-operation-v8.json','cadence-batched-v8.json','filled-origin-v8.json','results.json',...(originalBytes?['reused-24-month-v8.json']:[])];
// Refuse any pre-existing output (including symlink/hardlink aliases), before
// the first write. Exclusive creation also closes the ordinary file race.
for(const name of names){let exists=false;try{lstatSync(`${out}/${name}`);exists=true;}catch(e){if(e.code!=='ENOENT')throw e;}if(exists)throw Error('output-exists:'+name);}
mkdirSync(out,{recursive:true});
const write=(name,bytes)=>writeFileSync(`${out}/${name}`,bytes,{flag:'wx'});
const {per,batch,filled}=cadencePair(),a=assess(per.wire),b=assess(batch.wire);
for(const [name,text] of [['cadence-per-operation-v8.json',per.wire],['cadence-batched-v8.json',batch.wire],['filled-origin-v8.json',filled.wire]])write(name,text);
const identicalInput=JSON.stringify(a.input)===JSON.stringify(b.input),identicalGame=JSON.stringify(a.session.game)===JSON.stringify(b.session.game);
if(!identicalInput||!identicalGame||!a.comparison.historyRecord.equal||b.comparison.historyRecord.equal)throw Error('Counterexample expected properties failed');
const files=['reference.mjs','replay.mjs','run.mjs'];
let reused=null;if(originalBytes){
 const path=originalPath,bytes=originalBytes,before=sha(bytes);
 const r=assess(bytes.toString('utf8'));let rejected=0;for(const broken of [bytes.toString('utf8').slice(0,-1),'',JSON.stringify({...JSON.parse(bytes),version:999})]){try{readSession(broken,options);}catch{rejected++;}}
 const restored=readSession(bytes.toString('utf8'),options);const continued=createReference({wire:bytes.toString('utf8')});continued.apply('tickDistillery');
 const after=sha(readFileSync(path));if(before!==after||rejected!==3)throw Error('Original protection failed');
 write('reused-24-month-v8.json',bytes);
 reused={source:path,sourceMeaning:'Existing normal 24-month v8 newly generated during prior #864 research; not historical user save',sha256:before,bytes:bytes.length,month:restored.game.core.month,operations:restored.game.operations.length,comparison:r.comparison,rejectedCandidates:rejected,shaAfter:after,continuedMonth:continued.game.core.month,copiedBytes:sha(readFileSync(`${out}/reused-24-month-v8.json`))};
}
const evidence={schema:1,verdict:'information-insufficiency-counterexample',createdAt:new Date().toISOString(),base:'8f50ecac82066fcb02958f7514d64e79d19696f5',planCommit:'9560c6b9500c1b4e281f442dd68442e7863d0c0b',runCommit:git('rev-parse','HEAD'),codeHashes:Object.fromEntries(files.map(f=>[f,sha(readFileSync(`${here}/${f}`))])),node:process.version,flags:process.execArgv,
 scope:'Isolated adapter of current constructor/observer/saveCandidate success order. Varied batch cadence not asserted to be emitted by current UI.',
 sameReplayInput:identicalInput,inputSHA256:sha(JSON.stringify(a.input)),sameGame:identicalGame,gameSHA256:sha(JSON.stringify(a.session.game)),month:a.session.game.core.month,operationCount:a.session.game.operations.length,
 per:{wireSHA256:sha(per.wire),bytes:Buffer.byteLength(per.wire),comparison:a.comparison,saveBoundaries:per.commits},batch:{wireSHA256:sha(batch.wire),bytes:Buffer.byteLength(batch.wire),comparison:b.comparison,saveBoundaries:batch.commits},
 firstHistoryDifference:firstDifference(a.session.historyRecord,b.session.historyRecord,'historyRecord'),nonempty:{historyEvents:a.session.historyRecord.events.length,recallRetainedFacts:Object.keys(a.session.recallRecord.facts).length,recallObserved:a.session.recallRecord.observed,completedRecalls:a.session.recallRecord.completed.length},
 reusedV8:reused,resource:{maxRSSKiB:process.resourceUsage().maxRSS,heapUsedBytes:process.memoryUsage().heapUsed},notProven:['current UI emits batched bottle+price','arbitrary legacy sidecars independently reconstructible','completed generation recall sentences','persistent atomicity/power-loss/quota','100year formal save','D1 completion','S3 completion','browser/iPhone Safari']};
if(evidence.resource.maxRSSKiB>768*1024)throw Error('Research RSS ceiling exceeded');
write('results.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
