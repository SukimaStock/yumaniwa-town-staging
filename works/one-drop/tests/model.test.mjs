import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,step,dropShape} from '../model.mjs';
const run=(s,n=60)=>{for(let i=0;i<n;i++)step(s,1/60);};
test('partial squeeze retracts without releasing a drop',()=>{const s=createState();s.target=.8;run(s);assert.ok(s.volume>.79);s.target=.2;run(s);assert.ok(s.volume<.21);assert.equal(s.drops,0);});
test('full squeeze separates one drop and cannot repeat while held',()=>{const s=createState();s.target=1;run(s,300);assert.equal(s.drops,1);assert.equal(s.fall,null);assert.ok(s.volume<.02);});
test('release refills and ten fresh squeezes release exactly ten drops',()=>{const s=createState();for(let i=0;i<10;i++){s.target=1;run(s);assert.equal(s.drops,i+1);s.target=0;run(s);}assert.equal(s.spent,false);});
test('neck can be withdrawn before pinch-off',()=>{const s=createState();s.target=1;while(s.neck===0)step(s,1/60);s.target=0;run(s);assert.equal(s.drops,0);assert.equal(s.neck,0);});
test('background pause is bounded and geometry remains finite at boundaries',()=>{const s=createState();s.target=1;step(s,500);assert.equal(s.drops,0);for(const v of [0,.2,.89,1])for(const n of [0,.5,1])assert.ok(!/NaN|Infinity/.test(dropShape(v,n).path));});
