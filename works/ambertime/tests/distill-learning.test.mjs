import test from 'node:test';
import assert from 'node:assert/strict';
import {DistillLearning} from '../distill-learning.mjs';
const KEY='test.learning';
function memory(initial=null){let raw=initial;const calls=[];return {getItem(key){calls.push(['get',key]);return raw;},setItem(key,value){calls.push(['set',key]);raw=value;},get raw(){return raw;},calls};}
const create=storage=>new DistillLearning({storage,key:KEY});
test('manual start alone never advances guidance; same batch completion advances only once',()=>{
 const storage=memory(),learning=create(storage);assert.equal(learning.completedRuns,0);assert.equal(learning.start('seed:1/batch:2/month:0/op:4'),true);assert.equal(learning.completedRuns,0);
 assert.equal(learning.start('seed:1/batch:2/month:0/op:4'),false);
 assert.equal(learning.complete('seed:1/batch:2/month:0/op:4'),true);assert.equal(learning.completedRuns,1);
 assert.equal(learning.complete('seed:1/batch:2/month:0/op:4'),false);assert.equal(learning.start('seed:1/batch:2/month:0/op:4'),false);assert.equal(learning.completedRuns,1);
 const restored=create(storage);assert.equal(restored.start('seed:1/batch:2/month:0/op:4'),false);assert.equal(restored.completedRuns,1);
});
test('pending successful manual start survives reload, foreign completion does not consume it',()=>{
 const storage=memory();create(storage).start('manual-1');const restored=create(storage);
 assert.equal(restored.complete('automatic-1'),false);assert.equal(restored.completedRuns,0);assert.equal(restored.complete('manual-1'),true);assert.equal(create(storage).completedRuns,1);
});
test('three distinct finished batches graduate; further starts cannot change the stored count',()=>{
 const storage=memory(),learning=create(storage);
 for(let n=1;n<=3;n++){assert.equal(learning.start('batch-'+n),true);assert.equal(learning.completedRuns,n-1);assert.equal(learning.complete('batch-'+n),true);assert.equal(learning.completedRuns,n);}
 const raw=storage.raw;assert.equal(learning.start('batch-4'),false);assert.equal(learning.complete('batch-4'),false);assert.equal(storage.raw,raw);assert.equal(create(storage).completedRuns,3);
});
test('cancellation clears only pending operation and leaves completed experience intact',()=>{
 const storage=memory(),learning=create(storage);learning.start('done');learning.complete('done');learning.start('cancelled');assert.equal(learning.resetPending(),true);assert.equal(learning.complete('cancelled'),false);assert.equal(learning.completedRuns,1);assert.equal(learning.resetPending(),false);
});
test('retry replaces a stale pending batch without counting it',()=>{
 const learning=create(memory());learning.start('expired');learning.start('retry');assert.equal(learning.complete('expired'),false);assert.equal(learning.complete('retry'),true);assert.equal(learning.completedRuns,1);
});
test('preview explicitly disabled never reads, writes or advances formal preference',()=>{
 const storage=memory(JSON.stringify({version:1,completedRuns:2,completedKeys:['a','b'],pending:'c'})),learning=new DistillLearning({storage,key:KEY,enabled:false});
 assert.equal(learning.completedRuns,0);assert.equal(learning.start('c'),false);assert.equal(learning.complete('c'),false);assert.equal(learning.resetPending(),false);assert.deepEqual(storage.calls,[]);
});
test('storage denial cannot throw or prevent in-session deduplication',()=>{
 const learning=create({getItem(){throw Error('restricted');},setItem(){throw Error('quota');}});assert.equal(learning.start('manual'),true);assert.equal(learning.complete('manual'),true);assert.equal(learning.start('manual'),false);assert.equal(learning.completedRuns,1);
 const ephemeral=new DistillLearning({storage:null});assert.equal(ephemeral.start('one'),true);assert.equal(ephemeral.complete('one'),true);assert.equal(ephemeral.completedRuns,1);
});
test('malformed preferences are ignored without changing or deleting existing data',()=>{
 const invalid=[null,'not json','null','[]','{}',JSON.stringify({version:2,completedRuns:0,completedKeys:[],pending:null}),JSON.stringify({version:1,completedRuns:4,completedKeys:[],pending:null}),JSON.stringify({version:1,completedRuns:1,completedKeys:[],pending:null}),JSON.stringify({version:1,completedRuns:2,completedKeys:['same','same'],pending:null}),JSON.stringify({version:1,completedRuns:1,completedKeys:['same'],pending:'same'}),JSON.stringify({version:1,completedRuns:0,completedKeys:[],pending:'x'.repeat(513)})];
 for(const raw of invalid){const storage=memory(raw),learning=create(storage);assert.equal(learning.completedRuns,0);assert.equal(storage.raw,raw);assert.equal(storage.calls.filter(c=>c[0]==='set').length,0);}
});
test('invalid operation keys never alter pending or completed state',()=>{
 const storage=memory(),learning=create(storage);for(const key of [null,undefined,0,{},'', 'x'.repeat(513)]){assert.equal(learning.start(key),false);assert.equal(learning.complete(key),false);}assert.equal(storage.raw,null);assert.equal(learning.completedRuns,0);
});
test('learning record has no game data or generation dependency',()=>{
 const storage=memory(),learning=create(storage);learning.start('[42,2,0,1]');learning.complete('[42,2,0,1]');assert.deepEqual(Object.keys(JSON.parse(storage.raw)).sort(),['completedKeys','completedRuns','pending','version']);const nextGeneration=create(storage);assert.equal(nextGeneration.completedRuns,1);nextGeneration.start('[42,7,60,100]');nextGeneration.complete('[42,7,60,100]');assert.equal(nextGeneration.completedRuns,2);
});
