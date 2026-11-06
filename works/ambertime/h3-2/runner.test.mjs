import test from 'node:test';
import assert from 'node:assert/strict';
import {samples,compareEditions,sceneMarkdown} from './compare.mjs';
test('diagnostics separate selected membership from text and causal-context differences',()=>{
 const a={seed:3,scenes:[{eventId:'arrival:e1',sentence:'a',illustration:{},links:[]}]};
 const b={seed:3,scenes:[{eventId:'arrival:e1',sentence:'b',illustration:{},links:[{causal:false}]}]};
 assert.deepEqual(compareEditions(a,b),{sameIds:true,sameSeed:true,lost:[],added:[],sharedDifferences:[{id:'arrival:e1',fields:['sentence','links']}],explanation:'Same selected event IDs. Any wording/context difference is listed separately.'});
});
test('timing summaries handle no events and preserve median versus p95',()=>{
 assert.equal(samples([]).medianMs,null);assert.equal(samples([9,2,1,4,3]).medianMs,3);assert.equal(samples([9,2,1,4,3]).p95Ms,9);
});
test('scene report presents no causal relationship as unconfirmed rather than inventing one',()=>{
 const text=sceneMarkdown([{policy:'local',years:30,generation:1,small:{seed:1,cutoff:{month:321},scenes:[{eventId:'delivery:1',event:{kind:'delivery',month:4},sentence:'酒が届いた。',category:'店',reason:'実際の納品',links:[],illustration:{location:'酒店',action:'瓶が届く'}}]}}]);
 assert.match(text,/隣接場面というだけでは因果としない/);assert.match(text,/delivery:1/);
});
