import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as D from '../distillery.mjs';
import * as J from '../journey.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/v05-checkpoints.json',import.meta.url)));
test('pre-v06 strict replay checkpoints restore byte-for-byte, including sampling and continued sales',()=>{
 for(const save of fixture.saves)assert.equal(D.serializeDistillery(D.restoreDistillery(save)),save);
 for(const save of fixture.journeys)assert.equal(J.serializeJourney(J.restoreJourney(save)),save);
});
