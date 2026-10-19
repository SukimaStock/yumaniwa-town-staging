import test from 'node:test';
import assert from 'node:assert/strict';
import {moved,canScroll} from '../scene-input.mjs';
test('drag cancellation uses a physical movement threshold, including diagonal drags',()=>{
 assert(!moved({x:1,y:1},{x:7,y:9}));
 assert(moved({x:1,y:1},{x:8,y:9}));
 assert(moved({x:1,y:1},{x:-10,y:1}));
});
test('a nested scroll consumes only directions with remaining content',()=>{
 assert(canScroll(0,1000,300,-10));assert(!canScroll(0,1000,300,10));
 assert(canScroll(699,1000,300,10));assert(!canScroll(700,1000,300,-10));
 assert(!canScroll(0,300,300,-10));assert(!canScroll(40,1000,300,0));
});
