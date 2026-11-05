import {parentPort} from 'node:worker_threads';
import {createHash} from 'node:crypto';
parentPort.once('message',({mode,state,buffer})=>{const before=process.memoryUsage(),start=performance.now();if(mode==='transfer')state=JSON.parse(new TextDecoder().decode(buffer));const text=JSON.stringify(state),digest=createHash('sha256').update(text).digest('hex');parentPort.postMessage({digest,codeUnits:text.length,ms:performance.now()-start,before,after:process.memoryUsage(),note:'rss process-wide; heapUsed worker isolate only'});});
