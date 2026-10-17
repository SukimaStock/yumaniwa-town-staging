import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {replayCheckpoint,firstDifference} from '../design/partners/replay.mjs';
import * as V09 from '../trade.mjs';
test('QA checkpoints are reconstructed exclusively through public operations and retain exact Node state',()=>{for(const n of ['offer','accepted','assigned','due','unmet']){const s=JSON.parse(fs.readFileSync(new URL('./fixtures/partners-'+n+'.json',import.meta.url)));assert.deepEqual(replayCheckpoint(s),s);assert.equal(firstDifference(s,replayCheckpoint(s)),null);}const old=JSON.parse(fs.readFileSync(new URL('./fixtures/v09-initial.json',import.meta.url)));assert.deepEqual(replayCheckpoint(old,V09),old);});
test('QA diagnostic identifies exact field without tolerating or repairing original saves',()=>{assert.deepEqual(firstDifference({wood:.4},{wood:.40000000000001}),{path:'state.wood',fixture:.4,browser:.40000000000001});assert.throws(()=>replayCheckpoint({origin:{},operations:[]}));});
