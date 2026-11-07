// Regression reproducer. Original D1 exited 1; D1-R must reject and exit 0.
import assert from 'node:assert/strict';
import {encode,decode,anchor,hash}from './codec.mjs';
const input={game:{labConnection:{town:{events:[{id:'e1',type:'arrival',sourceId:null}],attempts:[],arrivals:[{id:'e1',type:'arrival',sourceId:null}]}}}};
const candidate=encode(input),expected=anchor(input);
candidate.active.game.labConnection.town.events=[{id:'fake',sourceId:'missing'}];
const {integrity,...body}=candidate;candidate.integrity=hash(body);
// Historical D1 behavior: no throw, silently overwritten. D1-R checks this before hydrate.
assert.throws(()=>decode(candidate,expected),undefined,'MUST reject a candidate containing conflicting invalid active history');
