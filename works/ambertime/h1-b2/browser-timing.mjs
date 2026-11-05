// External observation only; does not attach to or modify the browser or product.
import {readFileSync,writeFileSync,existsSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
const [directory,logFile]=process.argv.slice(2);if(!directory||!logFile)throw Error('browser-timing.mjs <scratch-output-directory> <runner-log>');
const output=resolve(directory,'browser-timing.json'),rows=[];let index=0;
const save=()=>writeFileSync(output,JSON.stringify({schema:'ambertime-h1-b2-browser-timing/1',method:'External polling of runner JSON stage log once per second. Condition start is the old-input scratch file mtime. Where current progress stage matches, completion is progress file mtime; otherwise observation time is an upper bound. Timing is diagnostic, not a controlled performance benchmark.',rows},null,2)+'\n');
for(;;){
 const lines=existsSync(logFile)?readFileSync(logFile,'utf8').split('\n'):[];
 for(;index<lines.length-1;index++){
  const line=lines[index];if(!line.startsWith('{'))continue;let row;try{row=JSON.parse(line);}catch{continue;}
  if(!row.id||!row.month||!row.stage)continue;const observedMs=Date.now(),input=resolve(directory,`${row.id}-${row.month}-old.json`),progress=resolve(directory,`${row.id}-${row.month}-progress.json`);let completedMs=observedMs,precision='observation upper bound';
  if(existsSync(progress)){const p=JSON.parse(readFileSync(progress,'utf8'));if(p.stage===row.stage){completedMs=statSync(progress).mtimeMs;precision='progress file completion mtime';}}
  const startMs=statSync(input).mtimeMs,previous=rows.filter(x=>x.id===row.id&&x.month===row.month).at(-1);rows.push({...row,observedAt:new Date(observedMs).toISOString(),completedAt:new Date(completedMs).toISOString(),completionSource:precision,elapsedFromInputMs:completedMs-startMs,sincePreviousStageMs:previous?completedMs-Date.parse(previous.completedAt):null});save();
 }
 if(existsSync(resolve(directory,'browser-results.json'))){save();break;}
 await new Promise(r=>setTimeout(r,1000));
}
