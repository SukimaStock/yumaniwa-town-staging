// Stop-condition reproducer. Exit 1 is expected for the uncorrected D1 prototype.
import assert from 'node:assert/strict';
import {encode,decode,anchor,hash}from './codec.mjs';
const input={game:{labConnection:{town:{events:[{id:'e1',type:'arrival',sourceId:null}],attempts:[],arrivals:[{id:'e1',type:'arrival',sourceId:null}]}}}};
const candidate=encode(input),expected=anchor(input);
candidate.active.game.labConnection.town.events=[{id:'fake',sourceId:'missing'}];
const {integrity,...body}=candidate;candidate.integrity=hash(body);
// Actual: does not throw; the injected invalid history is silently overwritten.
assert.throws(()=>decode(candidate,expected),undefined,'MUST reject a candidate containing conflicting invalid active history');
