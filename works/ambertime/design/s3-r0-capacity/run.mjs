import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {simulateScenario} from '../market-dialogue-s3/long-run.mjs';
import {MAX_FORMAL_CODE_UNITS} from '../../save-codec.mjs';
import {shopDialogueHistory} from '../../shop-dialogue.mjs';
import {hash,size,measureGame} from './measure.mjs';
const out=path.resolve(process.argv[2]??'/tmp/ambertime-s3-r0');fs.mkdirSync(out,{recursive:true});
const checkpoints=new Set([120,360,720,960,1080,1140,1200]);
const prior=JSON.parse(fs.readFileSync(new URL('../market-dialogue-s3/long-results.json',import.meta.url))).rows;
const result={sourceSha:'7635a2637da741d333934915dd68dce8a2314202',node:process.version,policy:'wide',seed:42,limit:MAX_FORMAL_CODE_UNITS,method:'Unmodified S3 simulateScenario public operations; monthly raw JSON measurements; no formal guard bypass. Fixture JSON is research-only, not a formal save.',monthly:[],checkpoints:[],firstExceeded:null};
const start=performance.now();let previousHistory=[];
function flush(){fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2)+'\n');}
simulateScenario('wide',1200,{checkpoints:Array.from({length:1200},(_,i)=>i+1),onCheckpoint(game,{records,fills,forcedBottlings}){
 const raw=JSON.stringify(game),m=game.core.month;result.monthly.push({month:m,utf16:raw.length,utf8:Buffer.byteLength(raw)});
 if(raw.length>=MAX_FORMAL_CODE_UNITS&&!result.firstExceeded){result.firstExceeded={month:m,...size(game),previous:result.monthly.at(-2)};fs.writeFileSync(path.join(out,`first-exceeded-${m}.research.json`),JSON.stringify({game,...records}));console.log('FIRST_EXCEEDED',m,raw.length);}
 if(!checkpoints.has(m))return;
 const groups=measureGame(game,records);const t=performance.now(),history=shopDialogueHistory(game),dialogueMs=performance.now()-t;
 assert.deepEqual(history.filter(e=>e.month<=(result.checkpoints.at(-1)?.month??0)),previousHistory);previousHistory=history;
 const known=prior.find(r=>r.month===m);if(known){assert.equal(hash(raw),known.cold.stateHash);assert.equal(hash({game,...records}),known.cold.sessionHash);}
 const fixture=JSON.stringify({game,...records});const filename=`wide-${m}.research.json`;fs.writeFileSync(path.join(out,filename),fixture);
 const row={month:m,years:m/12,groups,formalSizeEligible:raw.length<MAX_FORMAL_CODE_UNITS,margin:MAX_FORMAL_CODE_UNITS-raw.length,operations:game.operations.length,releases:game.releases.length,deliveries:game.shop.deliveries.length,events:game.labConnection.town.events.length,fills,forcedBottlings,dialogueMs,dialogues:history.length,dialogueHash:hash(history),gameHash:hash(raw),sessionHash:hash(fixture),fixture:filename,fixtureBytes:Buffer.byteLength(fixture),priorS3HashMatched:!!known,elapsedMs:performance.now()-start,memory:process.memoryUsage(),maxRssKiB:process.resourceUsage().maxRSS};
 result.checkpoints.push(row);flush();console.log(JSON.stringify({month:m,utf16:raw.length,margin:row.margin,town:groups.town.utf16,dialogueMs}));
}});result.totalMs=performance.now()-start;flush();
