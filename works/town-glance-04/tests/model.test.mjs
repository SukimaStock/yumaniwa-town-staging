import test from 'node:test';
import assert from 'node:assert/strict';
import {ORDERS,createTrials,relativeDirection,evaluateTrial,position} from '../model.mjs';
test('all headings: body-relative relation agrees with independent world vectors',()=>{
  const vectors=[[0,-1],[1,0],[0,1],[-1,0]];
  for(let heading=0;heading<4;heading++)for(let station=0;station<4;station++){
    const [fx,fy]=vectors[heading],[rx,ry]=vectors[(heading+1)%4],[x,y]=vectors[station];
    const forward=x*fx+y*fy,right=x*rx+y*ry;
    const expected=forward===1?0:right===1?1:forward===-1?2:3;
    assert.equal(relativeDirection(station,heading),expected);
  }
  assert.equal(relativeDirection(0,1),3); // initially in front, turn right -> left
  assert.equal(relativeDirection(1,3),2); // initially right, turn left -> behind
});
test('six matched trials, counterbalanced order, both turns and start orientations',()=>{
  for(const order of ORDERS)for(const mirror of [false,true]){
    const trials=createTrials(order,mirror);assert.equal(trials.length,6);
    assert.equal(trials.slice(0,3).map(t=>t.condition).join(''),order);
    assert.equal(trials.slice(3).map(t=>t.condition).join(''),[...order].reverse().join(''));
    assert.deepEqual([...new Set(trials.map(t=>t.turn))].sort(),[-1,1]);
    assert.equal(new Set(trials.map(t=>t.initialHeading)).size,2);
    for(const scenario of [0,1]){
      const group=trials.filter(t=>t.scenario===scenario);
      assert.equal(new Set(group.map(t=>JSON.stringify({...t,condition:null}))).size,1,'only cue condition differs');
      assert.notEqual(group[0].stationWorld,group[0].towerWorld);
      const original=position(group[0].stationWorld);assert.deepEqual(original,position(group[0].stationWorld));
    }
  }
  assert.throws(()=>createTrials('AAA'));
});
test('unknown, mismatch and failed baseline remain distinct, no correction of participant data',()=>{
  const t=createTrials()[0];
  assert.equal(evaluateTrial(t,0,'unknown').outcome,'unknown');
  assert.equal(evaluateTrial(t,0,0).outcome,'direction-mismatch');
  assert.equal(evaluateTrial(t,'unknown',3).baselineUnderstood,false);
  assert.equal(evaluateTrial(t,0,3).outcome,'direction-match');
  assert.equal(t.stationWorld,0);assert.equal(t.initialHeading,0);assert.equal(t.finalHeading,1);
});
