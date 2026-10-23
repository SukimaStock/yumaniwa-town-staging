// Compare the same saved operation sequences against an exact git-archive base.
import fs from 'node:fs/promises';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import * as After from '../partner-orders.mjs';import {createFeedbackComments,warehouseFeedback} from '../flavor-feedback-view.mjs';
if(!process.env.AMBERTIME_BASELINE||!process.env.AMBERTIME_FIXTURES)throw Error('Set AMBERTIME_BASELINE and AMBERTIME_FIXTURES');
const Before=await import(pathToFileURL(path.join(process.env.AMBERTIME_BASELINE,'works/ambertime/partner-orders.mjs'))),f=JSON.parse(await fs.readFile(process.env.AMBERTIME_FIXTURES,'utf8')),rows=[];
for(const key of ['initial','fresh','named','next','sales']){
 let a=Before.restoreDistillery(f[key]),b=After.restoreDistillery(f[key]);const original=After.serializeDistillery(b);createFeedbackComments().read(b);warehouseFeedback(b);assert.equal(After.serializeDistillery(b),original);
 for(let i=0;i<2;i++){a=Before.tickDistillery(a);b=After.tickDistillery(b);}const x=Before.serializeDistillery(a),y=After.serializeDistillery(b);assert.equal(x,y,key);rows.push({fixture:key,seed:b.seed,month:b.core.month,bytes:Buffer.byteLength(y),sha256:createHash('sha256').update(y).digest('hex'),equal:true});
}
if(process.env.AMBERTIME_OUTPUT)await fs.writeFile(process.env.AMBERTIME_OUTPUT,JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows,null,2));
