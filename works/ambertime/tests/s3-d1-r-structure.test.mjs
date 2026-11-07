import test from 'node:test';import assert from 'node:assert/strict';
import {encode,decode,anchor,hash,validateCandidate}from '../design/s3-d1/codec.mjs';
const sample=()=>{const events=[{id:'e1',type:'release',sourceId:null,month:1,releaseId:1},{id:'e2',type:'arrival',sourceId:'e1',month:2,releaseId:1},{id:'e3',type:'arrival',sourceId:'e2',month:3,releaseId:1}];return {game:{labConnection:{town:{legitimateFutureField:{preserve:true},events,attempts:[{sourceId:'e2',month:2}],arrivals:events.slice(1)}}},recall:{}}};
const cases={
 shadowEvents:c=>c.active.game.labConnection.town.events=[],shadowAttempts:c=>c.active.game.labConnection.town.attempts=[],shadowArrivals:c=>c.active.game.labConnection.town.arrivals=[],
 correctShadow:c=>c.active.game.labConnection.town.events=sample().game.labConnection.town.events,
 unknownEnvelope:c=>c.incomplete=true,unknownTable:c=>c.events.extra=1,
 unusedSchema:c=>c.events.schemas.push(['unused']),duplicateSchema:c=>c.events.schemas.push([...c.events.schemas[0]]),emptySchema:c=>c.events.schemas.push([]),
 duplicateKey:c=>c.events.schemas[0][1]='id',schemaId:c=>c.events.rows[0][1]=999,columns:c=>c.events.rows[0].pop(),
 missingOrdinal:c=>c.events.rows[1].shift(),duplicateOrdinal:c=>c.events.rows[1][0]=0,
 reorderEvents:c=>c.events.rows.reverse(),missingEvent:c=>c.events.rows.splice(1,1),duplicateRow:c=>c.events.rows.push([...c.events.rows[2]]),
 duplicateId:c=>c.events.rows[1][2]='e1',wrongId:c=>c.events.rows[1][2]='e99',
 source:c=>c.events.rows[1][4]='bad',futureSource:c=>c.events.rows[1][4]='e3',sourceTime:c=>c.events.rows[1][5]=0,
 attemptSource:c=>c.attempts.rows[0][2]='absent',attemptTime:c=>c.attempts.rows[0][3]=0,
 missingArrival:c=>c.arrivals.pop(),reorderArrivals:c=>c.arrivals.reverse(),wrongArrival:c=>c.arrivals[0]=0,
 missingTownKey:c=>c.townKeys.pop(),duplicateTownKey:c=>c.townKeys.push(c.townKeys[0]),wrongTownKey:c=>c.townKeys[0]='absent',
 integrity:c=>c.integrity='bad',
};
for(const [name,mutate]of Object.entries(cases))for(const rehash of (name==='integrity'?[false]:[false,true]))test(`${name}, self-hash ${rehash?'recomputed':'original'} rejected before hydrate`,()=>{const x=sample(),original=JSON.stringify(x),a=anchor(x),c=encode(x);mutate(c);if(rehash){const{integrity,...body}=c;c.integrity=hash(body)}assert.throws(()=>validateCandidate(c,a));assert.throws(()=>decode(c,a));assert.equal(JSON.stringify(x),original)});
test('normal candidate preserves legitimate active game fields',()=>{const x=sample();assert.equal(validateCandidate(encode(x),anchor(x)),true);assert.equal(JSON.stringify(decode(encode(x),anchor(x))),JSON.stringify(x))});
test('non-JSON data cannot be silently normalized away',()=>{const c=encode(sample());c.extra=undefined;assert.throws(()=>decode(c,anchor(sample())),/non-JSON/)});

test('integrity-only corruption followed by recomputation is identical normal control, not a malformed candidate',()=>{const x=sample(),c=encode(x),original=JSON.stringify(c);c.integrity='bad';const{integrity,...body}=c;c.integrity=hash(body);assert.equal(JSON.stringify(c),original);assert.equal(validateCandidate(c,anchor(x)),true)});
