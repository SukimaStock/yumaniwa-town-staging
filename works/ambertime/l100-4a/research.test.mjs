import test from 'node:test';import assert from 'node:assert/strict';
import {encode,hydrate,lookup,hash,packRecords,unpackRecords} from './research.mjs';
const fixture=()=>({version:20,labConnection:{town:{seed:7,arrivals:[{id:'e2',type:'arrival',month:1,reason:'昔の瓶'}],events:[{id:'e1',type:'release',month:0},{id:'e2',type:'arrival',month:1,reason:'昔の瓶'}],attempts:Array.from({length:600},(_,i)=>({month:i,roll:i/601,skip:null})),shipments:[],pending:[]}},other:{rng:13}});
const cp=x=>JSON.parse(JSON.stringify(x));
for(const method of ['A','B','C','D'])test(`${method} exact JSON and no source mutation`,()=>{const g=fixture(),before=JSON.stringify(g),e=encode(g,method);assert.equal(JSON.stringify(hydrate(e)),before);assert.equal(JSON.stringify(g),before);});
test('C keeps different key orders, missing fields, null, unicode and nested data',()=>{const a=[{x:null,y:'海',z:{a:[1]}},{y:'海',x:0},{x:1}];assert.equal(JSON.stringify(unpackRecords(packRecords(a))),JSON.stringify(a));});
test('B rejects inconsistent redundant arrivals',()=>{const g=fixture();g.labConnection.town.arrivals=[];assert.throws(()=>encode(g,'B'),/mismatch/);});
test('D lazy lookup accesses one chunk and does not certify whole snapshot',()=>{const e=encode(fixture(),'D');const m=e.payload.archives.attempts;delete e.blobs[m.chunks[2].hash];assert.deepEqual(lookup(e,'attempts',0),fixture().labConnection.town.attempts[0]);assert.throws(()=>hydrate(e),/missing archive/);});
for(const fault of ['missing','corrupt','reorder','count','source','schema'])test(`D rejects ${fault} without changing original`,()=>{const original=encode(fixture(),'D'),e=cp(original),m=e.payload.archives.attempts,c=m.chunks[0];if(fault==='missing')delete e.blobs[c.hash];if(fault==='corrupt')e.blobs[c.hash]+=' ';if(fault==='reorder'){m.chunks.reverse();e.integrity=hash(e.payload);}if(fault==='count'){m.count++;e.integrity=hash(e.payload);}if(fault==='source'){e.payload.sourceHash='0'.repeat(64);e.integrity=hash(e.payload);}if(fault==='schema'){const b=JSON.parse(e.blobs[c.hash]);b.rows[0][0]=999;c.hash=hash(JSON.stringify(b));e.blobs[c.hash]=JSON.stringify(b);e.integrity=hash(e.payload);}assert.throws(()=>hydrate(e));assert.deepEqual(hydrate(original),fixture());});
test('manifest alteration without new integrity rejects',()=>{const e=encode(fixture(),'D');e.payload.game.other.rng++;assert.throws(()=>hydrate(e),/manifest integrity/);});
test('formal cap remains active for research input',()=>{const g=fixture();g.padding='x'.repeat(6016384);assert.throws(()=>encode(g,'B'),/大きすぎ/);});

import {create,step} from '../experiments/town-simulation/v01/model.mjs';
test('separate memory-mode fixture preserves a decades-old reappearance across all representations',()=>{
 const t=create({seed:20261021,mode:'memory',policy:'mixed',product:'standard'});let checkpoint=null,control=null;
 while(t.month<1000){
  const due=t.memories.some(m=>!m.retired&&m.due===t.month+1&&m.due-m.createdMonth>=240);
  if(due){const before=cp(t);const offset=t.events.length;step(t);if(t.events.slice(offset).some(e=>e.type==='resurface'&&e.age>=240)){checkpoint=before;control=cp(t);break;}}
  else step(t);
 }
 assert(checkpoint,'fixed-seed fixture must reach decades-old resurface');
 for(const method of ['A','B','C','D']){const game={version:20,labConnection:{town:checkpoint}},e=encode(game,method),g=hydrate(e);step(g.labConnection.town);assert.equal(JSON.stringify(g.labConnection.town),JSON.stringify(control),method);}
 console.log(JSON.stringify({fixture:'separate memory-mode, NOT formal responses mode',month:control.month,resurfaced:control.events.filter(e=>e.type==='resurface'&&e.age>=240).at(-1)}));
});
