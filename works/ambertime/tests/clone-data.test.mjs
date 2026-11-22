import test from 'node:test';import assert from 'node:assert/strict';import {cloneReplayState,withPrivateReplay,reactionPrefix,rememberReactionPrefix} from '../clone-data.mjs?v=restore-perf-v04&perf=v06';
test('all clone graphs remain native-equivalent, detached and alias-preserving even in private replay',()=>{const t={events:[{x:1}],arrivals:[],attempts:[]};t.arrivals.push(t.events[0]);const r={labConnection:{town:t,cards:{a:1}},core:{cash:20}};withPrivateReplay(()=>{rememberReactionPrefix(t.events,1);const c=cloneReplayState(r);assert.deepEqual(c,structuredClone(r));assert.notEqual(c.labConnection.town,t);assert.equal(c.labConnection.town.events[0],c.labConnection.town.arrivals[0]);assert.equal(reactionPrefix(c.labConnection.town.events),1);c.labConnection.town.events[0].x=2;assert.equal(t.events[0].x,1);});assert.equal(reactionPrefix(t.events),0);});
test('outside replay no prefix is read or transferred, including caller changes',()=>{const t={events:[{x:1}],arrivals:[],attempts:[]},r={labConnection:{town:t}};withPrivateReplay(()=>rememberReactionPrefix(t.events,1));t.events[0].x=.1234567891234;const c=cloneReplayState(r);assert.equal(reactionPrefix(t.events),0);withPrivateReplay(()=>assert.equal(reactionPrefix(c.labConnection.town.events),0));});
test('exceptions reset scope and nested scopes restore previous scope',()=>{const a=[1];assert.throws(()=>withPrivateReplay(()=>{rememberReactionPrefix(a,1);withPrivateReplay(()=>assert.equal(reactionPrefix(a),1));assert.equal(reactionPrefix(a),1);throw Error('failure');}));assert.equal(reactionPrefix(a),0);});

import * as D from '../partner-orders.mjs';
import {fill,release,advance} from './brands-helpers.mjs';
test('monthly automatic bottling rollback retains exact prior state at low-funds boundary',()=>{
 const modelSource=fs.readFileSync(new URL('../partner-orders.mjs',import.meta.url),'utf8');
 const helperSpec=modelSource.match(/from ['"]([^'"]*clone-data\.mjs[^'"]*)['"]/)?.[1];
 assert.equal(new URL(helperSpec,new URL('../partner-orders.mjs',import.meta.url)).href,new URL('../clone-data.mjs?v=restore-perf-v04&perf=v06',import.meta.url).href,'rollback test and live model must share one helper instance');
 // Deliberately synthesized branch boundary, not a lawful saved career fixture.
 let s=fill(D.newDelegatedDistillery(42),{progress:65,type:'refill'});if(!s.labConnection)s=D.enableStage4(s);s.staffProgression.bottling.hired=true;s=D.reserveBottling(s,s.core.casks[0].id,{mode:'age',age:1,count:10});
 for(const cash of [35,40,50,100,150,160,170]){const a=structuredClone(s),b=structuredClone(s);a.core.cash=b.core.cash=cash;const before=JSON.stringify(b);assert.deepEqual(withPrivateReplay(()=>{assert.equal(isPrivateReplay(),true,'live model helper must be in private replay');return D.tickDistillery(b);}),D.tickDistillery(a));assert.equal(JSON.stringify(b),before);}
});
test('old log tampering stays rejected and failed validation does not poison good cached replay',()=>{
 const s=advance(D.enableStage4(release(D.newDelegatedDistillery(42))),12),raw=JSON.stringify(s);D.validateDistillery(s);
 for(const key of ['events','arrivals','attempts']){const bad=structuredClone(s);assert(bad.labConnection.town[key].length>0);bad.labConnection.town[key][0].month++;const before=JSON.stringify(bad);assert.throws(()=>D.validateDistillery(bad));assert.equal(JSON.stringify(bad),before);assert.equal(JSON.stringify(D.restoreDistillery(raw)),raw);}
 const restored=D.restoreDistillery(raw);restored.labConnection.town.events[0].month++;assert.equal(JSON.stringify(D.restoreDistillery(raw)),raw);assert.equal(JSON.stringify(s),raw);
});

import fs from 'node:fs';
import vm from 'node:vm';
import {isPrivateReplay} from '../clone-data.mjs?v=restore-perf-v04&perf=v06';
test('public quantization preserves sparse arrays and enumerable extra properties',()=>{
 const source=fs.readFileSync(new URL('../experiments/town-simulation/v01/model.mjs',import.meta.url),'utf8');
 const body=source.split('function quantizeReaction(s){')[1].split('\nexport function advanceExternal')[0];
 const quantize=vm.runInNewContext('(function quantizeReaction(s){'+body+')',{isPrivateReplay,reactionPrefix,rememberReactionPrefix});
 const state={nodes:[],events:[],arrivals:[],memories:[],pending:[],packets:[],attempts:[]};
 for(const key of ['events','arrivals','attempts']){state[key].length=2;state[key][1]={value:.123456789012345};state[key].extra={value:.987654321098765};}
 quantize(state);
 for(const key of ['events','arrivals','attempts']){assert.equal(0 in state[key],false);assert.equal(state[key][1].value,.123456789012);assert.equal(state[key].extra.value,.987654321099);}
});


test('private plain graph clone preserves sparse arrays, aliases, cycles, key order and primitive values',()=>{
 const row={negativeZero:-0,missing:undefined,nan:NaN,positive:Infinity,negative:-Infinity,big:123n};
 const a=new Array(5);a[3]=row;a.extra=row;
 const input={a,row,nullPrototype:Object.assign(Object.create(null),{x:1})};input.self=input;
 Object.defineProperty(input,'__proto__',{value:{polluted:true},enumerable:true});
 Object.defineProperty(input,'hidden',{value:'ignored'});input[Symbol('ignored')]='ignored';
 const actual=withPrivateReplay(()=>cloneReplayState(input)),native=structuredClone(input);
 assert.deepEqual(actual,native);assert.deepEqual(Object.keys(actual),Object.keys(native));
 assert.equal(actual.self,actual);assert.equal(actual.a[3],actual.row);assert.equal(actual.a.extra,actual.row);
 assert.equal(0 in actual.a,false);assert.equal(Object.getPrototypeOf(actual),Object.prototype);
 assert.equal(Object.getPrototypeOf(actual.nullPrototype),Object.prototype);
 actual.row.negativeZero=4;actual.__proto__.polluted=false;
 assert(Object.is(input.row.negativeZero,-0));assert.equal(input.__proto__.polluted,true);
});
test('private unsupported graphs fall back as a whole and retain cross-type aliases',()=>{
 const row={x:1},input={row,map:new Map([[row,row]]),set:new Set([row]),date:new Date(0),bytes:new Uint8Array([1,2])};
 const actual=withPrivateReplay(()=>cloneReplayState(input));assert.deepEqual(actual,structuredClone(input));
 assert.equal(actual.map.get(actual.row),actual.row);assert(actual.set.has(actual.row));
 actual.row.x=9;actual.bytes[0]=9;assert.equal(row.x,1);assert.equal(input.bytes[0],1);
 assert.throws(()=>withPrivateReplay(()=>cloneReplayState({bad:Symbol('bad')})),{name:'DataCloneError'});
 assert.throws(()=>withPrivateReplay(()=>cloneReplayState({bad:()=>{}})),{name:'DataCloneError'});
});
test('native fallback invokes accessor once and preserves getter-driven property changes',()=>{
 let calls=0;const input={first:{x:1},get value(){calls++;this.later=7;return this.first;},later:2};
 const actual=withPrivateReplay(()=>cloneReplayState(input));assert.equal(calls,1);assert.equal(actual.value,actual.first);assert.equal(actual.later,7);
 let nestedCalls=0;const nested={a:{get value(){nestedCalls++;return 3;}},date:new Date(0)};
 assert.equal(withPrivateReplay(()=>cloneReplayState(nested)).a.value,3);assert.equal(nestedCalls,1);
});

test('replay metadata transfer does not invoke accessors after native fallback',()=>{
 let calls=0;const input={get labConnection(){calls++;return {town:{events:[],arrivals:[],attempts:[]}};}};
 withPrivateReplay(()=>cloneReplayState(input));assert.equal(calls,1);
});
