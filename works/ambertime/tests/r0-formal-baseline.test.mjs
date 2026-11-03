import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {BASE,formalTraces,hash} from './r0-formal-trace.mjs';
const expected=JSON.parse(fs.readFileSync(new URL('./fixtures/r0-formal-traces.json',import.meta.url)));
test('R0 fixed legal manual/staff/market public actions preserve all129 intermediate byte/RNG/month/economy/notification snapshots',()=>{
 assert.equal(expected.base,BASE);const actual=formalTraces();assert.equal(actual.reduce((n,t)=>n+t.rows.length,0),129);
 assert.deepEqual(actual.map(({name,rows})=>({name,rows})),expected.traces);
 for(const {name,rows,raws} of actual){assert.equal(rows.length,raws.length);for(let n=0;n<raws.length;n++){const raw=raws[n];assert.equal(hash(raw),rows[n].sha256);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw,`${name}/${rows[n].label} warm replay`);}}
 // A separate fresh process has no projection checkpoints from the generating
 // process. Compare actual serialized strings, not just selected UI fields.
 const raws=actual.flatMap(t=>t.raws),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};const rows=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(JSON.stringify(rows.map(raw=>D.serializeDistillery(D.restoreDistillery(raw)))));`;
 const cold=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],{input:JSON.stringify(raws),encoding:'utf8',maxBuffer:32*1024*1024}));assert.deepEqual(cold,raws);
 const staff=actual.find(t=>t.name==='staff-monthly-seed42');assert(staff.rows.some(r=>r.reservation==='active'));assert.equal(staff.rows.at(-1).reservation,null);
 const market=actual.find(t=>t.name==='market-adoption-monthly');assert(market.rows.some(r=>r.stock.some(p=>p.sold>0)));assert(market.rows.at(-1).month>market.rows[0].month);
});
