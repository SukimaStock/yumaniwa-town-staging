import test from 'node:test';
import assert from 'node:assert/strict';
import {wrapRaw} from './memory-run.mjs';
test('reuse wrapper preserves exact canonical output for valid serialized saves and UI values',()=>{
 for(const game of [{version:6,name:'引用"\\\n日本語🌱',nested:[null,{a:1}]},{a:[],z:0}])for(const userPaused of [false,true])for(const elapsed of [0,2.345]){const raw=JSON.stringify(game),actual=wrapRaw(raw,userPaused,elapsed);assert.equal(actual,JSON.stringify({version:2,game:JSON.parse(raw),userPaused,elapsed}));assert.deepEqual(JSON.parse(actual),{version:2,game,userPaused,elapsed});}
});
