// Run after `git archive <0253 base> works/ambertime works/ambertime-flavor-lab-v02`
// has been extracted to AMBERTIME_BASELINE. No game source is rewritten.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as After from '../partner-orders.mjs';
import {createFeedbackComments,warehouseFeedback} from '../flavor-feedback-view.mjs';
import {feedbackFixtures} from './flavor-feedback-0253-fixtures.mjs';
if(!process.env.AMBERTIME_BASELINE)throw Error('Set AMBERTIME_BASELINE to exact extracted base');
const Before=await import(pathToFileURL(path.join(process.env.AMBERTIME_BASELINE,'works/ambertime/partner-orders.mjs')));
const fixtures=process.env.AMBERTIME_FIXTURES?JSON.parse(await fs.readFile(process.env.AMBERTIME_FIXTURES,'utf8')):feedbackFixtures(),rows=[];
for(const key of ['sales','aging','previous','automatic']){
 let a=Before.restoreDistillery(fixtures[key]),b=After.restoreDistillery(fixtures[key]);const raw=After.serializeDistillery(b);createFeedbackComments().read(b);warehouseFeedback(b);assert.equal(After.serializeDistillery(b),raw);
 for(let i=0;i<2;i++){a=Before.tickDistillery(a);b=After.tickDistillery(b);}const x=Before.serializeDistillery(a),y=After.serializeDistillery(b);assert.equal(x,y,key);
 rows.push({key,seed:b.seed,month:b.core.month,bytes:Buffer.byteLength(y),sha256:createHash('sha256').update(y).digest('hex'),equal:true});
}
if(process.env.AMBERTIME_OUTPUT)await fs.writeFile(process.env.AMBERTIME_OUTPUT,JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify(rows,null,2));
