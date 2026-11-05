import test from 'node:test';
import assert from 'node:assert/strict';
import {encode,decode,inspect,SCHEMA} from './adapter.mjs';
const fixture=()=>({version:20,seed:31,labConnection:{town:{month:7,events:[{id:'e1',type:'shipment',sourceId:null,reason:'引用"\\\n日本語🌱'},{id:'e2',type:'arrival',sourceId:'e1',path:['a','b'],strength:.123},{id:'e3',type:'interest',sourceId:'e2'},{id:'e4',type:'arrival',sourceId:'e3',path:['b'],strength:.456}],arrivals:[{id:'e2',type:'arrival',sourceId:'e1',path:['a','b'],strength:.123},{id:'e4',type:'arrival',sourceId:'e3',path:['b'],strength:.456}],attempts:[{type:'inquiry',sourceId:'e2',roll:.1}],pending:[{sourceId:'e3'}],seen:{'e2:b':true}}},operations:[]});
const raw=()=>JSON.stringify(fixture());
const change=(text,fn)=>{const value=JSON.parse(text);fn(value);return JSON.stringify(value);};
test('A/B/C restore exact canonical bytes, key position and all non-arrival data',()=>{
 const source=raw();for(const variant of ['A','B','C']){const wire=encode(source,variant);assert.equal(decode(wire),source);assert.equal(inspect(wire).variant,variant);assert.equal(raw(),source);const restored=JSON.parse(decode(wire)),town=restored.labConnection.town;assert.notEqual(town.arrivals[0],town.events[1]);assert.notEqual(town.arrivals[0].path,town.events[1].path);town.arrivals[0].path.push('mutated');assert.equal(town.events[1].path.length,2);}
 const b=JSON.parse(encode(source,'B')),c=JSON.parse(encode(source,'C'));assert.deepEqual(b.game.labConnection.town.arrivals,['e2','e4']);assert(!Object.hasOwn(c.game.labConnection.town,'arrivals'));assert.equal(c.schema,SCHEMA);
});
test('B preserves explicit order/subsets; C rejects any nonderived arrival ordering or membership',()=>{
 for(const arrivals of [[],[fixture().labConnection.town.arrivals[1]],[...fixture().labConnection.town.arrivals].reverse()]){const g=fixture();g.labConnection.town.arrivals=arrivals;const source=JSON.stringify(g);assert.equal(decode(encode(source,'B')),source);assert.throws(()=>encode(source,'C'),/complete event-order/);}
 const g=fixture();g.labConnection.town.events=[];g.labConnection.town.arrivals=[];assert.equal(decode(encode(JSON.stringify(g),'C')),JSON.stringify(g));
});
test('encoder rejects duplicate/dangling/nonarrival/different event records without changing caller',()=>{
 for(const mutate of [t=>t.events.push(t.events[0]),t=>t.arrivals.push(t.arrivals[0]),t=>t.arrivals[0].id='missing',t=>t.arrivals[0]={...t.events[0]},t=>t.arrivals[0].strength=.9]){const g=fixture();mutate(g.labConnection.town);const before=JSON.stringify(g);for(const variant of ['A','B','C'])assert.throws(()=>encode(before,variant));assert.equal(JSON.stringify(g),before);}
});
test('decoder rejects malformed version/envelope/reference/key metadata and noncanonical JSON',()=>{
 const b=encode(raw(),'B'),c=encode(raw(),'C');
 for(const mutate of [v=>v.schema='future',v=>v.extra=true,v=>v.variant='D',v=>v.arrivalsKeyIndex=-1,v=>v.arrivalsKeyIndex=0,v=>v.game.version=21,v=>v.game.labConnection.town.arrivals=['e2','e2'],v=>v.game.labConnection.town.arrivals=['missing'],v=>v.game.labConnection.town.arrivals=['e1'],v=>v.game.labConnection.town.events.push(v.game.labConnection.town.events[0])])assert.throws(()=>decode(change(b,mutate)));
 for(const mutate of [v=>v.arrivalsKeyIndex=999,v=>v.game.labConnection.town.arrivals=[],v=>delete v.arrivalsKeyIndex])assert.throws(()=>decode(change(c,mutate)));
 for(const invalid of ['null','[]','{}',' '+raw(),raw()+'\n','{"version":20,"version":21}','not JSON'])assert.throws(()=>decode(invalid));
 assert.throws(()=>encode(raw(),'D'));assert.throws(()=>encode(' '+raw(),'B'));
});
test('key-order restoration handles arrivals at first and last town positions',()=>{
 for(const position of [0,6]){const g=fixture(),entries=Object.entries(g.labConnection.town),entry=entries.splice(entries.findIndex(([k])=>k==='arrivals'),1)[0];entries.splice(position,0,entry);g.labConnection.town=Object.fromEntries(entries);const source=JSON.stringify(g);for(const variant of ['A','B','C'])assert.equal(decode(encode(source,variant)),source);}
});
