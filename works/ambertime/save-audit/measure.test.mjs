import {test} from 'node:test';
import assert from 'node:assert/strict';
import {size,structure,instrumentedModel} from './measure.mjs';
import * as official from '../partner-orders.mjs';
test('UTF-8 bytes differ from UTF-16 code units, inclusive parents are not additive',()=>{
 assert.deepEqual(size('酒'),{bytes:5,codeUnits:3});
 const rows=structure({a:[{name:'酒'}],b:{c:[1,2]}});
 assert.equal(rows.find(r=>r.path==='a').count,1);
 assert.ok(rows[0].bytes>rows[1].bytes);
 assert.equal(rows.find(r=>r.path==='b.c').count,2);
});
test('instrumentation preserves complete validation and detects changed state',async()=>{
 const measured=await instrumentedModel();
 let state=official.newMarketRulesDistillery(42);
 const raw=official.serializeDistillery(state);
 assert.equal(measured.serializeDistillery(measured.restoreDistillery(raw)),raw);
 assert.equal(measured.__metrics.replayed,state.operations.length);
 state=JSON.parse(raw);state.core.cash+=1;
 assert.throws(()=>measured.restoreDistillery(JSON.stringify(state)));
});
