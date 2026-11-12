import test from 'node:test';import assert from 'node:assert/strict';import {cloneReplayState,withPrivateReplay,reactionPrefix,rememberReactionPrefix} from '../clone-data.mjs?v=restore-perf-v04';
test('all clone graphs remain native, detached and alias-preserving even in private replay',()=>{const t={events:[{x:1}],arrivals:[],attempts:[]};t.arrivals.push(t.events[0]);const r={labConnection:{town:t,cards:{a:1}},core:{cash:20}};withPrivateReplay(()=>{rememberReactionPrefix(t.events,1);const c=cloneReplayState(r);assert.deepEqual(c,structuredClone(r));assert.notEqual(c.labConnection.town,t);assert.equal(c.labConnection.town.events[0],c.labConnection.town.arrivals[0]);assert.equal(reactionPrefix(c.labConnection.town.events),1);c.labConnection.town.events[0].x=2;assert.equal(t.events[0].x,1);});assert.equal(reactionPrefix(t.events),0);});
test('outside replay no prefix is read or transferred, including caller changes',()=>{const t={events:[{x:1}],arrivals:[],attempts:[]},r={labConnection:{town:t}};withPrivateReplay(()=>rememberReactionPrefix(t.events,1));t.events[0].x=.1234567891234;const c=cloneReplayState(r);assert.equal(reactionPrefix(t.events),0);withPrivateReplay(()=>assert.equal(reactionPrefix(c.labConnection.town.events),0));});
test('exceptions reset scope and nested scopes restore previous scope',()=>{const a=[1];assert.throws(()=>withPrivateReplay(()=>{rememberReactionPrefix(a,1);withPrivateReplay(()=>assert.equal(reactionPrefix(a),1));assert.equal(reactionPrefix(a),1);throw Error('failure');}));assert.equal(reactionPrefix(a),0);});

import * as D from '../partner-orders.mjs';
import {fill,release,advance} from './brands-helpers.mjs';
test('monthly automatic bottling rollback retains exact prior state at low-funds boundary',()=>{
 // Deliberately synthesized branch boundary, not a lawful saved career fixture.
 let s=fill(D.newDelegatedDistillery(42),{progress:65,type:'refill'});if(!s.labConnection)s=D.enableStage4(s);s.staffProgression.bottling.hired=true;s=D.reserveBottling(s,s.core.casks[0].id,{mode:'age',age:1,count:10});
 for(const cash of [35,40,50,100,150,160,170]){const a=structuredClone(s),b=structuredClone(s);a.core.cash=b.core.cash=cash;const before=JSON.stringify(b);assert.deepEqual(withPrivateReplay(()=>D.tickDistillery(b)),D.tickDistillery(a));assert.equal(JSON.stringify(b),before);}
});
test('old log tampering stays rejected and failed validation does not poison good cached replay',()=>{
 const s=advance(D.enableStage4(release(D.newDelegatedDistillery(42))),12),raw=JSON.stringify(s);D.validateDistillery(s);
 for(const key of ['events','arrivals','attempts']){const bad=structuredClone(s);assert(bad.labConnection.town[key].length>0);bad.labConnection.town[key][0].month++;const before=JSON.stringify(bad);assert.throws(()=>D.validateDistillery(bad));assert.equal(JSON.stringify(bad),before);assert.equal(JSON.stringify(D.restoreDistillery(raw)),raw);}
 const restored=D.restoreDistillery(raw);restored.labConnection.town.events[0].month++;assert.equal(JSON.stringify(D.restoreDistillery(raw)),raw);assert.equal(JSON.stringify(s),raw);
});

import fs from 'node:fs';
import vm from 'node:vm';
import {isPrivateReplay} from '../clone-data.mjs?v=restore-perf-v04';
test('public quantization preserves sparse arrays and enumerable extra properties',()=>{
 const source=fs.readFileSync(new URL('../experiments/town-simulation/v01/model.mjs',import.meta.url),'utf8');
 const body=source.split('function quantizeReaction(s){')[1].split('\nexport function advanceExternal')[0];
 const quantize=vm.runInNewContext('(function quantizeReaction(s){'+body+')',{isPrivateReplay,reactionPrefix,rememberReactionPrefix});
 const state={nodes:[],events:[],arrivals:[],memories:[],pending:[],packets:[],attempts:[]};
 for(const key of ['events','arrivals','attempts']){state[key].length=2;state[key][1]={value:.123456789012345};state[key].extra={value:.987654321098765};}
 quantize(state);
 for(const key of ['events','arrivals','attempts']){assert.equal(0 in state[key],false);assert.equal(state[key][1].value,.123456789012);assert.equal(state[key].extra.value,.987654321099);}
});
