import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SpecimenSession} from '../engine/session.js';
import {createDebugPanels} from '../debug.js';
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.value='';}
 append(...children){this.children.push(...children);if(this.tag==='select'&&!this.value)this.value=children[0]?.value??'';}
 replaceChildren(){this.children=[];}
 setAttribute(){}
 addEventListener(type,callback){this.listeners[type]=callback;}
}
const outputs=node=>[...(node.tag==='output'?[node]:[]),...node.children.flatMap(outputs)];
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
function fixture(){const d=JSON.parse(read('../objects/door.json'));d.behaviors.motion={version:1,tracks:[{part:'lintel',type:'spin',axis:[0,1,0],pivot:[0,0,0],speed:.2,initialAngle:0}]};return d;}
test('real combined session keeps Motion and Manipulation outputs current through step, pause, reset and recreation',()=>{
 const old=globalThis.document;globalThis.document={createElement:tag=>new Element(tag)};
 try{
  const session=new SpecimenSession().select(fixture()),host=new Element('host'),input={pointer:null,cancel(){}};
  const debug=createDebugPanels(session,input,host,()=>{}),out=outputs(host);
  assert.equal(host.children[0].className,'debug-stack');assert.equal(out.length,2);
  assert.match(out[0].textContent,/MOTION PLAY \/ 0.00s/);assert.match(out[1].textContent,/value: -0.1500/);
  session.step(.5);const c=session.manipulation.controls[0];session.manipulation.grab(c.part);session.manipulation.moveBy(c.part,-.2,.1);session.manipulation.release();debug.update();
  assert.match(out[0].textContent,/MOTION PLAY \/ 0.05s/);assert.match(out[1].textContent,/value: -0.3500/);
  session.motion.setPlaying(false);session.step(.5);debug.update();assert.match(out[0].textContent,/MOTION PAUSE \/ 0.05s/);
  session.resetPose();debug.update();assert.match(out[0].textContent,/0.00s/);assert.match(out[1].textContent,/value: -0.1500/);
  host.replaceChildren();session.clear();session.select(fixture());createDebugPanels(session,input,host,()=>{});assert.equal(outputs(host).length,2);
 }finally{globalThis.document=old;}
});
test('normal app owns one debug updater only inside debug mode; reset and motion toggle update it',()=>{
 const source=read('../app.js');assert.match(source,/if\(debugMode\)\{\s+debug=createDebugPanels\(/);assert.match(source,/session\.resetPose\(\);debug\?\.update\(\)/);assert.match(source,/motionUI\(\);debug\?\.update\(\)/);assert.match(source,/debug=null;debugHost\.replaceChildren\(\)/);
});
