import test from 'node:test';import assert from 'node:assert/strict';
import {measure,jsonSize,digest} from '../design/s3-d0/measure.mjs';
const fixture=()=>({game:{labConnection:{town:{events:[{type:'arrival',id:'e1',text:'酒🍶'},{type:'attempt',id:'e2'}],attempts:[{id:'a1',success:false}],arrivals:[{type:'arrival',id:'e1',text:'酒🍶'}],seen:{e1:true}}}},historyRecord:{rows:[]}});
test('capacity accounting does not mutate source',()=>{const x=fixture(),before=JSON.stringify(x);const r=measure(x);assert.equal(JSON.stringify(x),before);assert.equal(r.gameSha256,digest(x.game));assert.equal(r.counts.arrivals,1);});
test('arrival mismatch cannot be hidden by size accounting',()=>{const x=fixture();x.game.labConnection.town.arrivals[0].id='e9';assert.throws(()=>measure(x),/mismatch/);});
test('UTF16 and UTF8 are distinct',()=>assert.deepEqual(jsonSize('🍶'),{utf16:4,utf8:6}));
test('empty histories retain explicit structure',()=>{const x=fixture();for(const k of ['events','attempts','arrivals'])x.game.labConnection.town[k]=[];assert.equal(measure(x).counts.events,0);});
