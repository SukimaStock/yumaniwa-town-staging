import test from 'node:test';import assert from 'node:assert/strict';
import {encode,decode,anchor,hash}from '../design/s3-d1/codec.mjs';
const sample=()=>({game:{labConnection:{town:{before:0,events:[{id:'e1',type:'arrival',sourceId:null,text:'町😀\ud800',zero:0,flag:false,empty:'',nil:null,list:[],obj:{},decimal:0.12345678901234568},{type:'notice',id:'e2',sourceId:'e1'}],middle:false,attempts:[{sourceId:'e1',success:false}],arrivals:[{id:'e1',type:'arrival',sourceId:null,text:'町😀\ud800',zero:0,flag:false,empty:'',nil:null,list:[],obj:{},decimal:0.12345678901234568}],after:[]}}},recall:{}});
test('independent original JSON exact including container/property order and JSON boundary values',()=>{let x=sample();assert.equal(JSON.stringify(decode(encode(x),anchor(x))),JSON.stringify(x));});
test('independent anchors mandatory',()=>assert.throws(()=>decode(encode(sample()))));
const faults={
 'event missing':c=>c.events.rows.pop(), 'attempt missing':c=>c.attempts.rows.pop(),
 'ID duplicate':c=>{const row=c.events.rows[1],schema=c.events.schemas[row[1]];row[2+schema.indexOf('id')]='e1'},
 'ordinal changed':c=>c.events.rows[0][0]=999999999,
 'unknown schema':c=>c.events.rows[0][1]=999,
 'columns missing':c=>c.events.rows[0].pop(),
 'value changed':c=>c.active.game.labConnection.town.before=1,
 'invalid source':c=>{const r=c.events.rows[1];r[2+c.events.schemas[r[1]].indexOf('sourceId')]='missing'},
 'arrival changed':c=>c.arrivals=[1],
 'mixed generation':c=>c.active.recall={generation:999},
 'incomplete candidate':c=>delete c.events,
 'version mismatch':c=>c.version=2,
 'codec schema mismatch':c=>c.events.schemas[0].reverse(),
 'town property order':c=>c.townKeys.reverse(),
};
for(const [name,mutate]of Object.entries(faults))test(`reject ${name}, even after self-hash recomputation; original unchanged`,()=>{const x=sample(),bytes=JSON.stringify(x),c=encode(x),a=anchor(x);mutate(c);const {integrity,...body}=c;c.integrity=hash(body);assert.throws(()=>decode(c,a));assert.equal(JSON.stringify(x),bytes)});
