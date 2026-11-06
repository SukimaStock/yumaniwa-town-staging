import test from 'node:test';
import assert from 'node:assert/strict';
import {loadRecords} from '../h3-1/data.mjs';
import {boundaryInput,compareBoundary} from '../h3-1/selection.mjs';
import {selectC,selectionSeed} from './select.mjs';
test('unchanged H3-1 C selection adapter and seed match all published boundaries',()=>{
 let count=0;
 for(const {record} of loadRecords().records)for(const snapshot of record.recallSnapshots){
  const ctx=boundaryInput(record,snapshot.handoverId),expected=compareBoundary(record,snapshot.handoverId);
  const seed=selectionSeed(record.seed,ctx.boundary);assert.equal(seed,expected.seed);
  assert.deepEqual(selectC({...ctx,seed}),expected.modes.C.scenes);count++;
 }
 assert.equal(count,12);
});
