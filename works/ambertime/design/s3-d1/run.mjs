import fs from 'node:fs';import assert from 'node:assert/strict';
import {encode,decode,anchor,hash}from './codec.mjs';
import {continueScenario}from './continue.mjs';
import {shopDialogueHistory}from '../../shop-dialogue.mjs';
const file=process.argv[2]??'/tmp/ambertime-s3-r0/wide-1200.research.json';
const input=JSON.parse(fs.readFileSync(file));const expected=anchor(input);assert.equal(expected.gameSha,"b5701cdac0a8277abe9be432cc5dd3ea126fcedc8438a62567bfce9a80d50d55");const candidate=encode(input);const restored=decode(candidate,expected);
assert.equal(JSON.stringify(restored),JSON.stringify(input));
const result={input:file,anchor:expected,units:JSON.stringify(input.game).length,bytes:Buffer.byteLength(JSON.stringify(input.game)),candidateUnits:JSON.stringify(candidate).length,candidateBytes:Buffer.byteLength(JSON.stringify(candidate)),roundtrip:true,months:[]};
for(const duration of [1,3]){const t=performance.now();const a=[],b=[];
const opts=rows=>({onTransition(game,records){rows.push({operation:true,game:hash(game),records:hash(records)})},checkpoints:Array.from({length:duration},(_,i)=>input.game.core.month+i+1),onCheckpoint(game,{records}){rows.push({month:game.core.month,game:hash(game),records:hash(records),dialogue:hash(shopDialogueHistory(game))})}});
const x=continueScenario(input,'wide',duration,opts(a));const y=continueScenario(restored,'wide',duration,opts(b));assert.deepEqual(a,b);assert.equal(JSON.stringify(x),JSON.stringify(y));assert.equal(JSON.stringify(shopDialogueHistory(x.game)),JSON.stringify(shopDialogueHistory(y.game)));
const before=input.game.labConnection.town,after=x.game.labConnection.town;
result.months.push({duration,ms:performance.now()-t,checkpoints:a,newEvents:after.events.length-before.events.length,newAttempts:after.attempts.length-before.attempts.length,newArrivals:after.arrivals.length-before.arrivals.length,newDeliveries:x.game.shop.deliveries.length-input.game.shop.deliveries.length,newReleases:x.game.releases.length-input.game.releases.length,exact:true});console.error(JSON.stringify(result.months.at(-1)));
}
fs.writeFileSync('/tmp/s3-d1-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
