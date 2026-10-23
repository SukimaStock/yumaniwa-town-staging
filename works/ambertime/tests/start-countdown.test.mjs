import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {StartCountdown} from '../start-countdown.mjs';
import {collectionGeometry} from '../canvas-layout.mjs';
function clock(){
 let now=0,id=0;const jobs=new Map();
 return {jobs,set(fn,ms){const n=++id;jobs.set(n,{fn,due:now+ms});return n;},clear:n=>jobs.delete(n),advance(ms){const end=now+ms;while(true){const next=[...jobs].filter(([,v])=>v.due<=end).sort((a,b)=>a[1].due-b[1].due)[0];if(!next)break;now=next[1].due;jobs.delete(next[0]);next[1].fn();}now=end;}};
}
test('3, 2 and 1 each hold for one second before committing the start once',()=>{
 const c=clock(),seen=[];let commits=0;
 const countdown=new StartCountdown({onChange:value=>seen.push(value),setTimer:c.set,clearTimer:c.clear});
 assert.equal(countdown.start(()=>commits++),true);assert.deepEqual(seen,[3]);assert.equal(countdown.active,true);
 for(let i=0;i<10;i++)assert.equal(countdown.start(()=>assert.fail('duplicate start')),false);
 c.advance(999);assert.equal(countdown.value,3);assert.equal(commits,0);c.advance(1);assert.equal(countdown.value,2);
 c.advance(1000);assert.equal(countdown.value,1);assert.equal(commits,0);c.advance(999);assert.equal(commits,0);
 c.advance(1);assert.deepEqual(seen,[3,2,1,null]);assert.equal(countdown.active,false);assert.equal(commits,1);assert.equal(c.jobs.size,0);
 c.advance(10000);assert.equal(commits,1);assert.equal(countdown.start(()=>commits++),true);c.advance(3000);assert.equal(commits,2);
});
test('cancellation on interruption removes pending work and rejects stale callbacks',()=>{
 const c=clock(),seen=[];let commits=0;
 const countdown=new StartCountdown({onChange:v=>seen.push(v),setTimer:c.set,clearTimer:c.clear});
 countdown.start(()=>commits++);const stale=[...c.jobs.values()][0].fn;
 assert.equal(countdown.cancel(),true);assert.equal(countdown.cancel(),false);assert.equal(c.jobs.size,0);
 countdown.start(()=>commits++);stale();assert.equal(countdown.value,3);assert.equal(c.jobs.size,1);
 c.advance(3000);assert.equal(commits,1);assert.deepEqual(seen,[3,null,3,2,1,null]);
});
test('hidden or otherwise interrupted preparation never reaches the model callback',()=>{
 for(const at of [0,1000,2000]){
  const c=clock();let visible=true,commits=0;const countdown=new StartCountdown({canRun:()=>visible,setTimer:c.set,clearTimer:c.clear});
  countdown.start(()=>commits++);c.advance(at);visible=false;c.advance(10000);
  assert.equal(commits,0);assert.equal(countdown.value,null);assert.equal(c.jobs.size,0);assert.equal(countdown.start(()=>commits++),false);
 }
});
test('a reentrant cancellation at a digit or completion cannot leave a timer or commit',()=>{
 for(const cancelAt of [3,2,1,null]){
  const c=clock();let commits=0,countdown;countdown=new StartCountdown({onChange:v=>{if(v===cancelAt)countdown.cancel();},setTimer:c.set,clearTimer:c.clear});
  countdown.start(()=>commits++);c.advance(10000);assert.equal(c.jobs.size,0);assert.equal(commits,0);
 }
});
test('Canvas paints each valid countdown digit in the existing text path without arming animation',()=>{
 const calls=[],document={hidden:false,getElementById:id=>id==='action-dialog'?{open:false}:null};
 const sandbox={document,clearTimeout(){},cancelAnimationFrame(){},setTimeout(){assert.fail('countdown scene armed recurring animation');},performance:{now:()=>100},BODY_SIZE:16,collectionGeometry,uiText:x=>x,drawSymbol(){}};
 vm.runInNewContext(fs.readFileSync(new URL('../canvas-scene.mjs',import.meta.url),'utf8').replace(/^import[^\n]*\n/gm,'').replace('export class CanvasScene','globalThis.CanvasScene=class CanvasScene'),sandbox);
 const scene=Object.create(sandbox.CanvasScene.prototype),ctx=new Proxy({},{get:()=>()=>{},set:()=>true});
 Object.assign(scene,{fontSettled:true,view:{room:'distill',phase:'ready',casks:[],products:[],calendar:'',generation:'',cash:''},root:{dataset:{}},ctx,world:{},viewport:{dpr:1,width:360,height:640,scale:1,offsetX:0,offsetY:0},layout:{equipment:{y:270}},reducedMotion:{matches:false},motion:{sample:()=>({nextMs:null})},activeControls:[],idleSince:0,controls(){},drawWorld(){},window(){},pixelRect(){},text(...args){calls.push(args);},measure:()=>0,lines:()=>0,textMetrics:()=>({logical:16})});
 for(const number of [3,2,1]){scene.view.countdown=number;scene.draw();assert.equal(scene.root.dataset.countdown,String(number));assert.ok(calls.some(x=>x[0]===String(number)&&x[1]===180&&x[2]===228&&x[3]===48));}
 scene.view.countdown=null;scene.draw();assert.equal(scene.root.dataset.countdown,undefined);
});

test('default timers call the native host with its global receiver for scheduling and cancellation',()=>{
 const c=clock(),sandbox={__nativeWindow:true};
 sandbox.setTimeout=function(fn,ms){assert.equal(this?.__nativeWindow,true,'native setTimeout receiver');return c.set(fn,ms);};
 sandbox.clearTimeout=function(id){assert.equal(this?.__nativeWindow,true,'native clearTimeout receiver');c.clear(id);};
 vm.runInNewContext(fs.readFileSync(new URL('../start-countdown.mjs',import.meta.url),'utf8').replace('export class StartCountdown','globalThis.StartCountdown=class StartCountdown'),sandbox);
 const seen=[];let starts=0;const countdown=new sandbox.StartCountdown({onChange:v=>seen.push(v)});
 countdown.start(()=>starts++);c.advance(3000);assert.deepEqual(seen,[3,2,1,null]);assert.equal(starts,1);assert.equal(c.jobs.size,0);
 countdown.start(()=>starts++);assert.equal(c.jobs.size,1);countdown.cancel();assert.equal(c.jobs.size,0);c.advance(5000);assert.equal(starts,1);
});
